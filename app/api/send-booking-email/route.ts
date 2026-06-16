import { NextResponse } from "next/server";
import { getRideTypeLabel, type BookingRecord, type PaymentStatus } from "@/lib/booking";
import { calculateFareBreakup, getFareBreakupRows } from "@/lib/fare";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TEST_SENDER = "onboarding@resend.dev";
const paymentStatuses: PaymentStatus[] = ["pending", "paid", "failed"];

type SendBookingEmailRequest = {
  booking?: BookingRecord;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  error?: string | { message?: string };
};

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const operationsEmail = process.env.OPERATIONS_EMAIL;

  console.info("Booking email config", {
    resendApiKeyPresent: resendApiKey ? "Yes" : "No",
    operationsEmailPresent: operationsEmail ? "Yes" : "No"
  });

  if (!resendApiKey || !operationsEmail) {
    console.error("Booking email skipped", {
      error: "Missing booking email configuration."
    });
    return NextResponse.json(
      { ok: false, error: "Reservation notification could not be completed." },
      { status: 500 }
    );
  }

  let payload: SendBookingEmailRequest;

  try {
    payload = (await request.json()) as SendBookingEmailRequest;
  } catch {
    console.error("Booking email skipped", {
      error: "Invalid booking email payload."
    });
    return NextResponse.json({ ok: false, error: "Invalid booking email payload." }, { status: 400 });
  }

  if (!isBookingRecord(payload.booking)) {
    console.error("Booking email skipped", {
      error: "Booking details are incomplete."
    });
    return NextResponse.json({ ok: false, error: "Booking details are incomplete." }, { status: 400 });
  }

  const booking = payload.booking;
  const rows = getBookingRows(booking);

  let resendResponse: Response;

  try {
    resendResponse = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: TEST_SENDER,
        to: [operationsEmail],
        subject: `Completed booking ${booking.bookingId}`,
        text: renderTextEmail(rows),
        html: renderHtmlEmail(rows)
      })
    });
  } catch (error: unknown) {
    const message = getSafeErrorMessage(error, "Resend request could not be completed.");
    console.error("Resend booking email failed", {
      error: message
    });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const resendBody = await readResendResponse(resendResponse);
  const resendId = typeof resendBody?.id === "string" ? resendBody.id : "";

  if (!resendResponse.ok) {
    const message = getResendErrorMessage(resendResponse.status, resendBody);
    console.error("Resend booking email failed", {
      status: resendResponse.status,
      error: message
    });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  console.info("Resend booking email sent", {
    resendResponseId: resendId || "Not provided"
  });

  return NextResponse.json({ ok: true, id: resendId });
}

function getBookingRows(booking: BookingRecord) {
  const fareRows = getFareBreakupRows(calculateFareBreakup(booking.trip, booking.car));

  return [
    ["Booking ID", booking.bookingId],
    ["Passenger", booking.passenger.fullName],
    ["Mobile", booking.passenger.mobile],
    ["Email", booking.passenger.email],
    ["Pickup", booking.trip.pickup],
    ["Drop", booking.trip.dropoff],
    ["Pickup date", booking.trip.date],
    ["Return date", booking.trip.rideType === "Outstation" ? booking.trip.returnDate : "Not applicable"],
    ["Time", booking.trip.time],
    ["Ride type", getRideTypeLabel(booking.trip.rideType)],
    ["Vehicle", booking.car.name],
    ["Payment method", booking.payment],
    ["Payment status", formatPaymentStatus(booking.paymentStatus)],
    ["Razorpay payment ID", booking.razorpayPaymentId || "Not available"],
    ["Razorpay order ID", booking.razorpayOrderId || "Not available"],
    ...fareRows.map((row) => [row.label, row.value] as const),
    ["Special instruction", booking.passenger.instruction || "None"]
  ] as const;
}

function renderTextEmail(rows: ReadonlyArray<readonly [string, string]>) {
  return [
    "A booking was completed.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`)
  ].join("\n");
}

function renderHtmlEmail(rows: ReadonlyArray<readonly [string, string]>) {
  const tableRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h1 style="font-size:20px;margin:0 0 16px;">Completed booking</h1>
      <p style="margin:0 0 16px;">A booking was completed on the cab-hailing website.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;">
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isBookingRecord(value: unknown): value is BookingRecord {
  if (!isObject(value)) {
    return false;
  }

  const { bookingId, trip, car, passenger, payment } = value;

  return (
    typeof bookingId === "string" &&
    isObject(trip) &&
    typeof trip.pickup === "string" &&
    typeof trip.dropoff === "string" &&
    typeof trip.date === "string" &&
    typeof trip.returnDate === "string" &&
    typeof trip.time === "string" &&
    (trip.rideType === "Airport Transfer" || trip.rideType === "Within City" || trip.rideType === "Outstation") &&
    isNullableNumber(trip.routeKm) &&
    isNullableNumber(trip.manualKm) &&
    isObject(car) &&
    typeof car.id === "string" &&
    typeof car.name === "string" &&
    typeof car.seats === "number" &&
    typeof car.luggage === "number" &&
    typeof car.ratePerKm === "number" &&
    typeof car.image === "string" &&
    typeof car.tone === "string" &&
    isObject(passenger) &&
    typeof passenger.fullName === "string" &&
    typeof passenger.mobile === "string" &&
    typeof passenger.email === "string" &&
    typeof passenger.instruction === "string" &&
    payment === "Razorpay" &&
    paymentStatuses.includes(value.paymentStatus as PaymentStatus) &&
    typeof value.razorpayPaymentId === "string" &&
    typeof value.razorpayOrderId === "string" &&
    typeof value.razorpaySignature === "string" &&
    typeof value.paymentErrorReason === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown) {
  return value === null || typeof value === "number";
}

function formatPaymentStatus(status: PaymentStatus) {
  if (status === "paid") {
    return "Paid";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

async function readResendResponse(response: Response): Promise<ResendEmailResponse | null> {
  const text = await response.text().catch(() => "");

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ResendEmailResponse;
  } catch {
    return {
      message: sanitizeMessage(text)
    };
  }
}

function getResendErrorMessage(status: number, _body: ResendEmailResponse | null) {
  if (status === 401 || status === 403) {
    return "Reservation notification could not be completed.";
  }

  if (status === 422) {
    return "Reservation notification could not be completed.";
  }

  return "Reservation notification could not be completed.";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return sanitizeMessage(error.message);
  }

  return fallback;
}

function sanitizeMessage(message: string) {
  return message
    .replace(/re_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 240);
}
