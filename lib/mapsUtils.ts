import { LatLng, TransportMode } from "./types";

const modeToGoogleTravelMode: Record<TransportMode, string> = {
  walking: "walking",
  bicycling: "bicycling",
  transit: "transit",
  driving: "driving",
  driving_free: "driving",
  taxi: "driving",
  flight: "driving", // flight has no maps travel mode; used only for the "open" link fallback
};

/**
 * Builds a Google Static Maps URL showing the route polyline as a thumbnail.
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set and the "Maps Static API"
 * to be enabled on that key.
 */
export function buildStaticMapUrl(opts: {
  origin: LatLng;
  destination: LatLng;
  encodedPolyline?: string;
  width?: number;
  height?: number;
}): string {
  const { origin, destination, encodedPolyline, width = 400, height = 200 } = opts;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const params = new URLSearchParams();
  params.set("size", `${width}x${height}`);
  params.set("scale", "2");
  params.set("key", key);
  params.append("markers", `color:0x0A84FF|label:A|${origin.lat},${origin.lng}`);
  params.append("markers", `color:0x1D1D1F|label:B|${destination.lat},${destination.lng}`);
  if (encodedPolyline) {
    params.append("path", `color:0x0A84FFCC|weight:4|enc:${encodedPolyline}`);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/**
 * Builds a URL that opens Google Maps (app or browser) with the route
 * pre-filled, using the Google Maps URLs API (no key required).
 */
export function buildOpenInMapsUrl(opts: {
  originAddress: string;
  destinationAddress: string;
  mode: TransportMode;
}): string {
  const { originAddress, destinationAddress, mode } = opts;
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", originAddress);
  params.set("destination", destinationAddress);
  params.set("travelmode", modeToGoogleTravelMode[mode]);
  if (mode === "driving_free") {
    params.set("avoid", "tolls");
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Rough Japan-style taxi fare estimate based on driving distance/duration.
 * This is a heuristic for MVP purposes only, not a real fare API.
 * Base: ~500 JPY for the first 1.052km, then ~100 JPY per 237m,
 * plus a small time-based surcharge for slow traffic.
 */
export function estimateTaxiFareJPY(distanceKm: number, durationMinutes: number): number {
  const baseDistanceKm = 1.052;
  const baseFare = 500;
  const perUnitFare = 100;
  const unitKm = 0.237;

  if (distanceKm <= baseDistanceKm) return baseFare;

  const remainingKm = distanceKm - baseDistanceKm;
  const units = Math.ceil(remainingKm / unitKm);
  const distanceFare = baseFare + units * perUnitFare;

  // Rough time-based surcharge for congestion (very approximate)
  const expectedMinutesAtFreeFlow = (distanceKm / 25) * 60; // ~25km/h avg city driving
  const extraMinutes = Math.max(0, durationMinutes - expectedMinutesAtFreeFlow);
  const timeSurcharge = extraMinutes * 40; // ~40 JPY per extra minute stuck in traffic

  return Math.round((distanceFare + timeSurcharge) / 10) * 10;
}

/**
 * Rough train fare estimate for Japan when the Directions API does not
 * return a fare (Google's fare field has limited coverage). Based on
 * common JR/private-rail short-to-mid distance fare bands.
 */
export function estimateTrainFareJPY(distanceKm: number): number {
  if (distanceKm <= 3) return 150;
  if (distanceKm <= 6) return 170;
  if (distanceKm <= 10) return 200;
  if (distanceKm <= 15) return 240;
  if (distanceKm <= 20) return 320;
  if (distanceKm <= 30) return 420;
  if (distanceKm <= 50) return 680;
  if (distanceKm <= 100) return 1520;
  // Long distance: treat as shinkansen/limited-express band, very rough
  return Math.round((1520 + (distanceKm - 100) * 16) / 10) * 10;
}

/**
 * Rough Japan expressway (highway) toll estimate for a standard-size car,
 * based on NEXCO's typical average rate per km. This is a heuristic for MVP
 * purposes only, not a real toll calculator (actual tolls vary by specific
 * route, vehicle class, and time-of-day discounts).
 */
export function estimateHighwayTollJPY(distanceKm: number): number {
  if (distanceKm <= 5) return 0; // too short to meaningfully use a highway
  const base = 150;
  const perKm = 24.6;
  return Math.round((base + distanceKm * perKm) / 10) * 10;
}

/**
 * Rough duration estimate for train/Shinkansen travel when the Directions
 * API returns no transit route (common for long-distance intercity trips in
 * Japan, since Google's transit coverage there is largely limited to urban
 * rail/subway networks). Uses tiered average speeds that roughly account for
 * stops, transfers, and a mix of local/limited-express/Shinkansen segments.
 */
export function estimateTrainDurationMinutes(distanceKm: number): number {
  let avgSpeedKmH: number;
  if (distanceKm <= 30) avgSpeedKmH = 45;
  else if (distanceKm <= 100) avgSpeedKmH = 65;
  else if (distanceKm <= 400) avgSpeedKmH = 140;
  else avgSpeedKmH = 190;

  const transferBufferMinutes = distanceKm > 100 ? 20 : 8;
  return (distanceKm / avgSpeedKmH) * 60 + transferBufferMinutes;
}

/**
 * Builds a Google Maps Embed API "directions" URL that draws a route through
 * an ordered list of stops (used by the Shortest Route tab). The order is
 * exactly as given - Google does not re-optimize it, since we've already
 * computed the order ourselves.
 */
export function buildMultiStopEmbedUrl(locationNames: string[]): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  if (locationNames.length < 2) return "";
  const origin = locationNames[0];
  const destination = locationNames[locationNames.length - 1];
  const waypoints = locationNames.slice(1, -1);
  const params = new URLSearchParams();
  params.set("key", key);
  params.set("origin", origin);
  params.set("destination", destination);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  params.set("mode", "driving");
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

/**
 * Builds a Google Maps URL (app or browser) with the full suggested route
 * pre-filled as origin -> waypoints -> destination, in the given order.
 * Used by the Shortest Route tab's "Open in Google Maps" button.
 */
export function buildMultiStopOpenInMapsUrl(locationNames: string[]): string {
  if (locationNames.length < 2) return "";
  const origin = locationNames[0];
  const destination = locationNames[locationNames.length - 1];
  const waypoints = locationNames.slice(1, -1);
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", origin);
  params.set("destination", destination);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  params.set("travelmode", "driving");
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Points to NAVITIME Transit's Japan route search, which covers Shinkansen
 * and other intercity trains nationwide and is available in English and
 * Spanish (among other languages) via the in-page language switcher.
 * There's no single official nationwide JR site that covers all Shinkansen
 * operators (JR East/Central/West/Kyushu/Hokkaido each run their own), so
 * this is offered as the practical multilingual equivalent. We link to the
 * general search page rather than a prefilled URL since NAVITIME doesn't
 * document a stable query-string contract for prefilling origin/destination.
 */
export function buildShinkansenCheckUrl(): string {
  return "https://transit.navitime.com/en/jp/";
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
