import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  return NextResponse.json(
    { apiKey },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
