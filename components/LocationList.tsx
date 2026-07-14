"use client";

import { useState } from "react";
import { GripVertical, X, Plus, CalendarClock } from "lucide-react";
import { LocationItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/cn";
import { generateId } from "@/lib/id";

interface Props {
  locations: LocationItem[];
  onChange: (locations: LocationItem[]) => void;
}

export function LocationList({ locations, onChange }: Props) {
  const { t } = useI18n();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function updateName(id: string, name: string) {
    onChange(locations.map((l) => (l.id === id ? { ...l, name } : l)));
  }

  function removeLocation(id: string) {
    onChange(locations.filter((l) => l.id !== id));
  }

  function toggleWeekendFlag(id: string) {
    onChange(
      locations.map((l) => (l.id === id ? { ...l, weekendFlag: !l.weekendFlag } : l))
    );
  }

  function addLocation() {
    onChange([...locations, { id: generateId(), name: "" }]);
  }

  function handleDrop() {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...locations];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-2">
      {locations.map((loc, index) => (
        <div
          key={loc.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragEnd={handleDrop}
          className={cn(
            "flex items-center gap-2 bg-white rounded-2xl border border-line/60 px-2 py-1.5 shadow-sm transition-shadow",
            dragIndex === index && "opacity-40",
            overIndex === index && dragIndex !== index && "ring-2 ring-accent/40"
          )}
        >
          <span className="text-ink-faint cursor-grab active:cursor-grabbing px-1 touch-none">
            <GripVertical size={18} />
          </span>
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-light text-accent text-xs font-semibold shrink-0">
            {index + 1}
          </span>
          <Input
            value={loc.name}
            onChange={(e) => updateName(loc.id, e.target.value)}
            placeholder={t("locationPlaceholder")}
            className="bg-transparent border-none focus:bg-transparent px-1 py-2"
          />
          <button
            onClick={() => toggleWeekendFlag(loc.id)}
            aria-label={t("weekendFlagToggle")}
            title={t("weekendFlagToggle")}
            className={cn(
              "p-1.5 rounded-full transition-colors shrink-0",
              loc.weekendFlag ? "text-accent bg-accent-light" : "text-ink-faint hover:text-accent"
            )}
          >
            <CalendarClock size={16} />
          </button>
          {locations.length > 2 && (
            <button
              onClick={() => removeLocation(loc.id)}
              aria-label={t("removeLocation")}
              className="text-ink-faint hover:text-red-500 transition-colors p-1 shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="md"
        onClick={addLocation}
        className="w-full justify-center mt-1"
      >
        <Plus size={16} />
        {t("addLocation")}
      </Button>

      <p className="text-[11px] text-ink-faint text-center pt-0.5">{t("weekendFlagHint")}</p>
    </div>
  );
}
