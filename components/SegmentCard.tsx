"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { SegmentResult, FilterMode } from "@/lib/types";
import { TransportOptionCard } from "@/components/TransportOptionCard";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import { isFavorited, toggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/cn";

function sortOptions(segment: SegmentResult, filter: FilterMode) {
  const options = [...segment.options];
  if (filter === "cheapest") {
    return options.sort((a, b) => a.costValue - b.costValue).slice(0, 1);
  }
  if (filter === "fastest") {
    return options.sort((a, b) => a.durationMinutes - b.durationMinutes).slice(0, 1);
  }
  return options;
}

export function SegmentCard({
  segment,
  index,
  filter,
}: {
  segment: SegmentResult;
  index: number;
  filter: FilterMode;
}) {
  const { t } = useI18n();
  const options = sortOptions(segment, filter);
  const [favorited, setFavorited] = useState(() =>
    isFavorited(segment.from.name, segment.to.name)
  );

  function handleToggleFavorite() {
    toggleFavorite(segment.from.name, segment.to.name);
    setFavorited((f) => !f);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-accent bg-accent-light rounded-full px-2.5 py-1">
          {t("segmentLabel")} {index + 1}
        </span>
        <button
          onClick={handleToggleFavorite}
          aria-label={favorited ? t("removeFavorite") : t("addFavorite")}
          className="p-1"
        >
          <Star
            size={18}
            className={cn(
              "transition-colors",
              favorited ? "fill-accent text-accent" : "text-ink-faint"
            )}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 text-[15px] font-medium text-ink">
        <span>{segment.from.name}</span>
        <span className="text-ink-faint">→</span>
        <span>{segment.to.name}</span>
      </div>

      {segment.error ? (
        <p className="text-sm text-red-500">{segment.error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((option, i) => (
            <TransportOptionCard key={`${option.mode}-${option.routeLabel ?? i}`} option={option} />
          ))}
        </div>
      )}
    </Card>
  );
}
