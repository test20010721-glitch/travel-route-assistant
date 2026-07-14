"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SegmentResult, FilterMode } from "@/lib/types";
import { SegmentCard } from "@/components/SegmentCard";
import { AIAssist } from "@/components/AIAssist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

export function RouteResults({
  segments,
  tripName,
  onBack,
}: {
  segments: SegmentResult[];
  tripName: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterMode>("all");

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
          {t("backToEdit")}
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-ink">
          {tripName || t("resultsTitle")}
        </h2>
        <p className="text-xs text-ink-muted mt-1">{t("estimateNote")}</p>
      </div>

      <div className="flex gap-2">
        <Badge active={filter === "all"} onClick={() => setFilter("all")}>
          {t("filterAll")}
        </Badge>
        <Badge active={filter === "cheapest"} onClick={() => setFilter("cheapest")}>
          {t("filterCheapest")}
        </Badge>
        <Badge active={filter === "fastest"} onClick={() => setFilter("fastest")}>
          {t("filterFastest")}
        </Badge>
      </div>

      <div className="space-y-4">
        {segments.map((segment, i) => (
          <SegmentCard key={segment.id} segment={segment} index={i} filter={filter} />
        ))}
      </div>

      <AIAssist segments={segments} />
    </div>
  );
}
