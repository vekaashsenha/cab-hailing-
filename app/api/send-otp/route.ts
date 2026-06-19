import { NextResponse } from "next/server";

type SendOtpRequest = {
  mobile?: string;
};

export async function POST(request: Request) {
  const payload = await readRequest(request);
  const mobile = payload?.mobile?.trim() ?? "";

  if (!mobile) {
    return NextResponse.json({ ok: false, error: "Please enter a valid mobile number." }, { status: 400 });
  }

  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({ ok: true, status: "sent" });
  }

  return NextResponse.json({ ok: false, error: "OTP provider is not configured yet." }, { status: 501 });
}

async function readRequest(request: Request): Promise<SendOtpRequest | null> {
  try {
    return (await request.json()) as SendOtpRequest;
  } catch {
    return null;
  }
}
