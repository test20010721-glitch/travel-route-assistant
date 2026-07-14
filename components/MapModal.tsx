"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { TransportMode } from "@/lib/types";
import { useI18n } from "@/lib/i18n-context";

const modeToEmbedMode: Record<TransportMode, string> = {
  walking: "walking",
  bicycling: "bicycling",
  transit: "transit",
  driving: "driving",
  driving_free: "driving",
  taxi: "driving",
  flight: "driving",
};

interface Props {
  originAddress: string;
  destinationAddress: string;
  mode: TransportMode;
  onClose: () => void;
}

export function MapModal({ originAddress, destinationAddress, mode, onClose }: Props) {
  const { t } = useI18n();
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const embedUrl = `https://www.google.com/maps/embed/v1/directions?key=${key}&origin=${encodeURIComponent(
    originAddress
  )}&destination=${encodeURIComponent(destinationAddress)}&mode=${modeToEmbedMode[mode]}${
    mode === "driving_free" ? "&avoid=tolls" : ""
  }`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <span className="text-sm font-medium text-ink truncate pr-2">
            {originAddress} → {destinationAddress}
          </span>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-ink-muted hover:text-ink shrink-0 p-1"
          >
            <X size={20} />
          </button>
        </div>
        <iframe
          title="route-map"
          className="w-full h-[70vh] border-0"
          loading="lazy"
          src={embedUrl}
        />
      </div>
    </div>
  );
}
