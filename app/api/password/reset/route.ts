import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";

export async function POST(req: Request) {
  let body: { phone?: string; otp?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  const { otp, password } = body;

  if (!phone)
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  if (!otp || otp.trim().length !== 6)
    return NextResponse.json({ error: "invalid_otp" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "weak_password" }, { status: 400 });

  // Limit OTP verification attempts — a wrong guess doesn't consume the code,
  // so without this an attacker could brute-force the 6-digit OTP.
  if (!rateLimit(`pwd-verify:${phone}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user)
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const ok = await verifyOtp(phone, otp);
  if (!ok) return NextResponse.json({ error: "otp_failed" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { phone }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
