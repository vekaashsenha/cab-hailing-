import { Briefcase, UsersRound } from "lucide-react";
import { carOptions } from "@/lib/booking";
import { formatCurrency } from "@/lib/fare";

export function FleetPreview() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">
              Fleet preview
            </p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Choose the right cabin.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-ink/70">
            From efficient sedans to luxury chauffeur cars, every option is maintained for comfort and checked before duty.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {carOptions.map((car) => (
            <article key={car.id} className="overflow-hidden rounded border border-ink/10 bg-white shadow-soft">
              <img src={car.image} alt={`${car.name} cab`} className="h-44 w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember">{car.tone}</p>
                <h3 className="mt-2 text-xl font-semibold">{car.name}</h3>
                <div className="mt-4 flex gap-4 text-sm text-ink/70">
                  <span className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-gold" />
                    {car.seats} seats
                  </span>
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gold" />
                    {car.luggage} bags
                  </span>
                </div>
                <p className="mt-4 text-sm text-ink/60">Rate per KM</p>
                <p className="text-2xl font-semibold">{formatCurrency(car.ratePerKm)} / KM</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
