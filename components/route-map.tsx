"use client";

import { useEffect, useRef, useState } from "react";
import { Route } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";
import type { TripDraft } from "@/lib/booking";

type RouteMapProps = {
  trip: TripDraft | null;
};

export function RouteMap({ trip }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [message, setMessage] = useState("Loading route map...");

  useEffect(() => {
    let active = true;

    if (!trip?.pickup || !trip.dropoff) {
      setStatus("fallback");
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
              setStatus("ready");
            } else {
              setStatus("fallback");
              setMessage("We could not draw this route yet. Your trip details are saved and ride selection still works.");
            }
          }
        );
      })
      .catch(() => {
        if (active) {
          setStatus("fallback");
          setMessage("Add a valid Google Maps API key to show the live route preview.");
        }
      });

    return () => {
      active = false;
    };
  }, [trip]);

  if (status === "fallback") {
    return (
      <div className="map-grid grid min-h-[320px] place-items-center rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
        <div className="max-w-md">
          <Route className="mx-auto mb-4 h-10 w-10 text-ember" />
          <h3 className="text-xl font-semibold">Route preview unavailable</h3>
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
