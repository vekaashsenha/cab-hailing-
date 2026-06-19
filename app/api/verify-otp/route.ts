import { NextResponse } from "next/server";

type VerifyOtpRequest = {
  mobile?: string;
  otp?: string;
};

export async function POST(request: Request) {
  const payload = await readRequest(request);
  const mobile = payload?.mobile?.trim() ?? "";
  const otp = payload?.otp?.trim() ?? "";

  if (!mobile || !otp) {
    return NextResponse.json({ ok: false, error: "Please enter the mobile number and OTP." }, { status: 400 });
  }

  if (process.env.NODE_ENV === "development") {
    if (otp === "123456") {
      return NextResponse.json({ ok: true, status: "verified" });
    }

    return NextResponse.json({ ok: false, error: "The OTP entered is incorrect." }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: "OTP provider is not configured yet." }, { status: 501 });
}

async function readRequest(request: Request): Promise<VerifyOtpRequest | null> {
  try {
    return (await request.json()) as VerifyOtpRequest;
  } catch {
    return null;
  }
}
