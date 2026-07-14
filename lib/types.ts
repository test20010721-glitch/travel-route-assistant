export type Language = "ja" | "en" | "es" | "ca";

export interface LocationItem {
  id: string;
  name: string;
  weekendFlag?: boolean; // marks this stop as visited on a weekend/congested day
}

export type TransportMode =
  | "walking"
  | "bicycling"
  | "transit"
  | "driving"
  | "driving_free"
  | "taxi"
  | "flight";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TransitStepDetail {
  travelMode: "TRANSIT" | "WALKING";
  instruction: string;
  lineName?: string;
  vehicleType?: string;
  departureStop?: string;
  arrivalStop?: string;
  numStops?: number;
  durationText?: string;
}

export interface DrivingStepDetail {
  instruction: string;
  distanceText?: string;
}

export interface TransportOption {
  mode: TransportMode;
  durationMinutes: number;
  costValue: number; // numeric amount in JPY - the canonical unit for sorting/comparison.
  // Display currency/formatting happens at render time via useI18n().formatMoney(),
  // based on the currently selected language, so switching language updates
  // amounts without needing to re-search.
  isEstimate: boolean;
  originAddress: string;
  destinationAddress: string;
  originLatLng?: LatLng;
  destinationLatLng?: LatLng;
  encodedPolyline?: string;
  note?: string; // e.g. AI note like "flight suggestion, check airlines directly"
  routeSummary?: string; // Google's short route summary, e.g. highway names used
  routeLabel?: string; // e.g. "Route 1" when multiple driving alternatives exist
  transitSteps?: TransitStepDetail[];
  drivingSteps?: DrivingStepDetail[];
  shinkansenRelevant?: boolean; // distance suggests Shinkansen/limited-express may apply
  trafficConsidered?: boolean; // duration reflects weekend-traffic-aware estimate
}

export interface SegmentResult {
  id: string;
  from: LocationItem;
  to: LocationItem;
  straightLineDistanceKm: number;
  options: TransportOption[];
  error?: string;
}

export type FilterMode = "all" | "cheapest" | "fastest";

export interface SavedSearch {
  id: string;
  tripName: string;
  createdAt: number;
  locations: LocationItem[];
  segments: SegmentResult[];
}

export interface FavoriteRoute {
  id: string;
  fromName: string;
  toName: string;
  savedAt: number;
}

export interface OrderSuggestion {
  suggestedLocations: LocationItem[];
  currentDurationSeconds: number | null; // null if current order has an unreachable pair
  suggestedDurationSeconds: number;
  trafficAdjusted: boolean; // true if any weekend-flagged stop affected the numbers
}
