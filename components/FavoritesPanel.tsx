"use client";

import { useEffect, useState } from "react";
import { X, Trash2, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { FavoriteRoute, SegmentResult, LocationItem } from "@/lib/types";
import { getFavorites, removeFavorite } from "@/lib/favorites";
import { buildSegments } from "@/lib/searchRoutes";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui/button";
import { TransportOptionCard } from "@/components/TransportOptionCard";

type PreviewState = "loading" | "error" | SegmentResult;

export function FavoritesPanel({
  onClose,
  onAddToSearch,
}: {
  onClose: () => void;
  onAddToSearch: (fromName: string, toName: string) => void;
}) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<FavoriteRoute[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewCache, setPreviewCache] = useState<Record<string, PreviewState>>({});

  useEffect(() => {
    setItems(getFavorites());
  }, []);

  function handleRemove(id: string) {
    setItems(removeFavorite(id));
    if (expandedId === id) setExpandedId(null);
  }

  async function handleToggleExpand(item: FavoriteRoute) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);

    setPreviewCache((c) => ({ ...c, [item.id]: "loading" }));
    try {
      const locs: LocationItem[] = [
        { id: "fav-from", name: item.fromName },
        { id: "fav-to", name: item.toName },
      ];
      const segments = await buildSegments(locs, lang);
      setPreviewCache((c) => ({ ...c, [item.id]: segments[0] }));
    } catch {
      setPreviewCache((c) => ({ ...c, [item.id]: "error" }));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <span className="text-sm font-semibold text-ink">{t("favoritesTitle")}</span>
          <button onClick={onClose} aria-label={t("close")} className="text-ink-muted hover:text-ink p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">{t("noFavorites")}</p>
          ) : (
            items.map((item) => {
              const isExpanded = expandedId === item.id;
              const preview = previewCache[item.id];

              return (
                <div key={item.id} className="bg-white border border-line rounded-xl overflow-hidden">
                  <button
                    onClick={() => handleToggleExpand(item)}
                    className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-subtle transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="truncate">{item.fromName}</span>
                      <span className="text-ink-faint shrink-0">→</span>
                      <span className="truncate">{item.toName}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-ink-faint shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-ink-faint shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 bg-subtle/40">
                      {preview === "loading" && (
                        <p className="text-xs text-ink-muted text-center py-4">{t("searching")}</p>
                      )}
                      {preview === "error" && (
                        <p className="text-xs text-red-500 text-center py-4">{t("errorFetching")}</p>
                      )}
                      {preview && preview !== "loading" && preview !== "error" && (
                        preview.error ? (
                          <p className="text-xs text-red-500 text-center py-4">{preview.error}</p>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {preview.options.map((option, i) => (
                              <TransportOptionCard
                                key={`${option.mode}-${option.routeLabel ?? i}`}
                                option={option}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 p-3 pt-0 border-t border-line/60 mt-0">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={() => onAddToSearch(item.fromName, item.toName)}
                    >
                      <ArrowUpRight size={14} />
                      {t("addToSearch")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(item.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
