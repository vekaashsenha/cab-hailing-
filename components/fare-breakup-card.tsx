import type { CarOption, TripDraft } from "@/lib/booking";
import { calculateFareBreakup, getFareBreakupRows } from "@/lib/fare";

type FareBreakupCardProps = {
  trip: TripDraft | null;
  car: CarOption | null;
  title?: string;
};

export function FareBreakupCard({ trip, car, title = "Fare breakup" }: FareBreakupCardProps) {
  if (!trip || !car) {
    return (
      <div className="rounded border border-ink/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">{title}</p>
        <p className="mt-3 text-sm leading-6 text-ink/70">Select trip details and vehicle to see KM-based pricing.</p>
      </div>
    );
  }

  const breakup = calculateFareBreakup(trip, car);
  const rows = getFareBreakupRows(breakup);
  const missingMessage = !breakup.hasValidOutstationDates
    ? "Select a valid return date on the homepage to calculate the outstation fare."
    : "Google Maps distance is not available yet. Enter estimated KM on the rides page to continue.";

  return (
    <div className="rounded border border-ink/10 bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">{title}</p>
      {!breakup.canCalculateFare ? (
        <p className="mt-3 rounded bg-ember/10 px-3 py-2 text-sm text-ember">
          {missingMessage}
        </p>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 rounded bg-mist px-3 py-2">
            <dt className="text-ink/60">{row.label}</dt>
            <dd className={`text-right ${row.emphasis ? "text-lg font-semibold text-ink" : "font-semibold text-ink"}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
