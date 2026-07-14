import { Language } from "./types";

export function formatDurationMinutes(minutes: number, lang: Language): string {
  const rounded = Math.max(1, Math.round(minutes));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;

  if (lang === "ja") {
    if (h > 0) return m > 0 ? `${h}時間${m}分` : `${h}時間`;
    return `${m}分`;
  }

  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m} min`;
}
