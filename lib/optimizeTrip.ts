import { LocationItem, OrderSuggestion } from "./types";
import { optimizeMiddleStops } from "./routeOptimizer";

interface MatrixResponse {
  durationsSeconds: (number | null)[][];
  distancesMeters: (number | null)[][];
  trafficAdjusted: boolean;
}

const FETCH_TIMEOUT_MS = 20000;

async function fetchMatrix(
  locationNames: string[],
  weekendFlags: boolean[]
): Promise<MatrixResponse | { error: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("/api/distance-matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: locationNames, mode: "driving", weekendFlags }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "unknown error" };
    return data as MatrixResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { error: "timeout" };
    }
    return { error: "network error" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function pathDurationSeconds(matrix: (number | null)[][], order: number[]): number | null {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const leg = matrix[order[i]][order[i + 1]];
    if (leg === null) return null;
    total += leg;
  }
  return total;
}

/**
 * Suggests an efficient visiting order for the given locations. The start
 * (first entered) and end (last entered) locations are kept FIXED in
 * place - only the stops in between are reordered. Uses driving time as a
 * general proxy for "efficient" ordering; the actual transport mode for
 * each leg is decided separately in the main search tab.
 *
 * The network call has a hard timeout so the caller never gets stuck in a
 * "calculating..." state forever if Google's API is slow, unreachable, or
 * not yet fully enabled/propagated.
 */
export async function suggestOptimalOrder(
  locations: LocationItem[]
): Promise<OrderSuggestion | { error: string }> {
  if (locations.length < 3) {
    return { error: "need_at_least_three" };
  }

  const names = locations.map((l) => l.name);
  const weekendFlags = locations.map((l) => !!l.weekendFlag);
  const matrixRes = await fetchMatrix(names, weekendFlags);
  if ("error" in matrixRes) return matrixRes;

  const { durationsSeconds, trafficAdjusted } = matrixRes;
  const n = locations.length;
  const currentOrderIndices = Array.from({ length: n }, (_, i) => i);

  const suggestedOrderIndices = optimizeMiddleStops(durationsSeconds, 0, n - 1);

  const currentDurationSeconds = pathDurationSeconds(durationsSeconds, currentOrderIndices);
  const suggestedDurationSeconds = pathDurationSeconds(durationsSeconds, suggestedOrderIndices);

  if (suggestedDurationSeconds === null) {
    return { error: "no_route_data" };
  }

  return {
    suggestedLocations: suggestedOrderIndices.map((i) => locations[i]),
    currentDurationSeconds,
    suggestedDurationSeconds,
    trafficAdjusted,
  };
}
