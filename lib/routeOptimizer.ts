/**
 * Finds an efficient visiting order for the stops IN BETWEEN a fixed start
 * and fixed end location, given a travel-time (or distance) matrix. The
 * start and end (whichever the user entered first/last) never move - only
 * the order of the stops in between is optimized.
 *
 * This is a deterministic optimization algorithm - not a machine-learning
 * model. It tries nearest-neighbor construction from several different
 * starting points, then improves each with both 2-opt (reversing a
 * stretch of the route) and Or-opt (relocating a single stop to a
 * different position) local search moves, keeping whichever full path
 * ends up shortest. The Or-opt move matters in particular for cases like
 * a single weekend-traffic-flagged stop: its cost changed relative to its
 * neighbors, and moving just that one stop to a better position is often
 * the fix 2-opt alone can miss.
 */
export function optimizeMiddleStops(
  matrix: (number | null)[][],
  startIndex: number,
  endIndex: number
): number[] {
  const n = matrix.length;
  const middleIndices = Array.from({ length: n }, (_, i) => i).filter(
    (i) => i !== startIndex && i !== endIndex
  );

  if (middleIndices.length === 0) return [startIndex, endIndex];
  if (middleIndices.length === 1) return [startIndex, middleIndices[0], endIndex];

  const cost = (a: number, b: number): number => matrix[a]?.[b] ?? Number.POSITIVE_INFINITY;

  function pathCost(p: number[]): number {
    let total = 0;
    for (let i = 0; i < p.length - 1; i++) total += cost(p[i], p[i + 1]);
    return total;
  }

  // --- Nearest-neighbor construction, starting from the fixed start point,
  // visiting `firstMiddle` right after it. ---
  function nearestNeighborConstruction(firstMiddle: number): number[] {
    const remaining = new Set(middleIndices);
    remaining.delete(firstMiddle);
    const path = [startIndex, firstMiddle];
    let current = firstMiddle;
    while (remaining.size > 0) {
      let best: number | null = null;
      let bestCost = Infinity;
      for (const idx of remaining) {
        const c = cost(current, idx);
        if (c < bestCost) {
          bestCost = c;
          best = idx;
        }
      }
      if (best === null) best = remaining.values().next().value as number;
      path.push(best);
      remaining.delete(best);
      current = best;
    }
    path.push(endIndex);
    return path;
  }

  // --- 2-opt: reverse a stretch of the middle section (positions 0 and
  // last stay fixed in place). ---
  function twoOptPass(p: number[]): { path: number[]; improved: boolean } {
    let best = p;
    let bestCost = pathCost(best);
    let improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const candidateCost = pathCost(candidate);
        if (candidateCost + 0.01 < bestCost) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
    return { path: best, improved };
  }

  // --- Or-opt: relocate a single middle stop to a different position.
  // This is what catches "this one stop's neighbors changed cost" cases
  // that a segment-reversal (2-opt) move alone can miss. ---
  function orOptPass(p: number[]): { path: number[]; improved: boolean } {
    let best = p;
    let bestCost = pathCost(best);
    let improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      const stop = best[i];
      const withoutStop = [...best.slice(0, i), ...best.slice(i + 1)];
      for (let j = 1; j < withoutStop.length; j++) {
        if (j === i) continue; // same position, no-op
        const candidate = [...withoutStop.slice(0, j), stop, ...withoutStop.slice(j)];
        const candidateCost = pathCost(candidate);
        if (candidateCost + 0.01 < bestCost) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
    return { path: best, improved };
  }

  function localSearch(initial: number[]): number[] {
    let current = initial;
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      const afterTwoOpt = twoOptPass(current);
      current = afterTwoOpt.path;
      if (afterTwoOpt.improved) improved = true;
      const afterOrOpt = orOptPass(current);
      current = afterOrOpt.path;
      if (afterOrOpt.improved) improved = true;
    }
    return current;
  }

  // Try nearest-neighbor construction starting with several different
  // middle stops first (capped for performance on larger trip sizes), run
  // local search on each, and keep whichever full path is shortest.
  const startCandidates =
    middleIndices.length <= 12
      ? middleIndices
      : middleIndices.filter((_, i) => i % Math.ceil(middleIndices.length / 8) === 0);

  let overallBest: number[] | null = null;
  let overallBestCost = Infinity;

  for (const firstMiddle of startCandidates) {
    const nn = nearestNeighborConstruction(firstMiddle);
    const improved = localSearch(nn);
    const c = pathCost(improved);
    if (c < overallBestCost) {
      overallBestCost = c;
      overallBest = improved;
    }
  }

  return overallBest ?? [startIndex, ...middleIndices, endIndex];
}
