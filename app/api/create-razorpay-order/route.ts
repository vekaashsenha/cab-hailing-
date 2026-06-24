import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

type CreateRazorpayOrderRequest = {
  amount?: number;
  bookingId?: string;
};

type RazorpayOrderResponse = {
  id?: string;
  amount?: number;
  currency?: string;
  error?: {
    description?: string;
    reason?: string;
  };
};

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("Razorpay order configuration is incomplete.", {
      keyIdPresent: Boolean(keyId),
      keySecretPresent: Boolean(keySecret)
    });
    return NextResponse.json(
      { error: "Payment could not be started. Please try again or contact support." },
      { status: 500 }
    );
  }

  let payload: CreateRazorpayOrderRequest;

  try {
    payload = (await request.json()) as CreateRazorpayOrderRequest;
  } catch {
    return NextResponse.json({ error: "Payment could not be started. Please retry." }, { status: 400 });
  }

  const amountInInr = Number(payload.amount);

  if (!Number.isFinite(amountInInr) || amountInInr <= 0) {
    return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
  }

  const amountInPaise = Math.round(amountInInr * 100);

  if (amountInPaise <= 0) {
    return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
  }

  let razorpayResponse: Response;

  try {
    razorpayResponse = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: payload.bookingId || undefined
      })
    });
  } catch (error) {
    console.error("Razorpay order request failed.", {
      reason: getSafeServerError(error)
    });
    return NextResponse.json(
      { error: "Payment could not be started. Please try again or contact support." },
      { status: 502 }
    );
  }

  const order = (await razorpayResponse.json().catch(() => null)) as RazorpayOrderResponse | null;

  if (!razorpayResponse.ok || !order?.id || !order.amount || !order.currency) {
    console.error("Razorpay order creation was rejected.", {
      status: razorpayResponse.status,
      reason: order?.error?.reason || "unknown"
    });
    return NextResponse.json(
      { error: getRazorpayOrderError(order) },
      { status: 502 }
    );
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId
  });
}

function getRazorpayOrderError(_order: RazorpayOrderResponse | null) {
  return "Payment could not be started. Please try again or contact support.";
}

function getSafeServerError(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  return "unknown";
}
