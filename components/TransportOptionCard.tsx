"use client";

import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, TrainFront, Zap } from "lucide-react";
import { TransportOption } from "@/lib/types";
import { modeEmoji } from "@/lib/transportLogic";
import { buildOpenInMapsUrl, buildShinkansenCheckUrl } from "@/lib/mapsUtils";
import { formatDurationMinutes } from "@/lib/format";
import { MapThumbnail } from "@/components/MapThumbnail";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

export function TransportOptionCard({ option }: { option: TransportOption }) {
  const { t, lang, formatMoney } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const openUrl = buildOpenInMapsUrl({
    originAddress: option.originAddress,
    destinationAddress: option.destinationAddress,
    mode: option.mode,
  });

  const hasDetails =
    (option.transitSteps && option.transitSteps.length > 0) ||
    (option.drivingSteps && option.drivingSteps.length > 0);

  const isTransitEstimate = option.mode === "transit" && !option.transitSteps;
  const transitSearchUrl = isTransitEstimate
    ? buildOpenInMapsUrl({
        originAddress: option.originAddress,
        destinationAddress: option.destinationAddress,
        mode: "transit",
      })
    : null;

  const shinkansenUrl =
    option.mode === "transit" && option.shinkansenRelevant ? buildShinkansenCheckUrl() : null;

  return (
    <div className="bg-subtle rounded-2xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none shrink-0">{modeEmoji[option.mode]}</span>
          <span className="font-medium text-ink text-sm truncate">{t(option.mode)}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-ink whitespace-nowrap">
            {formatDurationMinutes(option.durationMinutes, lang)}
          </div>
          <div className="text-xs text-ink-muted whitespace-nowrap">
            {option.isEstimate && t("approxPrefix")}
            {formatMoney(option.costValue)}
          </div>
        </div>
      </div>

      {(option.routeLabel || option.trafficConsidered) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {option.routeLabel && (
            <span className="text-[10px] font-semibold text-accent bg-accent-light rounded-full px-1.5 py-0.5">
              {option.routeLabel}
            </span>
          )}
          {option.trafficConsidered && (
            <span className="text-[10px] font-semibold text-white bg-orange-500 rounded-full px-1.5 py-0.5">
              {t("trafficConsideredBadge")}
            </span>
          )}
        </div>
      )}

      {option.routeSummary && (
        <div className="text-[11px] text-ink-muted truncate">{option.routeSummary}</div>
      )}

      {option.originLatLng && option.destinationLatLng ? (
        <MapThumbnail
          origin={option.originLatLng}
          destination={option.destinationLatLng}
          encodedPolyline={option.encodedPolyline}
          originAddress={option.originAddress}
          destinationAddress={option.destinationAddress}
          mode={option.mode}
          viewFullscreenLabel={t("viewFullscreen")}
        />
      ) : (
        option.note && (
          <p className="text-xs text-ink-muted bg-white rounded-xl p-2.5">{option.note}</p>
        )
      )}

      {hasDetails && (
        <div>
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-medium text-accent"
          >
            {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {detailsOpen ? t("hideDetails") : t("viewDetails")}
          </button>

          {detailsOpen && (
            <div className="mt-2 bg-white rounded-xl p-2.5 space-y-1.5">
              {option.transitSteps?.map((step, i) =>
                step.travelMode === "TRANSIT" ? (
                  <div key={i} className="text-xs text-ink flex items-start gap-1.5">
                    <span className="shrink-0">🚉</span>
                    <span>
                      {step.departureStop} → {step.lineName ?? ""} → {step.arrivalStop}
                      {step.numStops ? ` (${step.numStops})` : ""}
                    </span>
                  </div>
                ) : (
                  <div key={i} className="text-xs text-ink-muted flex items-start gap-1.5">
                    <span className="shrink-0">🚶</span>
                    <span>
                      {t("walkConnector")}
                      {step.durationText ? ` (${step.durationText})` : ""}
                    </span>
                  </div>
                )
              )}
              {option.drivingSteps?.map((step, i) => (
                <div key={i} className="text-xs text-ink flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>
                    {step.instruction}
                    {step.distanceText ? ` (${step.distanceText})` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {option.originLatLng && option.destinationLatLng && (
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink size={14} />
            {t("openInMaps")}
          </Button>
        </a>
      )}

      {transitSearchUrl && (
        <a href={transitSearchUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" size="sm" className="w-full">
            <TrainFront size={14} />
            {t("searchOnTransitApp")}
          </Button>
        </a>
      )}

      {shinkansenUrl && (
        <a href={shinkansenUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" size="sm" className="w-full">
            <Zap size={14} />
            {t("checkShinkansenRoutes")}
          </Button>
        </a>
      )}
    </div>
  );
}
