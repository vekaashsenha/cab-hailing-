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

  return NextResponse.json(
    { ok: false, error: "Mobile verification is handled securely on the booking page." },
    { status: 501 }
  );
}

async function readRequest(request: Request): Promise<SendOtpRequest | null> {
  try {
    return (await request.json()) as SendOtpRequest;
  } catch {
    return null;
  }
}
