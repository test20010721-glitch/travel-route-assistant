import { TransportMode } from "./types";

/**
 * Decides which transport modes are worth showing for a given segment.
 * This keeps the results list short and relevant instead of showing every
 * possible mode for every segment.
 *
 * Rules (MVP heuristic, tune as needed):
 * - Walkable in ~15 min or less  -> walking only
 * - Walkable in ~16-35 min       -> walking, bicycling, transit
 * - Not walkable, short distance -> transit, driving (toll + no-toll), taxi
 * - Not walkable, longer distance-> transit, driving (toll + no-toll)
 * - Long distance (>=200km)      -> also add flight, alongside transit/driving
 *   (flight is additive, not exclusive - trains and driving are still shown
 *   so the user can compare, since Shinkansen/highway driving are often
 *   competitive with flying within Japan)
 */
export function decideModes(params: {
  walkingMinutes: number | null;
  drivingDistanceKm: number | null;
}): TransportMode[] {
  const { walkingMinutes, drivingDistanceKm } = params;

  if (walkingMinutes !== null && walkingMinutes <= 15) {
    return ["walking"];
  }

  if (walkingMinutes !== null && walkingMinutes <= 35) {
    return ["walking", "bicycling", "transit"];
  }

  const distanceKm = drivingDistanceKm ?? Infinity;
  const modes: TransportMode[] = ["transit", "driving", "driving_free"];

  if (distanceKm <= 15) {
    modes.push("taxi");
  }

  if (distanceKm >= 200) {
    modes.push("flight");
  }

  return modes;
}

export const modeEmoji: Record<TransportMode, string> = {
  walking: "🚶",
  bicycling: "🚲",
  transit: "🚆",
  driving: "🚗",
  driving_free: "🚙",
  taxi: "🚕",
  flight: "✈️",
};
