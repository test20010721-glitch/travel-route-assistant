import {
  LocationItem,
  SegmentResult,
  TransportOption,
  TransportMode,
  Language,
  TransitStepDetail,
  DrivingStepDetail,
} from "./types";
import { decideModes } from "./transportLogic";
import {
  estimateTaxiFareJPY,
  estimateTrainFareJPY,
  estimateHighwayTollJPY,
  estimateTrainDurationMinutes,
  haversineDistanceKm,
} from "./mapsUtils";
import { t } from "./i18n";

interface RouteApiResult {
  durationSeconds: number;
  distanceMeters: number;
  originAddress: string;
  destinationAddress: string;
  originLatLng: { lat: number; lng: number };
  destinationLatLng: { lat: number; lng: number };
  encodedPolyline: string | null;
  fareValue: number | null;
  fareCurrency: string | null;
  summary: string | null;
  transitSteps?: TransitStepDetail[];
  drivingSteps?: DrivingStepDetail[];
  trafficAware?: boolean;
}

interface DirectionsApiResponse {
  routes: RouteApiResult[];
}

async function fetchDirections(
  origin: string,
  destination: string,
  mode: "walking" | "bicycling" | "transit" | "driving",
  opts?: { avoid?: "tolls"; alternatives?: boolean; trafficAware?: boolean }
): Promise<DirectionsApiResponse | { error: string }> {
  try {
    const res = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode, ...opts }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "unknown error" };
    return data as DirectionsApiResponse;
  } catch {
    return { error: "network error" };
  }
}

function isSuccess(
  r: DirectionsApiResponse | { error: string }
): r is DirectionsApiResponse {
  return "routes" in r;
}

// Long-distance transit fallback (estimate) is only offered up to this range;
// beyond it, realistically only flight makes sense within Japan.
const MAX_TRAIN_ESTIMATE_KM = 1200;

// Below this distance, regular local/commuter rail is realistic and a
// Shinkansen-specific route checker isn't especially useful.
const SHINKANSEN_RELEVANT_MIN_KM = 100;

async function buildSegment(
  from: LocationItem,
  to: LocationItem,
  lang: Language
): Promise<SegmentResult> {
  const id = `${from.id}-${to.id}`;
  const trafficFlag = !!from.weekendFlag || !!to.weekendFlag;

  const [walkingRes, drivingRes, transitRes] = await Promise.all([
    fetchDirections(from.name, to.name, "walking"),
    fetchDirections(from.name, to.name, "driving", { alternatives: true, trafficAware: trafficFlag }),
    fetchDirections(from.name, to.name, "transit"),
  ]);

  const walkingOk = isSuccess(walkingRes) ? walkingRes.routes[0] : null;
  const drivingRoutes = isSuccess(drivingRes) ? drivingRes.routes : [];
  const drivingOk = drivingRoutes[0] ?? null;
  const transitOk = isSuccess(transitRes) ? transitRes.routes[0] : null;

  if (!walkingOk && !drivingOk && !transitOk) {
    return {
      id,
      from,
      to,
      straightLineDistanceKm: 0,
      options: [],
      error: t(lang, "errorFetching"),
    };
  }

  const walkingMinutes = walkingOk ? walkingOk.durationSeconds / 60 : null;
  const drivingDistanceKm = drivingOk ? drivingOk.distanceMeters / 1000 : null;

  const reference = drivingOk ?? walkingOk ?? transitOk!;
  const straightLineDistanceKm =
    drivingDistanceKm ??
    haversineDistanceKm(reference.originLatLng, reference.destinationLatLng);

  const modes = decideModes({ walkingMinutes, drivingDistanceKm: drivingDistanceKm ?? straightLineDistanceKm });

  const options: TransportOption[] = [];

  for (const mode of modes) {
    const built = await buildOptionsForMode(mode, from, to, {
      walkingOk,
      drivingRoutes,
      transitOk,
      straightLineDistanceKm,
      lang,
      trafficFlag,
    });
    options.push(...built);
  }

  return { id, from, to, straightLineDistanceKm, options };
}

async function buildOptionsForMode(
  mode: TransportMode,
  from: LocationItem,
  to: LocationItem,
  ctx: {
    walkingOk: RouteApiResult | null;
    drivingRoutes: RouteApiResult[];
    transitOk: RouteApiResult | null;
    straightLineDistanceKm: number;
    lang: Language;
    trafficFlag: boolean;
  }
): Promise<TransportOption[]> {
  const { walkingOk, drivingRoutes, transitOk, straightLineDistanceKm, lang, trafficFlag } = ctx;
  const drivingOk = drivingRoutes[0] ?? null;

  if (mode === "walking" && walkingOk) {
    const minutes = walkingOk.durationSeconds / 60;
    return [
      {
        mode,
        durationMinutes: minutes,
        costValue: 0,
        isEstimate: false,
        originAddress: walkingOk.originAddress,
        destinationAddress: walkingOk.destinationAddress,
        originLatLng: walkingOk.originLatLng,
        destinationLatLng: walkingOk.destinationLatLng,
        encodedPolyline: walkingOk.encodedPolyline ?? undefined,
      },
    ];
  }

  if (mode === "driving" && drivingRoutes.length > 0) {
    return drivingRoutes.slice(0, 3).map((route, i) => {
      const minutes = route.durationSeconds / 60;
      const distanceKm = route.distanceMeters / 1000;
      const fuelCost = Math.max(50, Math.round(distanceKm * 15));
      const tollCost = estimateHighwayTollJPY(distanceKm);
      const totalCost = fuelCost + tollCost;
      return {
        mode,
        durationMinutes: minutes,
        costValue: totalCost,
        isEstimate: true,
        originAddress: route.originAddress,
        destinationAddress: route.destinationAddress,
        originLatLng: route.originLatLng,
        destinationLatLng: route.destinationLatLng,
        encodedPolyline: route.encodedPolyline ?? undefined,
        routeSummary: route.summary ?? undefined,
        routeLabel: drivingRoutes.length > 1 ? `${t(lang, "routeOption")} ${i + 1}` : undefined,
        drivingSteps: route.drivingSteps,
        trafficConsidered: route.trafficAware ?? false,
      };
    });
  }

  if (mode === "driving_free") {
    const res = await fetchDirections(from.name, to.name, "driving", {
      avoid: "tolls",
      trafficAware: trafficFlag,
    });
    if (!isSuccess(res) || !res.routes[0]) return [];
    const route = res.routes[0];
    const minutes = route.durationSeconds / 60;
    const distanceKm = route.distanceMeters / 1000;
    const fuelCost = Math.max(50, Math.round(distanceKm * 15));
    return [
      {
        mode,
        durationMinutes: minutes,
        costValue: fuelCost,
        isEstimate: true,
        originAddress: route.originAddress,
        destinationAddress: route.destinationAddress,
        originLatLng: route.originLatLng,
        destinationLatLng: route.destinationLatLng,
        encodedPolyline: route.encodedPolyline ?? undefined,
        routeSummary: route.summary ?? undefined,
        drivingSteps: route.drivingSteps,
        trafficConsidered: route.trafficAware ?? false,
      },
    ];
  }

  if (mode === "taxi" && drivingOk) {
    const minutes = drivingOk.durationSeconds / 60;
    const distanceKm = drivingOk.distanceMeters / 1000;
    const fare = estimateTaxiFareJPY(distanceKm, minutes);
    return [
      {
        mode,
        durationMinutes: minutes,
        costValue: fare,
        isEstimate: true,
        originAddress: drivingOk.originAddress,
        destinationAddress: drivingOk.destinationAddress,
        originLatLng: drivingOk.originLatLng,
        destinationLatLng: drivingOk.destinationLatLng,
        encodedPolyline: drivingOk.encodedPolyline ?? undefined,
        trafficConsidered: drivingOk.trafficAware ?? false,
      },
    ];
  }

  if (mode === "bicycling") {
    const res = await fetchDirections(from.name, to.name, "bicycling");
    if (!isSuccess(res) || !res.routes[0]) return [];
    const route = res.routes[0];
    const minutes = route.durationSeconds / 60;
    return [
      {
        mode,
        durationMinutes: minutes,
        costValue: 0,
        isEstimate: false,
        originAddress: route.originAddress,
        destinationAddress: route.destinationAddress,
        originLatLng: route.originLatLng,
        destinationLatLng: route.destinationLatLng,
        encodedPolyline: route.encodedPolyline ?? undefined,
      },
    ];
  }

  if (mode === "transit") {
    if (transitOk) {
      const minutes = transitOk.durationSeconds / 60;
      const distanceKm = transitOk.distanceMeters / 1000;
      let costValue: number;
      let isEstimate: boolean;
      if (transitOk.fareValue !== null) {
        costValue = transitOk.fareValue;
        isEstimate = false;
      } else {
        costValue = estimateTrainFareJPY(distanceKm);
        isEstimate = true;
      }
      return [
        {
          mode,
          durationMinutes: minutes,
          costValue,
          isEstimate,
          originAddress: transitOk.originAddress,
          destinationAddress: transitOk.destinationAddress,
          originLatLng: transitOk.originLatLng,
          destinationLatLng: transitOk.destinationLatLng,
          encodedPolyline: transitOk.encodedPolyline ?? undefined,
          transitSteps: transitOk.transitSteps,
          note: isEstimate ? t(lang, "trainEstimateNote") : undefined,
          shinkansenRelevant:
            straightLineDistanceKm >= SHINKANSEN_RELEVANT_MIN_KM &&
            straightLineDistanceKm <= MAX_TRAIN_ESTIMATE_KM,
        },
      ];
    }

    // No live transit route from Google (common for long-distance Japanese
    // rail/Shinkansen, which the Directions API doesn't cover well). Fall
    // back to a rough estimate so the option isn't just missing - we can't
    // fabricate multiple fake candidates without real station/line data.
    if (straightLineDistanceKm <= MAX_TRAIN_ESTIMATE_KM) {
      const minutes = estimateTrainDurationMinutes(straightLineDistanceKm);
      const cost = estimateTrainFareJPY(straightLineDistanceKm);
      return [
        {
          mode,
          durationMinutes: minutes,
          costValue: cost,
          isEstimate: true,
          originAddress: from.name,
          destinationAddress: to.name,
          note: t(lang, "trainEstimateNote"),
          shinkansenRelevant: straightLineDistanceKm >= SHINKANSEN_RELEVANT_MIN_KM,
        },
      ];
    }

    return [];
  }

  if (mode === "flight") {
    const avgSpeedKmH = 750;
    const groundOverheadMinutes = 120;
    const minutes = (straightLineDistanceKm / avgSpeedKmH) * 60 + groundOverheadMinutes;
    return [
      {
        mode,
        durationMinutes: minutes,
        costValue: Number.POSITIVE_INFINITY,
        isEstimate: true,
        originAddress: from.name,
        destinationAddress: to.name,
        note:
          lang === "ja"
            ? "航空券の料金・時刻は航空会社サイトでご確認ください。"
            : "Check an airline or flight search site for exact fares and times.",
      },
    ];
  }

  return [];
}

export async function buildSegments(
  locations: LocationItem[],
  lang: Language
): Promise<SegmentResult[]> {
  const pairs: [LocationItem, LocationItem][] = [];
  for (let i = 0; i < locations.length - 1; i++) {
    pairs.push([locations[i], locations[i + 1]]);
  }

  const segments: SegmentResult[] = [];
  for (const [from, to] of pairs) {
    // Sequential to keep Directions API request volume predictable for MVP.
    // eslint-disable-next-line no-await-in-loop
    const segment = await buildSegment(from, to, lang);
    segments.push(segment);
  }
  return segments;
}
