import { NextRequest, NextResponse } from "next/server";
import { nextSaturdayNoonJSTTimestamp } from "@/lib/weekendTime";

interface RequestBody {
  locations: string[];
  mode?: "driving" | "walking" | "transit" | "bicycling";
  weekendFlags?: boolean[]; // parallel array to `locations`
}

// Google's Distance Matrix API caps a single request at 25 origins/25
// destinations AND 100 total elements (origins x destinations) - this
// second limit also applies specifically when departure_time is used with
// mode=driving. A chunk size of 10 keeps every sub-request at 10x10 = 100
// elements at most, comfortably under both limits.
const CHUNK_SIZE = 10;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_SERVER_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // Re-bind as an explicitly-typed string so TypeScript keeps this narrowed
  // (string, not string | undefined) inside nested closures below - the
  // Next.js production build runs a stricter type-check than `next dev`.
  const key: string = apiKey;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { locations, mode = "driving", weekendFlags } = body;

  if (!locations || locations.length < 2) {
    return NextResponse.json(
      { error: "At least 2 locations are required." },
      { status: 400 }
    );
  }

  const n = locations.length;
  const durationsSeconds: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null)
  );
  const distancesMeters: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null)
  );

  const originChunks = chunkArray(locations, CHUNK_SIZE);
  const destinationChunks = chunkArray(locations, CHUNK_SIZE);

  let anySucceeded = false;
  let lastError: string | null = null;

  // --- Pass 1: baseline matrix (no traffic modeling) ---
  const baselineTasks = originChunks.flatMap((originChunk, oi) =>
    destinationChunks.map(async (destChunk, di) => {
      const params = new URLSearchParams({
        origins: originChunk.join("|"),
        destinations: destChunk.join("|"),
        mode,
        key,
      });

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (data.status !== "OK" || !data.rows?.length) {
          lastError = data.error_message || `Distance Matrix request failed (${data.status}).`;
          return;
        }

        anySucceeded = true;
        for (let ri = 0; ri < originChunk.length; ri++) {
          const globalRow = oi * CHUNK_SIZE + ri;
          const row = data.rows[ri];
          for (let ci = 0; ci < destChunk.length; ci++) {
            const globalCol = di * CHUNK_SIZE + ci;
            const el = row.elements?.[ci];
            if (el?.status === "OK") {
              durationsSeconds[globalRow][globalCol] = el.duration.value;
              distancesMeters[globalRow][globalCol] = el.distance.value;
            }
          }
        }
      } catch {
        lastError = "Failed to reach Google Distance Matrix API.";
      }
    })
  );

  await Promise.all(baselineTasks);

  if (!anySucceeded) {
    return NextResponse.json(
      { error: lastError ?? "Distance Matrix request failed." },
      { status: 502 }
    );
  }

  // --- Pass 2: overwrite duration for any pair touching a weekend-flagged
  // stop with a traffic-aware estimate for the upcoming Saturday, driving
  // mode only (Google's traffic model doesn't apply to other modes). ---
  const flaggedIndices = (weekendFlags ?? [])
    .map((flag, i) => (flag ? i : -1))
    .filter((i) => i >= 0);

  let trafficAdjusted = false;

  if (mode === "driving" && flaggedIndices.length > 0) {
    const departureTime = nextSaturdayNoonJSTTimestamp();
    const allIndices = Array.from({ length: n }, (_, i) => i);
    const flaggedChunks = chunkArray(flaggedIndices, CHUNK_SIZE);
    const allChunks = chunkArray(allIndices, CHUNK_SIZE);

    async function fetchTrafficBlock(originIdx: number[], destIdx: number[]) {
      const params = new URLSearchParams({
        origins: originIdx.map((i) => locations[i]).join("|"),
        destinations: destIdx.map((i) => locations[i]).join("|"),
        mode: "driving",
        departure_time: String(departureTime),
        traffic_model: "best_guess",
        key,
      });

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.status !== "OK" || !data.rows?.length) return;

        for (let ri = 0; ri < originIdx.length; ri++) {
          const row = data.rows[ri];
          for (let ci = 0; ci < destIdx.length; ci++) {
            const el = row.elements?.[ci];
            if (el?.status === "OK") {
              const trafficDuration = el.duration_in_traffic?.value ?? el.duration.value;
              durationsSeconds[originIdx[ri]][destIdx[ci]] = trafficDuration;
              trafficAdjusted = true;
            }
          }
        }
      } catch {
        // Best-effort refinement pass - fall back to the baseline value
        // already computed above if this fails.
      }
    }

    const trafficTasks = [
      ...flaggedChunks.flatMap((fc) => allChunks.map((ac) => fetchTrafficBlock(fc, ac))),
      ...allChunks.flatMap((ac) => flaggedChunks.map((fc) => fetchTrafficBlock(ac, fc))),
    ];

    await Promise.all(trafficTasks);
  }

  return NextResponse.json({ durationsSeconds, distancesMeters, trafficAdjusted });
}
