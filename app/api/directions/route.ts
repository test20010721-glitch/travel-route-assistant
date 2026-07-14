import { NextRequest, NextResponse } from "next/server";
import { parseTransitSteps, parseDrivingSteps } from "@/lib/directionsParse";
import { nextSaturdayNoonJSTTimestamp } from "@/lib/weekendTime";

type GoogleTravelMode = "walking" | "bicycling" | "transit" | "driving";

interface RequestBody {
  origin: string;
  destination: string;
  mode: GoogleTravelMode;
  avoid?: "tolls";
  alternatives?: boolean;
  trafficAware?: boolean; // driving only - factors in predicted weekend traffic
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_SERVER_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { origin, destination, mode, avoid, alternatives, trafficAware } = body;

  if (!origin || !destination || !mode) {
    return NextResponse.json(
      { error: "origin, destination and mode are required." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    origin,
    destination,
    mode,
    key: apiKey,
  });
  if (avoid) params.set("avoid", avoid);
  if (alternatives) params.set("alternatives", "true");

  const useTraffic = mode === "driving" && trafficAware;
  if (useTraffic) {
    params.set("departure_time", String(nextSaturdayNoonJSTTimestamp()));
    params.set("traffic_model", "best_guess");
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data.status !== "OK" || !data.routes?.length) {
      return NextResponse.json(
        { error: data.error_message || `No route found (${data.status}).`, status: data.status },
        { status: 404 }
      );
    }

    const routes = data.routes.slice(0, 3).map((route: any) => {
      const leg = route.legs[0];
      const trafficDuration = leg.duration_in_traffic?.value;
      return {
        durationSeconds: trafficDuration ?? leg.duration.value,
        distanceMeters: leg.distance.value,
        originAddress: leg.start_address,
        destinationAddress: leg.end_address,
        originLatLng: leg.start_location,
        destinationLatLng: leg.end_location,
        encodedPolyline: route.overview_polyline?.points ?? null,
        fareValue: route.fare?.value ?? null,
        fareCurrency: route.fare?.currency ?? null,
        summary: route.summary ?? null,
        transitSteps: mode === "transit" ? parseTransitSteps(leg.steps ?? []) : undefined,
        drivingSteps: mode === "driving" ? parseDrivingSteps(leg.steps ?? []) : undefined,
        trafficAware: trafficDuration !== undefined,
      };
    });

    return NextResponse.json({ routes });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Google Directions API." },
      { status: 502 }
    );
  }
}
