"use client";

import { useEffect, useState } from "react";
import { X, Trash2, ArrowUpRight } from "lucide-react";
import { SavedSearch } from "@/lib/types";
import { getHistory, deleteHistoryItem } from "@/lib/history";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";

export function HistoryPanel({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (search: SavedSearch) => void;
}) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  function handleDelete(id: string) {
    deleteHistoryItem(id);
    setItems(getHistory());
  }

  const locale = lang === "ja" ? "ja-JP" : lang === "es" ? "es-ES" : lang === "ca" ? "ca-ES" : "en-US";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <span className="text-sm font-semibold text-ink">{t("historyTitle")}</span>
          <button onClick={onClose} aria-label={t("close")} className="text-ink-muted hover:text-ink p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">{t("noHistory")}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-subtle rounded-xl p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink truncate">
                    {item.tripName || t("savedTripFallback")}
                  </div>
                  <div className="text-xs text-ink-muted truncate mt-0.5">
                    {item.locations.map((l) => l.name).join(" → ")}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {new Date(item.createdAt).toLocaleString(locale)}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="primary" onClick={() => onOpen(item)}>
                    <ArrowUpRight size={14} />
                    {t("openSaved")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={14} />
                    {t("deleteSaved")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
