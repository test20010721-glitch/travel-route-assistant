"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Info, RefreshCw, ExternalLink } from "lucide-react";
import { LocationItem, OrderSuggestion } from "@/lib/types";
import { suggestOptimalOrder } from "@/lib/optimizeTrip";
import { buildMultiStopEmbedUrl, buildMultiStopOpenInMapsUrl } from "@/lib/mapsUtils";
import { formatDurationMinutes } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

// Purely a UX device: fetch progress isn't observable from a single POST
// request, so this ramps toward ~92% over the expected duration and only
// completes to 100% once the real response (or timeout) arrives. This is
// paired with a hard 20s timeout in lib/optimizeTrip.ts, so it can never
// spin forever.
function useFakeProgress(active: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    const rampMs = 9000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const target = 92 * (1 - Math.exp(-elapsed / rampMs));
      setProgress(target);
    }, 150);
    return () => clearInterval(interval);
  }, [active]);

  return progress;
}

export function RouteOptimizerTab({
  locations,
  onApplyOrder,
}: {
  locations: LocationItem[];
  onApplyOrder: (newOrder: LocationItem[]) => void;
}) {
  const { t, lang } = useI18n();
  const filled = locations.filter((l) => l.name.trim().length > 0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const progress = useFakeProgress(loading);

  const key = filled.map((l) => `${l.name.trim()}:${l.weekendFlag ? 1 : 0}`).join("|");

  useEffect(() => {
    if (filled.length < 3) {
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    suggestOptimalOrder(filled).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if ("error" in res) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filled.length, retryToken]);

  function handleRetry() {
    setRetryToken((v) => v + 1);
  }

  if (filled.length < 3) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-muted">{t("optimizeNeedMore")}</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-ink-muted text-center">{t("optimizeCalculating")}</p>
        <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-150 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-ink-faint text-center">{Math.round(progress)}%</p>
      </Card>
    );
  }

  if (error) {
    const knownMessage =
      error === "timeout"
        ? t("optimizeTimeout")
        : error === "no_route_data"
          ? t("optimizeNoRouteData")
          : t("optimizeError");
    const showRawDetail = error !== "timeout" && error !== "no_route_data";

    return (
      <Card className="p-6 text-center space-y-3">
        <p className="text-sm text-red-500">{knownMessage}</p>
        {showRawDetail && (
          <p className="text-xs text-ink-faint break-words">
            {t("errorDetailLabel")}: {error}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={handleRetry} className="mx-auto">
          <RefreshCw size={14} />
          {t("retryButton")}
        </Button>
      </Card>
    );
  }

  if (!result) return null;

  const suggestedNames = result.suggestedLocations.map((l) => l.name);
  const embedUrl = buildMultiStopEmbedUrl(suggestedNames);
  const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const currentMin =
    result.currentDurationSeconds !== null ? result.currentDurationSeconds / 60 : null;
  const suggestedMin = result.suggestedDurationSeconds / 60;
  const savedMin = currentMin !== null ? currentMin - suggestedMin : null;

  const orderUnchanged =
    filled.length === result.suggestedLocations.length &&
    filled.every((l, i) => l.name === result.suggestedLocations[i].name);

  return (
    <div className="space-y-4 pb-10">
      {hasKey ? (
        <Card className="overflow-hidden">
          <iframe
            title="optimized-route-map"
            className="w-full h-64 border-0"
            loading="lazy"
            src={embedUrl}
          />
        </Card>
      ) : (
        <Card className="p-4 text-xs text-ink-faint text-center">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map
        </Card>
      )}

      <a
        href={buildMultiStopOpenInMapsUrl(suggestedNames)}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button variant="outline" size="sm" className="w-full">
          <ExternalLink size={14} />
          {t("openInMaps")}
        </Button>
      </a>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-ink">{t("suggestedOrderLabel")}</h3>
        </div>

        <ol className="space-y-1.5">
          {result.suggestedLocations.map((loc, i) => (
            <li key={loc.id} className="flex items-center gap-2 text-sm text-ink">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-light text-accent text-xs font-semibold shrink-0">
                {i + 1}
              </span>
              {loc.name}
            </li>
          ))}
        </ol>

        <div className="border-t border-line pt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">{t("totalTimeLabel")}</span>
            <span className="font-semibold text-ink">
              {formatDurationMinutes(suggestedMin, lang)}
            </span>
          </div>
          {currentMin !== null && (
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">{t("currentOrderLabel")}</span>
              <span className="text-ink-muted">{formatDurationMinutes(currentMin, lang)}</span>
            </div>
          )}
          {savedMin !== null && savedMin > 0.5 && (
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">{t("timeSavedLabel")}</span>
              <span className="font-semibold text-accent">
                {formatDurationMinutes(savedMin, lang)}
              </span>
            </div>
          )}
        </div>

        {orderUnchanged ? (
          <p className="text-xs text-ink-muted text-center pt-1">{t("alreadyOptimalOrder")}</p>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => onApplyOrder(result.suggestedLocations)}
          >
            {t("applyOrderToSearch")}
            <ArrowRight size={16} />
          </Button>
        )}
      </Card>

      {result.trafficAdjusted && (
        <p className="text-[11px] text-ink-faint text-center px-1">{t("weekendAdjustedNote")}</p>
      )}

      <div className="flex items-start gap-2 px-1">
        <Info size={14} className="text-ink-faint shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-faint leading-relaxed">{t("optimizeDisclaimer")}</p>
      </div>
    </div>
  );
}
