"use client";

import { useState } from "react";
import { LatLng, TransportMode } from "@/lib/types";
import { buildStaticMapUrl } from "@/lib/mapsUtils";
import { MapModal } from "@/components/MapModal";

interface Props {
  origin: LatLng;
  destination: LatLng;
  encodedPolyline?: string;
  originAddress: string;
  destinationAddress: string;
  mode: TransportMode;
  viewFullscreenLabel: string;
}

export function MapThumbnail({
  origin,
  destination,
  encodedPolyline,
  originAddress,
  destinationAddress,
  mode,
  viewFullscreenLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!hasKey) {
    return (
      <div className="w-full h-32 rounded-xl bg-subtle flex items-center justify-center text-xs text-ink-faint text-center px-4">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map
      </div>
    );
  }

  const staticUrl = buildStaticMapUrl({ origin, destination, encodedPolyline });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full h-32 rounded-xl overflow-hidden group block"
        aria-label={viewFullscreenLabel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={staticUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <span className="absolute bottom-1.5 right-2 text-[11px] text-white bg-black/50 rounded-full px-2 py-0.5">
          {viewFullscreenLabel}
        </span>
      </button>

      {open && (
        <MapModal
          onClose={() => setOpen(false)}
          originAddress={originAddress}
          destinationAddress={destinationAddress}
          mode={mode}
        />
      )}
    </>
  );
}
