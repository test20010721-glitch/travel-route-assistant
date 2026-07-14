"use client";

import { useState } from "react";
import { MapPin, History, Star } from "lucide-react";
import { LocationItem, SegmentResult, SavedSearch } from "@/lib/types";
import { LocationList } from "@/components/LocationList";
import { RouteResults } from "@/components/RouteResults";
import { RouteOptimizerTab } from "@/components/RouteOptimizerTab";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HistoryPanel } from "@/components/HistoryPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import { buildSegments } from "@/lib/searchRoutes";
import { saveSearchToHistory } from "@/lib/history";
import { generateId } from "@/lib/id";
import { cn } from "@/lib/cn";

const initialLocations: LocationItem[] = [
  { id: "loc-initial-1", name: "" },
  { id: "loc-initial-2", name: "" },
];

type Tab = "search" | "optimize";

export default function Home() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [tripName, setTripName] = useState("");
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  const [segments, setSegments] = useState<SegmentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const filledLocations = locations.filter((l) => l.name.trim().length > 0);

  async function handleSearch() {
    setValidationError(null);
    if (filledLocations.length < 2) {
      setValidationError(t("needAtLeastTwo"));
      return;
    }
    setLoading(true);
    try {
      const result = await buildSegments(filledLocations, lang);
      setSegments(result);
      saveSearchToHistory(tripName, filledLocations, result);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenHistoryItem(search: SavedSearch) {
    setTripName(search.tripName);
    setLocations(search.locations);
    setSegments(search.segments);
    setActiveTab("search");
    setShowHistory(false);
  }

  function handleApplyOptimizedOrder(newOrder: LocationItem[]) {
    setLocations(newOrder);
    setSegments(null);
    setActiveTab("search");
  }

  function handleAddFavoriteToSearch(fromName: string, toName: string) {
    const nonBlank = locations.filter((l) => l.name.trim().length > 0);
    setLocations([
      ...nonBlank,
      { id: generateId(), name: fromName },
      { id: generateId(), name: toName },
    ]);
    setSegments(null);
    setActiveTab("search");
    setShowFavorites(false);
  }

  return (
    <main className="min-h-screen bg-subtle">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <header className="flex items-start justify-between mb-5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-accent flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-ink leading-tight truncate">
                {t("appTitle")}
              </h1>
              <p className="text-xs text-ink-muted leading-tight truncate">{t("appSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowHistory(true)}
              aria-label={t("historyButton")}
              className="p-2 text-ink-muted hover:text-accent transition-colors"
            >
              <History size={18} />
            </button>
            <button
              onClick={() => setShowFavorites(true)}
              aria-label={t("favoritesButton")}
              className="p-2 text-ink-muted hover:text-accent transition-colors"
            >
              <Star size={18} />
            </button>
            <LanguageSwitcher />
          </div>
        </header>

        <div className="flex bg-white rounded-full p-1 shadow-card mb-5">
          <button
            onClick={() => setActiveTab("search")}
            className={cn(
              "flex-1 text-sm font-medium py-2 rounded-full transition-colors",
              activeTab === "search" ? "bg-accent text-white" : "text-ink-muted"
            )}
          >
            {t("tabSearch")}
          </button>
          <button
            onClick={() => setActiveTab("optimize")}
            className={cn(
              "flex-1 text-sm font-medium py-2 rounded-full transition-colors",
              activeTab === "optimize" ? "bg-accent text-white" : "text-ink-muted"
            )}
          >
            {t("tabOptimize")}
          </button>
        </div>

        {activeTab === "optimize" ? (
          <RouteOptimizerTab locations={locations} onApplyOrder={handleApplyOptimizedOrder} />
        ) : segments ? (
          <RouteResults segments={segments} tripName={tripName} onBack={() => setSegments(null)} />
        ) : (
          <div className="space-y-5">
            <div className="bg-white rounded-card shadow-card p-4">
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                {t("tripNameLabel")}
              </label>
              <Input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder={t("tripNamePlaceholder")}
              />
            </div>

            <div className="bg-white rounded-card shadow-card p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-ink-muted">
                  {t("locationsLabel")}
                </label>
                <span className="text-[11px] text-ink-faint">{t("dragHint")}</span>
              </div>
              <LocationList locations={locations} onChange={setLocations} />
            </div>

            {validationError && (
              <p className="text-sm text-red-500 text-center">{validationError}</p>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? t("searching") : t("searchButton")}
            </Button>
          </div>
        )}
      </div>

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} onOpen={handleOpenHistoryItem} />
      )}
      {showFavorites && (
        <FavoritesPanel
          onClose={() => setShowFavorites(false)}
          onAddToSearch={handleAddFavoriteToSearch}
        />
      )}
    </main>
  );
}
