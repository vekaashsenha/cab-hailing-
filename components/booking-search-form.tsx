"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CarFront, Clock, LocateFixed, MapPin, Search } from "lucide-react";
import { emptyTrip, getTrip, rideTypes, saveTrip, type TripDraft } from "@/lib/booking";
import { GoogleMapsDebugPanel } from "@/components/google-maps-debug-panel";
import {
  getGoogleMapsErrorMessage,
  getGoogleMapsFailureReason,
  loadGoogleMaps,
  updateGoogleMapsDebugState
} from "@/lib/google-maps";

const showMapsDebugPanel = process.env.NODE_ENV !== "production";

type MapsAutocompleteStatus =
  | "loading"
  | "ready"
  | "key-missing"
  | "script-failed"
  | "places-unavailable"
  | "autocomplete-failed";

export function BookingSearchForm() {
  const router = useRouter();
  const pickupRef = useRef<HTMLInputElement | null>(null);
  const dropoffRef = useRef<HTMLInputElement | null>(null);
  const [trip, setTrip] = useState<TripDraft>(emptyTrip);
  const [message, setMessage] = useState("");
  const [mapsStatus, setMapsStatus] = useState<MapsAutocompleteStatus>("loading");

  useEffect(() => {
    const savedTrip = getTrip();
    if (savedTrip) {
      setTrip(savedTrip);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let pickupAutocomplete: google.maps.places.Autocomplete | null = null;
    let dropoffAutocomplete: google.maps.places.Autocomplete | null = null;

    updateGoogleMapsDebugState({
      pickupAutocompleteAttached: false,
      dropAutocompleteAttached: false
    });

    loadGoogleMaps()
      .then((googleApi) => {
        if (!active || !pickupRef.current || !dropoffRef.current) {
          updateGoogleMapsDebugState({
            pickupAutocompleteAttached: false,
            dropAutocompleteAttached: false,
            lastErrorMessage: "Homepage pickup and drop input refs were not ready."
          });
          setMapsStatus("autocomplete-failed");
          return;
        }

        try {
          const options: google.maps.places.AutocompleteOptions = {
            fields: ["formatted_address", "name", "geometry"]
          };
          pickupAutocomplete = new googleApi.maps.places.Autocomplete(pickupRef.current, options);
          dropoffAutocomplete = new googleApi.maps.places.Autocomplete(dropoffRef.current, options);

          pickupAutocomplete.addListener("place_changed", () => {
            const place = pickupAutocomplete?.getPlace();
            const value = place?.formatted_address || place?.name || pickupRef.current?.value || "";
            setTrip((current) => ({ ...current, pickup: value }));
          });

          dropoffAutocomplete.addListener("place_changed", () => {
            const place = dropoffAutocomplete?.getPlace();
            const value = place?.formatted_address || place?.name || dropoffRef.current?.value || "";
            setTrip((current) => ({ ...current, dropoff: value }));
          });

          updateGoogleMapsDebugState({
            pickupAutocompleteAttached: true,
            dropAutocompleteAttached: true,
            lastErrorMessage: ""
          });
          setMapsStatus("ready");
        } catch (error: unknown) {
          updateGoogleMapsDebugState({
            pickupAutocompleteAttached: false,
            dropAutocompleteAttached: false,
            lastErrorMessage: getGoogleMapsErrorMessage(
              error,
              "Google Places Autocomplete could not attach to the pickup and drop inputs."
            )
          });
          setMapsStatus("autocomplete-failed");
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setMapsStatus(getGoogleMapsFailureReason(error));
      });

    return () => {
      active = false;
      if (pickupAutocomplete) {
        window.google?.maps.event?.clearInstanceListeners(pickupAutocomplete);
      }
      if (dropoffAutocomplete) {
        window.google?.maps.event?.clearInstanceListeners(dropoffAutocomplete);
      }
      updateGoogleMapsDebugState({
        pickupAutocompleteAttached: false,
        dropAutocompleteAttached: false
      });
    };
  }, []);

  function updateTrip<K extends keyof TripDraft>(key: K, value: TripDraft[K]) {
    setTrip((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!trip.pickup.trim() || !trip.dropoff.trim() || !trip.date || !trip.time) {
      setMessage("Please enter pickup, drop, date, and time to search rides.");
      return;
    }

    saveTrip({
      ...trip,
      pickup: trip.pickup.trim(),
      dropoff: trip.dropoff.trim()
    });
    router.push("/rides");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded bg-white p-5 text-ink shadow-soft sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">Book your ride</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">Where should we pick you up?</h2>
        <p className="mt-2 text-sm text-ink/60">
          {getAutocompleteStatusMessage(mapsStatus)}
        </p>
        {showMapsDebugPanel ? <GoogleMapsDebugPanel /> : null}
      </div>

      <div className="grid gap-4">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <LocateFixed className="h-4 w-4 text-ember" />
            Pickup location
          </span>
          <input
            ref={pickupRef}
            value={trip.pickup}
            onChange={(event) => updateTrip("pickup", event.target.value)}
            autoComplete="off"
            placeholder="Enter pickup address"
            className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-ember" />
            Drop location
          </span>
          <input
            ref={dropoffRef}
            value={trip.dropoff}
            onChange={(event) => updateTrip("dropoff", event.target.value)}
            autoComplete="off"
            placeholder="Enter drop address"
            className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-ember" />
              Date
            </span>
            <input
              type="date"
              value={trip.date}
              onChange={(event) => updateTrip("date", event.target.value)}
              className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-ember" />
              Time
            </span>
            <input
              type="time"
              value={trip.time}
              onChange={(event) => updateTrip("time", event.target.value)}
              className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CarFront className="h-4 w-4 text-ember" />
            Ride type
          </span>
          <select
            value={trip.rideType}
            onChange={(event) => updateTrip("rideType", event.target.value as TripDraft["rideType"])}
            className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          >
            {rideTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      {message ? <p className="mt-4 rounded bg-ember/10 px-3 py-2 text-sm text-ember">{message}</p> : null}

      <button
        type="submit"
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
      >
        <Search className="h-5 w-5" />
        Search Ride
        <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );
}

function getAutocompleteStatusMessage(status: MapsAutocompleteStatus) {
  switch (status) {
    case "ready":
      return "Places suggestions are enabled.";
    case "key-missing":
      return "Google Maps key is missing. Enter addresses manually until NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.";
    case "script-failed":
      return "Google Maps script failed to load. Enter addresses manually for now.";
    case "places-unavailable":
      return "Google Places is unavailable. Enable the Places library and enter addresses manually for now.";
    case "autocomplete-failed":
      return "Google Places Autocomplete could not attach to the pickup and drop inputs.";
    case "loading":
    default:
      return "Loading Google Places suggestions.";
  }
}
