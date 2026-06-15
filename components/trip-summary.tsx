import type { ReactNode } from "react";
import { CalendarDays, Clock, MapPin, Route } from "lucide-react";
import { getRideTypeLabel, type CarOption, type TripDraft } from "@/lib/booking";
import { formatDistanceSource, formatKm, getFareRouteKm, getTripDistanceSource } from "@/lib/fare";

type TripSummaryProps = {
  trip: TripDraft | null;
  car?: CarOption | null;
};

export function TripSummary({ trip, car }: TripSummaryProps) {
  if (!trip) {
    return (
      <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold">No trip selected</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Start from the homepage to add pickup, drop, date, and time.
        </p>
      </div>
    );
  }

  const routeKm = getFareRouteKm(trip);
  const distanceSource = getTripDistanceSource(trip);

  return (
    <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">Trip summary</p>
      <div className="mt-5 grid gap-4 text-sm">
        <SummaryRow icon={<MapPin className="h-5 w-5" />} label="Pickup" value={trip.pickup} />
        <SummaryRow icon={<Route className="h-5 w-5" />} label="Drop" value={trip.dropoff} />
        <SummaryRow icon={<CalendarDays className="h-5 w-5" />} label="Date" value={trip.date} />
        <SummaryRow icon={<Clock className="h-5 w-5" />} label="Time" value={trip.time} />
        <div className="rounded bg-mist p-4">
          <p className="font-semibold">{getRideTypeLabel(trip.rideType)}</p>
          {car ? (
            <p className="mt-1 text-ink/70">{car.name} selected</p>
          ) : (
            <p className="mt-1 text-ink/70">Select a vehicle to continue.</p>
          )}
          <p className="mt-2 text-ink/70">
            Distance: {routeKm > 0 ? `${formatKm(routeKm)} (${formatDistanceSource(distanceSource)})` : "Awaiting route or manual KM"}
          </p>
          {trip.rideType === "Outstation" ? (
            <p className="mt-1 text-ink/70">
              {trip.travelDays} day{trip.travelDays === 1 ? "" : "s"} / {trip.travelNights} night
              {trip.travelNights === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-3">
      <span className="mt-1 text-ember">{icon}</span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</span>
        <span className="block break-words text-ink">{value || "Not provided"}</span>
      </span>
    </div>
  );
}
