import { SegmentResult, Language } from "./types";

export interface Suggestion {
  type: "rentalCar" | "savings" | "speed";
  text: string;
}

/**
 * Generates lightweight, rule-based suggestions from already-fetched segment
 * data. This is intentionally simple for the MVP: it compares the options
 * Claude/Directions already returned rather than calling an external model.
 * The assistant only ever *suggests* — the user makes the final call.
 */
export function generateSuggestions(
  segments: SegmentResult[],
  lang: Language,
  formatMoney: (valueJPY: number) => string
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 1. Rental car suggestion: driving meaningfully faster than transit on a
  // longer segment.
  for (const segment of segments) {
    const driving = segment.options.find((o) => o.mode === "driving");
    const transit = segment.options.find((o) => o.mode === "transit");
    if (driving && transit) {
      const savedMinutes = transit.durationMinutes - driving.durationMinutes;
      if (savedMinutes >= 20 && segment.straightLineDistanceKm >= 15) {
        const hours = Math.round((savedMinutes / 60) * 10) / 10;
        const text =
          lang === "ja"
            ? `${segment.from.name}〜${segment.to.name}はレンタカー利用で約${
                hours >= 1 ? `${hours}時間` : `${savedMinutes}分`
              }短縮できます。`
            : `${segment.from.name} → ${segment.to.name}: a rental car could save about ${
                hours >= 1 ? `${hours}h` : `${savedMinutes} min`
              } compared to transit.`;
        suggestions.push({ type: "rentalCar", text });
      }
    }
  }

  // 2. Savings plan: total savings if the cheapest option is chosen on every
  // segment vs. the average of all options. Flight costs are excluded here
  // since they're an unknown ("check fares") value, not a real JPY figure.
  let totalSavings = 0;
  for (const segment of segments) {
    const costs = segment.options.map((o) => o.costValue).filter(Number.isFinite);
    if (costs.length < 2) continue;
    const cheapest = Math.min(...costs);
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    totalSavings += Math.max(0, avg - cheapest);
  }
  if (totalSavings >= 300) {
    const text =
      lang === "ja"
        ? `各区間で最安の交通手段を選ぶと、合計で約${formatMoney(totalSavings)}節約できます。`
        : `Choosing the cheapest option on every segment could save about ${formatMoney(
            totalSavings
          )} in total.`;
    suggestions.push({ type: "savings", text });
  }

  // 3. Speed plan: total time saved if the fastest option is chosen on every
  // segment vs. the average of all options.
  let totalTimeSaved = 0;
  for (const segment of segments) {
    if (segment.options.length < 2) continue;
    const durations = segment.options.map((o) => o.durationMinutes);
    const fastest = Math.min(...durations);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    totalTimeSaved += Math.max(0, avg - fastest);
  }
  if (totalTimeSaved >= 15) {
    const rounded = Math.round(totalTimeSaved);
    const text =
      lang === "ja"
        ? `各区間で最速の交通手段を選ぶと、合計で約${rounded}分短縮できます。`
        : `Choosing the fastest option on every segment could save about ${rounded} minutes in total.`;
    suggestions.push({ type: "speed", text });
  }

  return suggestions;
}
