/**
 * Returns the next upcoming Saturday at 12:00 JST as a Unix timestamp
 * (seconds). Used as a representative "weekend" departure time for
 * traffic-aware estimates across both the Directions API and Distance
 * Matrix API routes - Google's traffic model requires a concrete future
 * timestamp, not just "some Saturday" in the abstract.
 */
export function nextSaturdayNoonJSTTimestamp(): number {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const now = new Date();
  const nowJST = new Date(now.getTime() + JST_OFFSET_MS);
  const day = nowJST.getUTCDay(); // 0=Sun ... 6=Sat, reading JST wall-clock fields
  const daysUntilSaturday = (6 - day + 7) % 7;

  const candidateJSTasUTC = new Date(
    Date.UTC(
      nowJST.getUTCFullYear(),
      nowJST.getUTCMonth(),
      nowJST.getUTCDate() + daysUntilSaturday,
      12,
      0,
      0
    )
  );
  let ts = Math.floor((candidateJSTasUTC.getTime() - JST_OFFSET_MS) / 1000);

  const nowSec = Math.floor(now.getTime() / 1000);
  if (ts <= nowSec) ts += 7 * 24 * 3600; // today is Saturday but already past noon JST

  return ts;
}
