import { NextResponse } from "next/server";
import { getRideTypeLabel, type BookingRecord, type PaymentOption } from "@/lib/booking";
import { calculateFareBreakup, getFareBreakupRows } from "@/lib/fare";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const TEST_SENDER = "onboarding@resend.dev";
const paymentOptions: PaymentOption[] = ["Card", "UPI", "Pay Later"];

type SendBookingEmailRequest = {
  booking?: BookingRecord;
};

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const operationsEmail = process.env.OPERATIONS_EMAIL;

  if (!resendApiKey || !operationsEmail) {
    return NextResponse.json({ error: "Booking email is not configured." }, { status: 500 });
  }

  let payload: SendBookingEmailRequest;

  try {
    payload = (await request.json()) as SendBookingEmailRequest;
  } catch {
    return NextResponse.json({ error: "Invalid booking email payload." }, { status: 400 });
  }

  if (!isBookingRecord(payload.booking)) {
    return NextResponse.json({ error: "Booking details are incomplete." }, { status: 400 });
  }

  const booking = payload.booking;
  const rows = getBookingRows(booking);

  const resendResponse = await fetch(RESEND_EMAILS_URL, {
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

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => "");
    console.error("Resend booking email failed", resendResponse.status, detail);
    return NextResponse.json({ error: "Booking email could not be sent." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
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
    ["Date", booking.trip.date],
    ["Time", booking.trip.time],
    ["Ride type", getRideTypeLabel(booking.trip.rideType)],
    ["Vehicle", booking.car.name],
    ["Payment option", booking.payment],
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
    typeof trip.time === "string" &&
    (trip.rideType === "Airport Transfer" || trip.rideType === "Within City" || trip.rideType === "Outstation") &&
    isNullableNumber(trip.routeKm) &&
    isNullableNumber(trip.manualKm) &&
    typeof trip.travelDays === "number" &&
    typeof trip.travelNights === "number" &&
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
    typeof payment === "string" &&
    paymentOptions.includes(payment as PaymentOption)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown) {
  return value === null || typeof value === "number";
}
