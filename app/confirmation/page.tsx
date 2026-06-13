"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import { fareForRide, formatFare, getBooking, type BookingRecord } from "@/lib/booking";

export default function ConfirmationPage() {
  const [booking, setBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    setBooking(getBooking());
  }, []);

  return (
    <PageShell
      eyebrow="Booking confirmed"
      title="Your chauffeur request is confirmed"
      copy="Your ride details are saved. Our reservation team will take it from here."
    >
      {booking ? (
        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <TripSummary trip={booking.trip} car={booking.car} />

          <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 flex-none place-items-center rounded bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ember">Confirmed</p>
                <h2 className="mt-2 text-3xl font-semibold">Booking ID {booking.bookingId}</h2>
                <p className="mt-3 leading-7 text-ink/70">
                  Our reservation team will call you shortly to confirm driver details.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 border-t border-ink/10 pt-6 md:grid-cols-2">
              <Detail label="Passenger" value={booking.passenger.fullName} />
              <Detail label="Mobile" value={booking.passenger.mobile} />
              <Detail label="Email" value={booking.passenger.email} />
              <Detail label="Vehicle" value={booking.car.name} />
              <Detail label="Payment option" value={booking.payment} />
              <Detail label="Estimated fare" value={formatFare(fareForRide(booking.car, booking.trip.rideType))} />
            </div>

            {booking.passenger.instruction ? (
              <div className="mt-6 rounded bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Special instruction</p>
                <p className="mt-1 text-sm text-ink/75">{booking.passenger.instruction}</p>
              </div>
            ) : null}

            <div className="mt-6 flex items-center gap-3 rounded bg-ink p-4 text-white">
              <PhoneCall className="h-5 w-5 flex-none text-gold" />
              <p className="text-sm text-white/80">Keep your phone reachable for driver and duty confirmation.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-ember" />
          <h2 className="text-2xl font-semibold">No confirmed booking yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
            Complete the booking flow to generate a dummy booking ID and trip confirmation.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
          >
            Start a booking
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </PageShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-mist p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}
