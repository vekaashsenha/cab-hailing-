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
  type OtpStatus,
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

type OtpApiResponse = {
  ok?: boolean;
  error?: string;
};

export default function BookingPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [car, setCar] = useState<CarOption | null>(null);
  const [passenger, setPassenger] = useState<PassengerDetails>(emptyPassenger);
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpBusy, setIsOtpBusy] = useState(false);

  useEffect(() => {
    setTrip(getTrip());
    setCar(getSelectedCar());
    setPassenger(getPassenger() ?? emptyPassenger);
  }, []);

  function updatePassenger<K extends keyof PassengerDetails>(key: K, value: PassengerDetails[K]) {
    setPassenger((current) => {
      if (key === "mobile" && value !== current.mobile) {
        return {
          ...current,
          mobile: value as string,
          mobileOtpStatus: "not_verified"
        };
      }

      return { ...current, [key]: value };
    });

    if (key === "mobile") {
      setOtpCode("");
    }
  }

  async function sendOtp() {
    setMessage("");

    if (!passenger.mobile.trim()) {
      setMessage("Please enter a mobile number before requesting OTP.");
      return;
    }

    setIsOtpBusy(true);

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mobile: passenger.mobile.trim() })
      });
      const result = (await response.json().catch(() => null)) as OtpApiResponse | null;

      if (response.ok && result?.ok) {
        updatePassenger("mobileOtpStatus", "otp_sent");
        setMessage("OTP sent. Please enter it to verify your mobile number.");
        return;
      }

      setMessage(result?.error || "OTP could not be sent. Please try again.");
    } catch {
      setMessage("OTP could not be sent. Please try again.");
    } finally {
      setIsOtpBusy(false);
    }
  }

  async function verifyOtp() {
    setMessage("");

    if (!otpCode.trim()) {
      setMessage("Please enter the OTP to verify your mobile number.");
      return;
    }

    setIsOtpBusy(true);

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mobile: passenger.mobile.trim(),
          otp: otpCode.trim()
        })
      });
      const result = (await response.json().catch(() => null)) as OtpApiResponse | null;

      if (response.ok && result?.ok) {
        updatePassenger("mobileOtpStatus", "verified");
        setOtpCode("");
        setMessage("Mobile number verified.");
        return;
      }

      setMessage(result?.error || "OTP could not be verified. Please try again.");
    } catch {
      setMessage("OTP could not be verified. Please try again.");
    } finally {
      setIsOtpBusy(false);
    }
  }

  function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!passenger.fullName.trim() || !passenger.mobile.trim() || !passenger.email.trim()) {
      setMessage("Full name, mobile number, and email are required.");
      return;
    }

    if (passenger.mobileOtpStatus !== "verified") {
      setMessage("Please verify the mobile number before continuing to payment.");
      return;
    }

    savePassenger({
      fullName: passenger.fullName.trim(),
      mobile: passenger.mobile.trim(),
      email: passenger.email.trim(),
      instruction: passenger.instruction.trim(),
      mobileOtpStatus: passenger.mobileOtpStatus
    });
    router.push("/payment");
  }

  const canContinue = Boolean(trip && car && calculateFareBreakup(trip, car).canCalculateFare);
  const canProceedToPayment = canContinue && passenger.mobileOtpStatus === "verified";

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Verify mobile number</p>
                  <p className="mt-1 text-sm text-ink/60">OTP status: {formatOtpStatus(passenger.mobileOtpStatus)}</p>
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={!passenger.mobile.trim() || passenger.mobileOtpStatus === "verified" || isOtpBusy}
                  className="inline-flex h-11 items-center justify-center rounded bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
                >
                  {passenger.mobileOtpStatus === "otp_sent" ? "Resend OTP" : "Verify mobile number"}
                </button>
              </div>

              {passenger.mobileOtpStatus === "otp_sent" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    inputMode="numeric"
                    placeholder="Enter OTP"
                    className="h-11 rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={isOtpBusy}
                    className="inline-flex h-11 items-center justify-center rounded bg-ember px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
                  >
                    Confirm OTP
                  </button>
                  {process.env.NODE_ENV === "development" ? (
                    <p className="text-xs text-ink/50 sm:col-span-2">Development OTP: 123456</p>
                  ) : null}
                </div>
              ) : null}
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

function formatOtpStatus(status: OtpStatus) {
  if (status === "verified") {
    return "Verified";
  }

  if (status === "otp_sent") {
    return "OTP sent";
  }

  return "Not verified";
}
