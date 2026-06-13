"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, CarFront, UsersRound } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { RouteMap } from "@/components/route-map";
import { TripSummary } from "@/components/trip-summary";
import {
  carOptions,
  fareForRide,
  formatFare,
  getTrip,
  saveSelectedCar,
  type CarOption,
  type TripDraft
} from "@/lib/booking";

export default function RidesPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTrip(getTrip());
    setLoaded(true);
  }, []);

  function selectCar(car: CarOption) {
    saveSelectedCar(car);
    router.push("/booking");
  }

  return (
    <PageShell
      eyebrow="Available rides"
      title="Select your cab"
      copy="Review your trip details, preview the route when Google Maps is configured, and choose the right vehicle for the journey."
    >
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <TripSummary trip={trip} />
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
          <RouteMap trip={trip} />

          <div className="grid gap-5 md:grid-cols-2">
            {carOptions.map((car) => {
              const fare = trip ? fareForRide(car, trip.rideType) : car.fare;

              return (
                <article key={car.id} className="overflow-hidden rounded border border-ink/10 bg-white shadow-soft">
                  <img src={car.image} alt={`${car.name} ride option`} className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember">{car.tone}</p>
                    <div className="mt-2 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold">{car.name}</h2>
                        <p className="mt-1 text-sm text-ink/60">Estimated fare</p>
                      </div>
                      <CarFront className="h-7 w-7 text-gold" />
                    </div>
                    <p className="mt-2 text-3xl font-semibold">{formatFare(fare)}</p>
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
                    <button
                      type="button"
                      onClick={() => selectCar(car)}
                      disabled={!trip}
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
