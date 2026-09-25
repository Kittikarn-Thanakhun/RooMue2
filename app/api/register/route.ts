import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";

type Body = {
  phone?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  disabilityCardNo?: string;
  otp?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone ?? "");
  const { password, firstName, lastName, otp } = body;
  const nationalId = body.nationalId?.replace(/\D/g, "");
  const disabilityCardNo = body.disabilityCardNo?.trim() || null;

  if (!phone)
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  if (!firstName?.trim() || !lastName?.trim())
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!nationalId || nationalId.length !== 13)
    return NextResponse.json({ error: "invalid_national_id" }, { status: 400 });
  if (!otp || otp.trim().length !== 6)
    return NextResponse.json({ error: "invalid_otp" }, { status: 400 });

  // Limit OTP verification attempts to stop brute-forcing the 6-digit code.
  if (!rateLimit(`reg-verify:${phone}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing)
      return NextResponse.json({ error: "phone_taken" }, { status: 409 });

    const ok = await verifyOtp(phone, otp);
    if (!ok)
      return NextResponse.json({ error: "otp_failed" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        phone,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nationalId, // NOTE: encrypt at rest in production
        disabilityCardNo,
        phoneVerified: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "db_error", message: error?.message || "Database error" },
      { status: 500 }
    );
  }
}
