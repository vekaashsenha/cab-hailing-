"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, CreditCard, Landmark, Smartphone } from "lucide-react";
import { FareBreakupCard } from "@/components/fare-breakup-card";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import {
  createBookingId,
  getPassenger,
  getSelectedCar,
  getTrip,
  saveBooking,
  type CarOption,
  type PassengerDetails,
  type PaymentOption,
  type TripDraft
} from "@/lib/booking";
import { calculateFareBreakup, formatCurrency } from "@/lib/fare";

const paymentOptions: Array<{ label: PaymentOption; icon: typeof CreditCard; copy: string }> = [
  { label: "Card", icon: CreditCard, copy: "Dummy card payment" },
  { label: "UPI", icon: Smartphone, copy: "Dummy UPI intent" },
  { label: "Pay Later", icon: Clock3, copy: "Confirm now, pay later" }
];

export default function PaymentPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [car, setCar] = useState<CarOption | null>(null);
  const [passenger, setPassenger] = useState<PassengerDetails | null>(null);
  const [payment, setPayment] = useState<PaymentOption>("Card");
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setTrip(getTrip());
    setCar(getSelectedCar());
    setPassenger(getPassenger());
  }, []);

  async function payNow() {
    if (!trip || !car || !passenger || isConfirming || !calculateFareBreakup(trip, car).hasDistance) {
      return;
    }

    setIsConfirming(true);

    const booking = {
      bookingId: createBookingId(),
      trip,
      car,
      passenger,
      payment
    };

    saveBooking(booking);

    try {
      const response = await fetch("/api/send-booking-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ booking })
      });

      if (!response.ok) {
        console.error("Booking email notification failed.");
      }
    } catch (error) {
      console.error("Booking email notification failed.", error);
    }

    router.push("/confirmation");
  }

  const amount = trip && car ? calculateFareBreakup(trip, car).totalFare : 0;
  const canPay = Boolean(trip && car && passenger && amount > 0);

  return (
    <PageShell
      eyebrow="Dummy payment"
      title="Choose a payment option"
      copy="This demo does not collect real payment details. Select an option and confirm the booking."
    >
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <TripSummary trip={trip} car={car} />
          <FareBreakupCard trip={trip} car={car} />
          {!canPay ? (
            <Link
              href="/booking"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
            >
              Complete booking
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : null}
        </aside>

        <div className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-col gap-3 border-b border-ink/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-ink/60">Amount payable</p>
              <p className="text-4xl font-semibold">{amount ? formatCurrency(amount) : "--"}</p>
            </div>
            <div className="flex items-center gap-2 rounded bg-mist px-4 py-3 text-sm font-semibold text-ink/70">
              <Landmark className="h-5 w-5 text-ember" />
              Test checkout
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const selected = payment === option.label;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setPayment(option.label)}
                  className={`rounded border p-5 text-left transition ${
                    selected
                      ? "border-ember bg-ember/10 ring-2 ring-ember/20"
                      : "border-ink/10 bg-white hover:border-ember/50"
                  }`}
                >
                  <Icon className="mb-5 h-7 w-7 text-ember" />
                  <span className="block text-lg font-semibold">{option.label}</span>
                  <span className="mt-1 block text-sm text-ink/60">{option.copy}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={payNow}
            disabled={!canPay || isConfirming}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isConfirming ? "Confirming..." : "Pay Now"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}
