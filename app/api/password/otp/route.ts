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
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  // 3 OTP requests per phone per 15 minutes — prevents SMS flooding
  if (!rateLimit(`pwd-otp:${phone}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  // Always return 200 regardless of whether the phone exists — returning 404
  // would let attackers enumerate which numbers are registered.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { devCode } = await issueOtp(phone);
  return NextResponse.json({ ok: true, devCode });
}
