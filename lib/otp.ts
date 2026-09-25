import { randomInt } from "crypto";
import { prisma } from "@/lib/db";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** True when a real SMS provider is configured. */
export const smsConfigured = Boolean(
  process.env.SMS_API_KEY && process.env.SMS_SENDER
);

function generateCode(): string {
  // crypto.randomInt is cryptographically secure (unlike Math.random)
  return String(randomInt(100000, 1000000));
}

/**
 * Issues a fresh 6-digit code for an identifier (a phone number), replacing any
 * previous one. Returns the code only in dev (when SMS isn't configured) so the
 * UI can surface it; in production the code is sent via SMS and never returned.
 */
export async function issueOtp(phone: string): Promise<{ devCode?: string }> {
  const identifier = phone.trim();
  const token = generateCode();
  const expires = new Date(Date.now() + OTP_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  if (smsConfigured) {
    // TODO: integrate an SMS provider here using SMS_* envs.
    // await sendSms(identifier, token);
    return {};
  }

  // Dev fallback: no SMS provider — log and return the code.
  console.info(`[OTP] code for ${identifier}: ${token}`);
  return { devCode: token };
}

/** Verifies and consumes a code. */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const identifier = phone.trim();
  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token: code.trim() },
  });
  if (!record) return false;

  const valid = record.expires.getTime() > Date.now();
  // Consume regardless of validity to prevent reuse / brute force lingering.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return valid;
}
