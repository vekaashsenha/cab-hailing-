"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CarFront, Clock, LocateFixed, MapPin, Search } from "lucide-react";
import {
  dailyRentalPackages,
  emptyTrip,
  getRideTypeLabel,
  getTrip,
  rideTypes,
  saveTrip,
  type TripDraft
} from "@/lib/booking";
import { isReturnDateBeforePickup } from "@/lib/fare";
import {
  getGoogleMapsErrorMessage,
  loadGoogleMaps,
  updateGoogleMapsDebugState
} from "@/lib/google-maps";

export function BookingSearchForm() {
  const router = useRouter();
  const pickupRef = useRef<HTMLInputElement | null>(null);
  const dropoffRef = useRef<HTMLInputElement | null>(null);
  const [trip, setTrip] = useState<TripDraft>(emptyTrip);
  const [message, setMessage] = useState("");

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
            lastErrorMessage: "Location assistance is temporarily unavailable."
          });
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
        } catch (error: unknown) {
          updateGoogleMapsDebugState({
            pickupAutocompleteAttached: false,
            dropAutocompleteAttached: false,
            lastErrorMessage: getGoogleMapsErrorMessage(
              error,
              "Location assistance is temporarily unavailable."
            )
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        updateGoogleMapsDebugState({
          lastErrorMessage: getGoogleMapsErrorMessage(error)
        });
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

  function updatePickupDate(value: string) {
    setTrip((current) => ({
      ...current,
      date: value,
      returnDate: current.returnDate && isReturnDateBeforePickup(value, current.returnDate) ? "" : current.returnDate
    }));
  }

  function updateRideType(value: TripDraft["rideType"]) {
    setTrip((current) => ({
      ...current,
      rideType: value,
      returnDate: value === "Outstation" ? current.returnDate : ""
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!trip.pickup.trim() || !trip.dropoff.trim() || !trip.date || !trip.time) {
      setMessage("Please enter pickup, drop, date, and time to search rides.");
      return;
    }

    if (trip.rideType === "Outstation" && !trip.returnDate) {
      setMessage("Please select a return date for outstation rides.");
      return;
    }

    if (trip.rideType === "Outstation" && isReturnDateBeforePickup(trip.date, trip.returnDate)) {
      setMessage("Return date cannot be earlier than pickup date.");
      return;
    }

    saveTrip({
      ...trip,
      pickup: trip.pickup.trim(),
      dropoff: trip.dropoff.trim(),
      returnDate: trip.rideType === "Outstation" ? trip.returnDate : "",
      routeKm: null,
      manualKm: null
    });
    router.push("/rides");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded bg-white p-5 text-ink shadow-soft sm:p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">Book your ride</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">Where should we pick you up?</h2>
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
              Pickup date
            </span>
            <input
              type="date"
              value={trip.date}
              onChange={(event) => updatePickupDate(event.target.value)}
              required
              className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
            />
          </label>

          {trip.rideType === "Outstation" ? (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-ember" />
                Return date
              </span>
              <input
                type="date"
                value={trip.returnDate}
                min={trip.date || undefined}
                onChange={(event) => updateTrip("returnDate", event.target.value)}
                required
                className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-ember" />
              Time
            </span>
            <input
              type="time"
              value={trip.time}
              onChange={(event) => updateTrip("time", event.target.value)}
              required
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
            onChange={(event) => updateRideType(event.target.value as TripDraft["rideType"])}
            className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          >
            {rideTypes.map((type) => (
              <option key={type} value={type}>
                {getRideTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>

        {trip.rideType === "Within City" ? (
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-ember" />
              Daily Rental Package
            </span>
            <select
              value={trip.dailyRentalPackageId}
              onChange={(event) => updateTrip("dailyRentalPackageId", event.target.value as TripDraft["dailyRentalPackageId"])}
              className="h-12 w-full rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
            >
              {dailyRentalPackages.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
