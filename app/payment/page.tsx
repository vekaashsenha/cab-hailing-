"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, Landmark, RotateCcw, ShieldCheck } from "lucide-react";
import { DailyRentalNote } from "@/components/daily-rental-note";
import { FareBreakupCard } from "@/components/fare-breakup-card";
import { PageShell } from "@/components/page-shell";
import { TripSummary } from "@/components/trip-summary";
import {
  createBookingId,
  clearBookingDraft,
  getPassenger,
  getSelectedCar,
  getTrip,
  saveBooking,
  type BookingRecord,
  type CarOption,
  type OperationsEmailStatus,
  type PassengerDetails,
  type TripDraft
} from "@/lib/booking";
import { calculateFareBreakup, formatCurrency } from "@/lib/fare";

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const razorpayPublicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

type RazorpayOrderResponse = {
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
};

type SendBookingEmailResponse = {
  ok?: boolean;
  id?: string;
  error?: string;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export default function PaymentPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDraft | null>(null);
  const [car, setCar] = useState<CarOption | null>(null);
  const [passenger, setPassenger] = useState<PassengerDetails | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTrip(getTrip());
    setCar(getSelectedCar());
    setPassenger(getPassenger());
  }, []);

  async function payNow() {
    if (!trip || !car || !passenger || isConfirming) {
      return;
    }

    const fare = calculateFareBreakup(trip, car);

    if (!fare.canCalculateFare || fare.totalFare <= 0) {
      setMessage("Fare could not be calculated. Please review your trip and try again.");
      return;
    }

    if (!razorpayPublicKeyId) {
      setMessage("Online payment is temporarily unavailable. Please try again shortly.");
      return;
    }

    setIsConfirming(true);
    setMessage("");

    const bookingId = createBookingId();

    try {
      const order = await createRazorpayOrder(fare.totalFare, bookingId);
      const checkoutLoaded = await loadRazorpayScript();

      if (!checkoutLoaded) {
        throw new Error("The payment window is temporarily unavailable. Please retry.");
      }

      const paymentResult = await openRazorpayCheckout({
        order,
        bookingId,
        amountInInr: fare.totalFare,
        passenger
      });

      const booking: BookingRecord = {
        bookingId,
        trip,
        car,
        passenger,
        payment: "Razorpay",
        paymentStatus: "paid",
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpaySignature: paymentResult.razorpay_signature,
        paymentErrorReason: "",
        operationsEmailStatus: {
          attempted: false,
          sent: false,
          errorReason: "Reservation notification has not completed yet.",
          resendId: ""
        }
      };

      saveBooking(booking);

      const operationsEmailStatus = await sendBookingEmail(booking);
      saveBooking({
        ...booking,
        operationsEmailStatus
      });
      clearBookingDraft();

      router.push("/confirmation");
    } catch (error) {
      setMessage(getSafeErrorMessage(error));
      setIsConfirming(false);
    }
  }

  const amount = trip && car ? calculateFareBreakup(trip, car).totalFare : 0;
  const canPay = Boolean(trip && car && passenger && amount > 0);

  return (
    <PageShell
      eyebrow="Secure test payment"
      title="Pay with Razorpay"
      copy="Complete the test checkout to confirm your chauffeur booking."
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
              Secure checkout
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-ink/10 bg-mist p-5">
              <CreditCard className="mb-5 h-7 w-7 text-ember" />
              <span className="block text-lg font-semibold">Razorpay Checkout</span>
              <span className="mt-1 block text-sm leading-6 text-ink/60">
                Pay online using cards, UPI, wallets, and other supported methods.
              </span>
            </div>
            <div className="rounded border border-ink/10 bg-mist p-5">
              <ShieldCheck className="mb-5 h-7 w-7 text-emerald-700" />
              <span className="block text-lg font-semibold">Payment after fare lock</span>
              <span className="mt-1 block text-sm leading-6 text-ink/60">
                Your booking is confirmed only after a successful payment.
              </span>
            </div>
          </div>

          {trip?.rideType === "Within City" ? (
            <div className="mt-5">
              <DailyRentalNote />
            </div>
          ) : null}

          {message ? (
            <p className="mt-5 rounded bg-ember/10 px-3 py-2 text-sm text-ember">{message}</p>
          ) : null}

          <button
            type="button"
            onClick={payNow}
            disabled={!canPay || isConfirming}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-ink/35"
          >
            {isConfirming ? "Opening Razorpay..." : message ? "Retry Payment" : "Pay Now"}
            {message ? <RotateCcw className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

async function createRazorpayOrder(amount: number, bookingId: string) {
  const response = await fetch("/api/create-razorpay-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount, bookingId })
  });
  const result = (await response.json().catch(() => null)) as RazorpayOrderResponse | null;

  if (!response.ok || !result?.orderId || !result.amount || !result.currency) {
    throw new Error(result?.error || "Payment could not be started. Please retry.");
  }

  return {
    orderId: result.orderId,
    amount: result.amount,
    currency: result.currency,
    keyId: result.keyId || ""
  };
}

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_CHECKOUT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

function openRazorpayCheckout({
  order,
  bookingId,
  amountInInr,
  passenger
}: {
  order: Awaited<ReturnType<typeof createRazorpayOrder>>;
  bookingId: string;
  amountInInr: number;
  passenger: PassengerDetails;
}) {
  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("The payment window is temporarily unavailable. Please retry."));
      return;
    }

    let completed = false;
    const fail = (message: string) => {
      if (completed) {
        return;
      }

      completed = true;
      reject(new Error(message));
    };

    const checkout = new window.Razorpay({
      key: razorpayPublicKeyId,
      amount: order.amount,
      currency: order.currency,
      name: "Cab Hailing",
      description: `Booking ${bookingId} - ${formatCurrency(amountInInr)}`,
      order_id: order.orderId,
      prefill: {
        name: passenger.fullName,
        email: passenger.email,
        contact: passenger.mobile
      },
      notes: {
        bookingId
      },
      theme: {
        color: "#111827"
      },
      handler: (response) => {
        completed = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => fail("Payment window was closed before completion.")
      }
    });

    checkout.on("payment.failed", (response) => {
      fail(response.error?.description || response.error?.reason || "Razorpay payment failed.");
    });

    checkout.open();
  });
}

async function sendBookingEmail(booking: BookingRecord): Promise<OperationsEmailStatus> {
  try {
    const response = await fetch("/api/send-booking-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ booking })
    });
    const result = (await response.json().catch(() => null)) as SendBookingEmailResponse | null;

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
      errorReason: result?.error || "Reservation notification could not be completed.",
      resendId: ""
    };
  } catch {
    return {
      attempted: true,
      sent: false,
      errorReason: "Reservation notification could not be completed.",
      resendId: ""
    };
  }
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Payment could not be completed. Please retry.";
}
