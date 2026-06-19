"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { DailyRentalNote } from "@/components/daily-rental-note";
import { FareBreakupCard } from "@/components/fare-breakup-card";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import {
  getPassenger,
  getSelectedCar,
  getTrip,
  savePassenger,
  type CarOption,
  type PassengerDetails,
  type TripDraft
} from "@/lib/booking";
import { calculateFareBreakup } from "@/lib/fare";

const emptyPassenger: PassengerDetails = {
  fullName: "",
  mobile: "",
  email: "",
  instruction: "",
  mobileOtpStatus: "not_verified"
};

export default function BookingPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [car, setCar] = useState<CarOption | null>(null);
  const [passenger, setPassenger] = useState<PassengerDetails>(emptyPassenger);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTrip(getTrip());
    setCar(getSelectedCar());
    setPassenger(getPassenger() ?? emptyPassenger);
  }, []);

  function updatePassenger<K extends keyof PassengerDetails>(key: K, value: PassengerDetails[K]) {
    setPassenger((current) => ({ ...current, [key]: value }));
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!passenger.fullName.trim() || !passenger.mobile.trim() || !passenger.email.trim()) {
      setMessage("Full name, mobile number, and email are required.");
      return;
    }

    savePassenger({
      fullName: passenger.fullName.trim(),
      mobile: passenger.mobile.trim(),
      email: passenger.email.trim(),
      instruction: passenger.instruction.trim(),
      mobileOtpStatus: "not_verified"
    });
    router.push("/payment");
  }

  const canContinue = Boolean(trip && car && calculateFareBreakup(trip, car).canCalculateFare);
  const canProceedToPayment = canContinue;

  return (
    <PageShell
      eyebrow="Passenger details"
      title="Confirm who is riding"
      copy="Add passenger contact details and any special instructions for the reservation team."
    >
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <TripSummary trip={trip} car={car} />
          <FareBreakupCard trip={trip} car={car} />
          {!canContinue ? (
            <Link
              href={trip ? "/rides" : "/"}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
            >
              {trip ? "Choose a cab" : "Start a search"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : null}
        </aside>

        <form onSubmit={submitBooking} className="rounded border border-ink/10 bg-white p-6 shadow-soft">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <UserRound className="h-4 w-4 text-ember" />
                Full name
              </span>
              <input
                value={passenger.fullName}
                onChange={(event) => updatePassenger("fullName", event.target.value)}
                placeholder="Passenger full name"
                required
                className="h-12 w-full rounded border border-ink/10 px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4 text-ember" />
                Mobile number
              </span>
              <input
                value={passenger.mobile}
                onChange={(event) => updatePassenger("mobile", event.target.value)}
                placeholder="+91 98765 43210"
                required
                className="h-12 w-full rounded border border-ink/10 px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              />
            </label>

            <div className="rounded border border-ink/10 bg-mist p-4 md:col-span-2">
              <p className="text-sm font-semibold">Verify mobile number</p>
              <p className="mt-1 text-sm text-ink/60">Mobile verification will be enabled soon.</p>
            </div>

            <label className="block md:col-span-2">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-ember" />
                Email
              </span>
              <input
                type="email"
                value={passenger.email}
                onChange={(event) => updatePassenger("email", event.target.value)}
                placeholder="name@example.com"
                required
                className="h-12 w-full rounded border border-ink/10 px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="h-4 w-4 text-ember" />
                Special instruction
              </span>
              <textarea
                value={passenger.instruction}
                onChange={(event) => updatePassenger("instruction", event.target.value)}
                placeholder="Flight number, waiting notes, child seat request, or anything else"
                rows={5}
                className="w-full resize-none rounded border border-ink/10 px-4 py-3 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              />
            </label>
          </div>

          {trip?.rideType === "Within City" ? (
            <div className="mt-5">
              <DailyRentalNote />
            </div>
          ) : null}

          {message ? <p className="mt-5 rounded bg-ember/10 px-3 py-2 text-sm text-ember">{message}</p> : null}

          <button
            type="submit"
            disabled={!canProceedToPayment}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            Continue to Payment
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </PageShell>
  );
}
