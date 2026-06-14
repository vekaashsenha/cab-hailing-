"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import {
  getGoogleMapsErrorMessage,
  getGoogleMapsFailureReason,
  loadGoogleMaps,
  updateGoogleMapsDebugState
} from "@/lib/google-maps";

type MapStatus = "loading" | "ready" | "key-missing" | "script-failed" | "places-unavailable";

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

        setStatus(getGoogleMapsFailureReason(error));
        updateGoogleMapsDebugState({
          lastErrorMessage: getGoogleMapsErrorMessage(error)
        });
      });

    return () => {
      active = false;
    };
  }, []);

  if (status !== "loading" && status !== "ready") {
    return (
      <div className="map-grid grid min-h-[360px] place-items-center rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
        <div className="max-w-md">
          <MapPinned className="mx-auto mb-4 h-10 w-10 text-ember" />
          <h3 className="text-xl font-semibold">{getMapStatusTitle(status)}</h3>
          <p className="mt-3 text-sm leading-6 text-ink/70">{getMapStatusMessage(status)}</p>
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

function getMapStatusTitle(status: MapStatus) {
  switch (status) {
    case "key-missing":
      return "Google Maps key missing";
    case "script-failed":
      return "Google Maps script failed";
    case "places-unavailable":
      return "Google Places unavailable";
    case "loading":
    case "ready":
    default:
      return "Map preview";
  }
}

function getMapStatusMessage(status: MapStatus) {
  switch (status) {
    case "key-missing":
      return "Google Maps key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.";
    case "script-failed":
      return "Google Maps script failed to load. Check network access, billing, and API key restrictions.";
    case "places-unavailable":
      return "Google Places is unavailable. Make sure the Places API is enabled for this key.";
    case "loading":
    case "ready":
    default:
      return "";
  }
}
