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

  return NextResponse.json(
    { ok: false, error: "Mobile verification is handled securely on the booking page." },
    { status: 501 }
  );
}

async function readRequest(request: Request): Promise<VerifyOtpRequest | null> {
  try {
    return (await request.json()) as VerifyOtpRequest;
  } catch {
    return null;
  }
}
