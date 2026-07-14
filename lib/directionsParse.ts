export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParsedTransitStep {
  travelMode: "TRANSIT" | "WALKING";
  instruction: string;
  lineName?: string;
  vehicleType?: string;
  departureStop?: string;
  arrivalStop?: string;
  numStops?: number;
  durationText?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTransitSteps(steps: any[]): ParsedTransitStep[] {
  return steps.map((step) => {
    if (step.travel_mode === "TRANSIT" && step.transit_details) {
      const td = step.transit_details;
      return {
        travelMode: "TRANSIT" as const,
        instruction: stripHtml(step.html_instructions ?? ""),
        lineName: td.line?.name ?? td.line?.short_name,
        vehicleType: td.line?.vehicle?.type,
        departureStop: td.departure_stop?.name,
        arrivalStop: td.arrival_stop?.name,
        numStops: td.num_stops,
        durationText: step.duration?.text,
      };
    }
    return {
      travelMode: "WALKING" as const,
      instruction: stripHtml(step.html_instructions ?? ""),
      durationText: step.duration?.text,
    };
  });
}

export interface ParsedDrivingStep {
  instruction: string;
  distanceText?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDrivingSteps(steps: any[]): ParsedDrivingStep[] {
  return steps.map((step) => ({
    instruction: stripHtml(step.html_instructions ?? ""),
    distanceText: step.distance?.text,
  }));
}
