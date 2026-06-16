"use client";

import { useEffect, useRef, useState } from "react";
import { Route } from "lucide-react";
import {
  getGoogleMapsErrorMessage,
  getGoogleMapsFailureReason,
  loadGoogleMaps,
  updateGoogleMapsDebugState
} from "@/lib/google-maps";
import type { TripDraft } from "@/lib/booking";

type RouteMapProps = {
  trip: TripDraft | null;
  onDistanceResolved?: (routeKm: number) => void;
};

export function RouteMap({ trip, onDistanceResolved }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [message, setMessage] = useState("Loading route map...");
  const [fallbackTitle, setFallbackTitle] = useState("Route preview unavailable");

  useEffect(() => {
    let active = true;

    if (!trip?.pickup || !trip.dropoff) {
      setStatus("fallback");
      setFallbackTitle("Route preview unavailable");
      setMessage("Enter pickup and drop locations on the homepage to preview a route.");
      return () => {
        active = false;
      };
    }

    setStatus("loading");
    setMessage("Loading route map...");

    loadGoogleMaps()
      .then((googleApi) => {
        if (!active || !mapRef.current) {
          return;
        }

        const map = new googleApi.maps.Map(mapRef.current, {
          center: { lat: 28.6139, lng: 77.209 },
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true
        });
        const directionsService = new googleApi.maps.DirectionsService();
        const directionsRenderer = new googleApi.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: "#E66A3C",
            strokeWeight: 5
          }
        });

        directionsService.route(
          {
            origin: trip.pickup,
            destination: trip.dropoff,
            travelMode: googleApi.maps.TravelMode.DRIVING
          },
          (result, routeStatus) => {
            if (!active) {
              return;
            }

            if (routeStatus === googleApi.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
              const routeMeters =
                result.routes[0]?.legs.reduce((total, leg) => total + (leg.distance?.value ?? 0), 0) ?? 0;
              if (routeMeters > 0) {
                onDistanceResolved?.(routeMeters / 1000);
              }
              setStatus("ready");
            } else {
              setStatus("fallback");
              setFallbackTitle("Route preview unavailable");
              setMessage("Route assistance is temporarily unavailable. You can continue by entering estimated KM manually.");
            }
          }
        );
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const reason = getGoogleMapsFailureReason(error);
        setStatus("fallback");
        setFallbackTitle(getRouteMapStatusTitle(reason));
        setMessage(getRouteMapStatusMessage(reason));
        updateGoogleMapsDebugState({
          lastErrorMessage: getGoogleMapsErrorMessage(error)
        });
      });

    return () => {
      active = false;
    };
  }, [onDistanceResolved, trip]);

  if (status === "fallback") {
    return (
      <div className="map-grid grid min-h-[320px] place-items-center rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
        <div className="max-w-md">
          <Route className="mx-auto mb-4 h-10 w-10 text-ember" />
          <h3 className="text-xl font-semibold">{fallbackTitle}</h3>
          <p className="mt-3 text-sm leading-6 text-ink/70">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded border border-ink/10 bg-white shadow-soft">
      {status === "loading" ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white text-sm font-medium text-ink/60">
          {message}
        </div>
      ) : null}
      <div ref={mapRef} className="h-[320px] w-full" />
    </div>
  );
}

function getRouteMapStatusTitle(reason: ReturnType<typeof getGoogleMapsFailureReason>) {
  switch (reason) {
    case "key-missing":
    case "script-failed":
    case "places-unavailable":
      return "Route preview unavailable";
    default:
      return "Route preview unavailable";
  }
}

function getRouteMapStatusMessage(reason: ReturnType<typeof getGoogleMapsFailureReason>) {
  switch (reason) {
    case "key-missing":
    case "script-failed":
    case "places-unavailable":
      return "Location assistance is temporarily unavailable. You can continue by entering estimated KM manually.";
    default:
      return "Location assistance is temporarily unavailable. You can continue by entering estimated KM manually.";
  }
}
