"use client";

import { useState } from "react";
import { Sparkles, Fuel, PiggyBank, Zap } from "lucide-react";
import { SegmentResult } from "@/lib/types";
import { generateSuggestions } from "@/lib/aiSuggestions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";

const iconFor = {
  rentalCar: Fuel,
  savings: PiggyBank,
  speed: Zap,
};

export function AIAssist({ segments }: { segments: SegmentResult[] }) {
  const { t, lang, formatMoney } = useI18n();
  const [show, setShow] = useState(false);

  const suggestions = show ? generateSuggestions(segments, lang, formatMoney) : [];

  return (
    <div className="mt-2">
      <Button
        variant={show ? "secondary" : "primary"}
        size="lg"
        className="w-full"
        onClick={() => setShow((s) => !s)}
      >
        <Sparkles size={16} />
        {t("aiAssist")}
      </Button>

      {show && (
        <Card className="mt-3 p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-ink text-sm">{t("aiAssistTitle")}</h3>
            <p className="text-xs text-ink-muted mt-0.5">{t("aiAssistHint")}</p>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <ul className="space-y-2.5">
              {suggestions.map((s, i) => {
                const Icon = iconFor[s.type];
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 bg-accent-light rounded-xl p-3"
                  >
                    <Icon size={16} className="text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-ink">{s.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
