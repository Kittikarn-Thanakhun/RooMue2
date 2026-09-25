import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { issueOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  // 3 OTP requests per phone per 15 minutes — prevents SMS flooding
  if (!rateLimit(`otp:${phone}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ error: "phone_taken" }, { status: 409 });
    }

    const { devCode } = await issueOtp(phone);
    return NextResponse.json({ ok: true, devCode });
  } catch (error: any) {
    console.error("Register OTP error:", error);
    return NextResponse.json(
      { error: "db_error", message: error?.message || "Database error" },
      { status: 500 }
    );
  }
}
