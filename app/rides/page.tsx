"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, CarFront, UsersRound } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { RouteMap } from "@/components/route-map";
import { TripSummary } from "@/components/trip-summary";
import {
  carOptions,
  getTrip,
  saveTrip,
  saveSelectedCar,
  type CarOption,
  type TripDraft
} from "@/lib/booking";
import {
  calculateFareBreakup,
  formatCurrency,
  formatKm,
  getFareBreakupRows,
  getFareRouteKm,
  getOutstationCalendarDays,
  getOutstationMinimumKm,
  getOutstationNights,
  roundKm
} from "@/lib/fare";

export default function RidesPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTrip(getTrip());
    setLoaded(true);
  }, []);

  const updateTrip = useCallback((patch: Partial<TripDraft>) => {
    setTrip((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, ...patch };
      const unchanged = Object.entries(patch).every(([key, value]) => current[key as keyof TripDraft] === value);

      if (unchanged) {
        return current;
      }

      saveTrip(next);
      return next;
    });
  }, []);

  const handleDistanceResolved = useCallback(
    (routeKm: number) => {
      updateTrip({ routeKm: roundKm(routeKm) });
    },
    [updateTrip]
  );

  function selectCar(car: CarOption) {
    if (!trip) {
      return;
    }

    const breakup = calculateFareBreakup(trip, car);

    if (!breakup.hasValidOutstationDates) {
      setMessage("Select a valid return date before choosing a vehicle.");
      return;
    }

    if (!breakup.hasDistance) {
      setMessage("Enter estimated KM to calculate the fare before selecting a vehicle.");
      return;
    }

    setMessage("");
    saveSelectedCar(car);
    router.push("/booking");
  }

  return (
    <PageShell
      eyebrow="Available rides"
      title="Select your cab"
      copy="Review your trip details, confirm the journey distance, and choose the right vehicle for the journey."
    >
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <TripSummary trip={trip} />
          <TripDistanceControls trip={trip} onChange={updateTrip} />
          {!trip && loaded ? (
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
            >
              Start a search
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : null}
        </aside>

        <div className="space-y-8">
          <RouteMap trip={trip} onDistanceResolved={handleDistanceResolved} />

          {message ? <p className="rounded bg-ember/10 px-4 py-3 text-sm text-ember">{message}</p> : null}

          <div className="grid gap-5 md:grid-cols-2">
            {carOptions.map((car) => {
              const breakup = trip ? calculateFareBreakup(trip, car) : null;
              const rows = breakup ? getFareBreakupRows(breakup) : [];

              return (
                <article key={car.id} className="overflow-hidden rounded border border-ink/10 bg-white shadow-soft">
                  <img src={car.image} alt={`${car.name} ride option`} className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember">{car.tone}</p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold">{car.name}</h2>
                        <p className="mt-1 text-sm text-ink/60">{formatCurrency(car.ratePerKm)} / KM</p>
                      </div>
                      <CarFront className="h-7 w-7 text-gold" />
                    </div>
                    <p className="mt-2 text-3xl font-semibold">
                      {breakup?.canCalculateFare ? formatCurrency(breakup.totalFare) : "--"}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-ink/70">
                      <span className="flex items-center gap-2 rounded bg-mist px-3 py-2">
                        <UsersRound className="h-4 w-4 text-ember" />
                        {car.seats} seats
                      </span>
                      <span className="flex items-center gap-2 rounded bg-mist px-3 py-2">
                        <Briefcase className="h-4 w-4 text-ember" />
                        {car.luggage} luggage
                      </span>
                    </div>
                    {breakup ? (
                      <dl className="mt-5 grid gap-2 text-sm">
                        {rows.map((row) => (
                          <div key={row.label} className="flex items-start justify-between gap-4 rounded bg-mist px-3 py-2">
                            <dt className="text-ink/60">{row.label}</dt>
                            <dd className={`text-right ${row.emphasis ? "font-semibold text-ink" : "text-ink/80"}`}>
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => selectCar(car)}
                      disabled={!trip || !breakup?.canCalculateFare}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
                    >
                      Select
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function TripDistanceControls({
  trip,
  onChange
}: {
  trip: TripDraft | null;
  onChange: (patch: Partial<TripDraft>) => void;
}) {
  if (!trip) {
    return null;
  }

  const routeKm = getFareRouteKm(trip);
  const calendarDays = getOutstationCalendarDays(trip);
  const nights = getOutstationNights(trip);
  const minimumKm = getOutstationMinimumKm(trip);

  function updateManualKm(value: string) {
    const nextValue = Number(value);
    onChange({ manualKm: Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null });
  }

  return (
    <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">Distance and billing</p>
      <div className="mt-4 space-y-4">
        <div className="rounded bg-mist p-4 text-sm">
          <p className="text-ink/60">Estimated route KM</p>
          <p className="mt-1 text-lg font-semibold">{routeKm > 0 ? formatKm(routeKm) : "Not available yet"}</p>
          <p className="mt-1 text-ink/60">
            {trip.routeKm ? "Route distance calculated." : "Enter estimated KM below if you want to adjust the distance."}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Manual estimated KM</span>
          <input
            type="number"
            min="1"
            step="0.1"
            value={trip.manualKm ?? ""}
            onChange={(event) => updateManualKm(event.target.value)}
            placeholder="Enter estimated KM"
            className="h-12 w-full rounded border border-ink/10 px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
          />
        </label>

        {trip.rideType === "Outstation" ? (
          <div className="rounded bg-mist p-4 text-sm">
            <p className="font-semibold">Outstation calendar billing</p>
            <dl className="mt-3 grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/60">Calendar days</dt>
                <dd className="font-semibold">{calendarDays > 0 ? calendarDays : "Return date needed"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/60">Nights</dt>
                <dd className="font-semibold">{calendarDays > 0 ? nights : "Return date needed"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink/60">Minimum KM</dt>
                <dd className="font-semibold">{minimumKm > 0 ? formatKm(minimumKm) : "Return date needed"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}
