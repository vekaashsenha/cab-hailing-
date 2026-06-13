"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { isMissingGoogleMapsApiKeyError, loadGoogleMaps } from "@/lib/google-maps";

type MapStatus = "loading" | "ready" | "missing-key" | "unavailable";

export function GoogleMapPreview() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");

  useEffect(() => {
    let active = true;

    loadGoogleMaps()
      .then((googleApi) => {
        if (!active || !mapRef.current) {
          return;
        }

        const center = { lat: 28.6139, lng: 77.209 };
        const map = new googleApi.maps.Map(mapRef.current, {
          center,
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] }
          ]
        });

        new googleApi.maps.Marker({
          position: center,
          map,
          title: "Cab Hailing service area"
        });

        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setStatus(isMissingGoogleMapsApiKeyError(error) ? "missing-key" : "unavailable");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "missing-key" || status === "unavailable") {
    const isMissingKey = status === "missing-key";

    return (
      <div className="map-grid grid min-h-[360px] place-items-center rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
        <div className="max-w-md">
          <MapPinned className="mx-auto mb-4 h-10 w-10 text-ember" />
          <h3 className="text-xl font-semibold">
            {isMissingKey ? "Map preview is ready for your API key" : "Map preview is temporarily unavailable"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {isMissingKey ? (
              <>
                Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the live Google Map and Places suggestions.
              </>
            ) : (
              "Google Maps could not load right now. Check API restrictions, billing, and enabled Maps JavaScript and Places APIs."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded border border-ink/10 bg-white shadow-soft">
      {status === "loading" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white text-sm font-medium text-ink/60">
          Loading map...
        </div>
      ) : null}
      <div ref={mapRef} className="h-[360px] w-full" />
    </div>
  );
}
