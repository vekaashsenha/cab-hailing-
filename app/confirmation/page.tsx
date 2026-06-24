"use client";

import Link from "next/link";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, PhoneCall } from "lucide-react";
import { FareBreakupCard } from "@/components/fare-breakup-card";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import {
  clearBookingState,
  getBooking,
  markBookingCompleted,
  type BookingRecord,
  type OperationsEmailStatus
} from "@/lib/booking";
import { calculateFareBreakup, formatCurrency } from "@/lib/fare";

const PENDING_EMAIL_MESSAGE = "Reservation notification is being sent.";
const LEGACY_PENDING_EMAIL_MESSAGE = "Email request is being sent.";

type SendBookingEmailResponse = {
  ok?: boolean;
  id?: string;
  error?: string;
};

export default function ConfirmationPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const emailRequestStarted = useRef(false);

  useEffect(() => {
    const storedBooking = getBooking();
    if (!storedBooking) {
      return;
    }

    setBooking(storedBooking);

    if (
      storedBooking &&
      storedBooking.paymentStatus === "paid" &&
      shouldSendOperationsEmail(storedBooking.operationsEmailStatus) &&
      !emailRequestStarted.current
    ) {
      emailRequestStarted.current = true;
      void sendOperationsEmail(storedBooking, setBooking);
      return;
    }

    completeAndClearStoredBooking();
  }, []);

  function bookAnotherRide() {
    clearBookingState();
    router.replace("/");
  }

  return (
    <PageShell
      eyebrow="Booking confirmed"
      title="Your chauffeur request is confirmed"
      copy="Your ride details are saved. Our reservation team will take it from here."
    >
      {booking ? (
        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <TripSummary trip={booking.trip} car={booking.car} />
            <FareBreakupCard trip={booking.trip} car={booking.car} />
          </aside>

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
              <Detail label="Payment method" value={booking.payment} />
              <Detail label="Payment status" value={formatPaymentStatus(booking.paymentStatus)} />
              <Detail label="Razorpay payment ID" value={booking.razorpayPaymentId || "Not available"} />
              <Detail label="Razorpay order ID" value={booking.razorpayOrderId || "Not available"} />
              <Detail
                label="Total estimated fare"
                value={formatCurrency(calculateFareBreakup(booking.trip, booking.car).totalFare)}
              />
            </div>

            {booking.passenger.instruction ? (
              <div className="mt-6 rounded bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Special instruction</p>
                <p className="mt-1 text-sm text-ink/75">{booking.passenger.instruction}</p>
              </div>
            ) : null}

            <OperationsEmailStatusPanel status={booking.operationsEmailStatus} />

            <div className="mt-6 flex items-center gap-3 rounded bg-ink p-4 text-white">
              <PhoneCall className="h-5 w-5 flex-none text-gold" />
              <p className="text-sm text-white/80">Keep your phone reachable for driver and duty confirmation.</p>
            </div>

            <button
              type="button"
              onClick={bookAnotherRide}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ember px-5 font-semibold text-white transition hover:bg-ink"
            >
              Book Another Ride
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-ink/10 bg-white p-8 text-center shadow-soft">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-ember" />
          <h2 className="text-2xl font-semibold">No confirmed booking yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
            Complete the booking flow to receive your trip confirmation.
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

function OperationsEmailStatusPanel({ status }: { status?: OperationsEmailStatus }) {
  const sent = status?.sent === true;
  const attempted = status?.attempted === true;
  const isPending =
    attempted &&
    !sent &&
    (status?.errorReason === PENDING_EMAIL_MESSAGE || status?.errorReason === LEGACY_PENDING_EMAIL_MESSAGE);
  const errorReason = getCustomerNotificationStatus(status?.errorReason);

  return (
    <div className="mt-6 rounded bg-mist p-4">
      <div className="flex items-start gap-3">
        <Mail className={`mt-0.5 h-5 w-5 flex-none ${sent ? "text-emerald-700" : "text-ember"}`} />
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">Reservation notification</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink/60">Reservation team notified</dt>
              <dd className="font-semibold text-ink">{sent ? "Yes" : "No"}</dd>
            </div>
            {isPending ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink/60">Status</dt>
                <dd className="max-w-[260px] text-right font-semibold text-ink">Sending...</dd>
              </div>
            ) : null}
            {!sent && !isPending ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="text-ink/60">Status</dt>
                <dd className="max-w-[260px] text-right font-semibold text-ink">{errorReason}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}

function shouldSendOperationsEmail(status?: OperationsEmailStatus) {
  return (
    !status?.attempted ||
    status.errorReason === PENDING_EMAIL_MESSAGE ||
    status.errorReason === LEGACY_PENDING_EMAIL_MESSAGE
  );
}

async function sendOperationsEmail(
  booking: BookingRecord,
  setBooking: Dispatch<SetStateAction<BookingRecord | null>>
) {
  const pendingBooking: BookingRecord = {
    ...booking,
    operationsEmailStatus: {
      attempted: true,
      sent: false,
      errorReason: PENDING_EMAIL_MESSAGE,
      resendId: ""
    }
  };

  setBooking(pendingBooking);

  try {
    const response = await fetch("/api/send-booking-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ booking: pendingBooking })
    });
    const result = await readEmailResponse(response);
    const operationsEmailStatus = getEmailStatusFromResponse(response, result);
    const updatedBooking = {
      ...pendingBooking,
      operationsEmailStatus
    };

    setBooking(updatedBooking);
  } catch (error) {
    console.error("Booking email notification failed.", error);
    const updatedBooking = {
      ...pendingBooking,
      operationsEmailStatus: {
        attempted: true,
        sent: false,
        errorReason: "Reservation notification could not be completed.",
        resendId: ""
      }
    };

    setBooking(updatedBooking);
  } finally {
    completeAndClearStoredBooking();
  }
}

function completeAndClearStoredBooking() {
  clearBookingState();
  markBookingCompleted();
}

async function readEmailResponse(response: Response): Promise<SendBookingEmailResponse | null> {
  try {
    return (await response.json()) as SendBookingEmailResponse;
  } catch {
    return null;
  }
}

function getEmailStatusFromResponse(
  response: Response,
  result: SendBookingEmailResponse | null
): OperationsEmailStatus {
  if (response.ok && result?.ok) {
    return {
      attempted: true,
      sent: true,
      errorReason: "",
      resendId: typeof result.id === "string" ? result.id : ""
    };
  }

  return {
    attempted: true,
    sent: false,
    errorReason: getSafeEmailErrorReason(response.status, result?.error),
    resendId: ""
  };
}

function getSafeEmailErrorReason(status: number, _error?: string) {
  if (status === 500) {
    return "Reservation notification could not be completed.";
  }

  if (status === 502) {
    return "Reservation notification could not be completed.";
  }

  return "Reservation notification could not be completed.";
}

function getCustomerNotificationStatus(errorReason?: string) {
  if (!errorReason || errorReason === "Email request was not recorded for this booking.") {
    return "Reservation notification is pending.";
  }

  if (errorReason === PENDING_EMAIL_MESSAGE || errorReason === LEGACY_PENDING_EMAIL_MESSAGE) {
    return "Sending...";
  }

  if (
    errorReason.toLowerCase().includes("configured") ||
    errorReason.toLowerCase().includes("provider") ||
    errorReason.toLowerCase().includes("payload") ||
    errorReason.toLowerCase().includes("request")
  ) {
    return "Reservation notification could not be completed.";
  }

  return errorReason;
}

function formatPaymentStatus(status: BookingRecord["paymentStatus"]) {
  if (status === "paid") {
    return "Paid";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-mist p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}
