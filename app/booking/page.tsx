"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, MessageSquareText, Phone, ShieldCheck, UserRound } from "lucide-react";
import { DailyRentalNote } from "@/components/daily-rental-note";
import { FareBreakupCard } from "@/components/fare-breakup-card";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import {
  formatMobileVerificationStatus,
  getPassenger,
  getSelectedCar,
  getTrip,
  savePassenger,
  type CarOption,
  type PassengerDetails,
  type TripDraft
} from "@/lib/booking";
import { calculateFareBreakup } from "@/lib/fare";
import {
  resetRecaptchaVerifier,
  signInWithPhoneNumber,
  type FirebaseConfirmationResult
} from "@/lib/firebase";

const recaptchaContainerId = "firebase-phone-recaptcha";

const emptyPassenger: PassengerDetails = {
  fullName: "",
  mobile: "",
  email: "",
  instruction: "",
  mobileOtpStatus: "not_verified",
  mobileVerified: false
};

export default function BookingPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [car, setCar] = useState<CarOption | null>(null);
  const [passenger, setPassenger] = useState<PassengerDetails>(emptyPassenger);
  const [message, setMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const confirmationResultRef = useRef<FirebaseConfirmationResult | null>(null);

  useEffect(() => {
    setTrip(getTrip());
    setCar(getSelectedCar());
    setPassenger(getPassenger() ?? emptyPassenger);

    return () => resetRecaptchaVerifier();
  }, []);

  function updatePassenger<K extends keyof PassengerDetails>(key: K, value: PassengerDetails[K]) {
    setPassenger((current) => {
      if (key === "mobile" && value !== current.mobile) {
        return {
          ...current,
          mobile: value as string,
          mobileOtpStatus: "not_verified",
          mobileVerified: false
        };
      }

      return { ...current, [key]: value };
    });

    if (key === "mobile") {
      confirmationResultRef.current = null;
      setOtpCode("");
      setOtpMessage("");
      resetRecaptchaVerifier();
    }
  }

  async function sendMobileOtp() {
    setOtpMessage("");
    const formattedPhoneNumber = formatIndianPhoneNumber(passenger.mobile);

    if (!formattedPhoneNumber) {
      setOtpMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSendingOtp(true);

    try {
      const confirmationResult = await signInWithPhoneNumber(formattedPhoneNumber, recaptchaContainerId);
      confirmationResultRef.current = confirmationResult;
      setPassenger((current) => ({
        ...current,
        mobile: formattedPhoneNumber,
        mobileOtpStatus: "otp_sent",
        mobileVerified: false
      }));
      setOtpMessage("OTP sent. Please enter the code to verify your mobile number.");
    } catch (error) {
      console.warn("Firebase phone OTP could not be sent.", {
        error: getSafeOtpConsoleMessage(error)
      });
      confirmationResultRef.current = null;
      resetRecaptchaVerifier();
      setOtpMessage("We could not send the OTP right now. You can continue booking.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function verifyMobileOtp() {
    setOtpMessage("");

    if (!confirmationResultRef.current) {
      setOtpMessage("Please request an OTP before verifying.");
      return;
    }

    if (!otpCode.trim()) {
      setOtpMessage("Please enter the OTP sent to your mobile number.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      await confirmationResultRef.current.confirm(otpCode.trim());
      confirmationResultRef.current = null;
      setPassenger((current) => ({
        ...current,
        mobileOtpStatus: "verified",
        mobileVerified: true
      }));
      setOtpCode("");
      setOtpMessage("Mobile verified.");
      resetRecaptchaVerifier();
    } catch (error) {
      console.warn("Firebase phone OTP could not be verified.", {
        error: getSafeOtpConsoleMessage(error)
      });
      setOtpMessage("The OTP could not be verified. Please check the code and try again, or continue booking.");
    } finally {
      setIsVerifyingOtp(false);
    }
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
      mobileOtpStatus: passenger.mobileVerified ? "verified" : passenger.mobileOtpStatus,
      mobileVerified: passenger.mobileVerified
    });
    router.push("/payment");
  }

  const canContinue = Boolean(trip && car && calculateFareBreakup(trip, car).canCalculateFare);
  const canProceedToPayment = canContinue;
  const otpStatusLabel = formatMobileVerificationStatus(passenger);

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
                  <p className="mt-1 flex items-center gap-2 text-sm text-ink/60">
                    {passenger.mobileVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-ember" />
                    )}
                    Status: {passenger.mobileOtpStatus === "otp_sent" ? "OTP sent" : otpStatusLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendMobileOtp}
                  disabled={!passenger.mobile.trim() || passenger.mobileVerified || isSendingOtp || isVerifyingOtp}
                  className="inline-flex h-11 items-center justify-center rounded bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
                >
                  {isSendingOtp ? "Sending OTP..." : passenger.mobileOtpStatus === "otp_sent" ? "Resend OTP" : "Verify Mobile"}
                </button>
              </div>

              {passenger.mobileOtpStatus === "otp_sent" && !passenger.mobileVerified ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter OTP"
                    className="h-11 rounded border border-ink/10 bg-white px-4 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
                  />
                  <button
                    type="button"
                    onClick={verifyMobileOtp}
                    disabled={isVerifyingOtp}
                    className="inline-flex h-11 items-center justify-center rounded bg-ember px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/35"
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              ) : null}

              <div id={recaptchaContainerId} className="mt-3" />
              <p className="mt-3 text-sm text-ink/60">
                Mobile verification is currently in testing and will be made mandatory soon.
              </p>
              {otpMessage ? <p className="mt-3 rounded bg-white px-3 py-2 text-sm text-ink/70">{otpMessage}</p> : null}
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

function formatIndianPhoneNumber(value: string) {
  const compact = value.replace(/[^\d+]/g, "");

  if (/^\+91[6-9]\d{9}$/.test(compact)) {
    return compact;
  }

  const digits = value.replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

function getSafeOtpConsoleMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 180);
  }

  return "Phone verification failed.";
}
