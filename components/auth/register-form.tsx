"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillTabs } from "@/components/ui/pill-tabs";
import { GoogleButton } from "./google-button";
import { OtpInput } from "./otp-input";
import { StepDots } from "./step-dots";
import { Icons } from "@/components/icons";
import { BrandMark } from "@/components/brand/logo";
import { isValidPhone, normalizePhone, formatPhone } from "@/lib/phone";

const RESEND_SECONDS = 60;

/** Formats 13 digits as the Thai national ID grouping: X-XXXX-XXXXX-XX-X. */
function formatNationalId(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 13);
  const parts = [
    d.slice(0, 1),
    d.slice(1, 5),
    d.slice(5, 10),
    d.slice(10, 12),
    d.slice(12, 13),
  ].filter(Boolean);
  return parts.join("-");
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth.register");
  const tTabs = useTranslations("auth.tabs");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState(""); // digits only
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState(""); // digits only
  const [disabilityCardNo, setDisabilityCardNo] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function errMsg(code?: string) {
    const key = code && code in MESSAGE_KEYS ? code : "generic";
    return t(`errors.${key}`);
  }

  function goStep1ToStep2() {
    setError(null);
    if (!isValidPhone(phone)) return setError(errMsg("invalid_phone"));
    setStep(2);
  }

  async function sendOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errMsg(data.error));
        return false;
      }
      setDevCode(data.devCode ?? null);
      setResendIn(RESEND_SECONDS);
      return true;
    } catch {
      setError(errMsg());
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function goStep2ToStep3() {
    setError(null);
    if (!firstName.trim() || !lastName.trim())
      return setError(errMsg("missing_name"));
    if (nationalId.length !== 13) return setError(errMsg("invalid_national_id"));
    if (password.length < 8) return setError(errMsg("weak_password"));

    const sent = await sendOtp();
    if (sent) setStep(3);
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          firstName,
          lastName,
          nationalId,
          disabilityCardNo,
          otp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errMsg(data.error));
        return;
      }
      // Auto sign-in after successful registration.
      const login = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError(errMsg());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] space-y-4">
      {step === 1 && (
        <PillTabs
          activeKey="register"
          options={[
            { key: "register", label: tTabs("register") },
            { key: "login", label: tTabs("login"), href: "/login" },
          ]}
        />
      )}
      <Card className="border-white/60 bg-card/95 p-5 shadow-xl backdrop-blur-sm sm:p-8 dark:border-white/10">
      <div className="mb-5 text-center sm:mb-6">
        <BrandMark className="mx-auto mb-4 size-14" />
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <div className="mt-4">
          <StepDots current={step} total={3} />
        </div>
      </div>

      {/* Step 1 — choose method */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-center text-sm font-semibold text-muted-foreground">
            {t("step1.heading")}
          </h2>
          {googleEnabled && <GoogleButton label={t("step1.google")} />}
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("step1.phoneLabel")}</Label>
            <Input
              variant="underline"
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081-234-5678"
              value={formatPhone(phone)}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
            />
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Button shape="pill" className="w-full" onClick={goStep1ToStep2}>
            {t("step1.next")}
            <Icons.next className="size-5" aria-hidden />
          </Button>
        </div>
      )}

      {/* Step 2 — profile */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-center text-sm font-semibold text-muted-foreground">
            {t("step2.heading")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t("step2.firstName")}</Label>
              <Input
                variant="underline"
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t("step2.lastName")}</Label>
              <Input
                variant="underline"
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nationalId">{t("step2.nationalId")}</Label>
            <Input
              variant="underline"
              id="nationalId"
              inputMode="numeric"
              placeholder="X-XXXX-XXXXX-XX-X"
              value={formatNationalId(nationalId)}
              onChange={(e) =>
                setNationalId(e.target.value.replace(/\D/g, "").slice(0, 13))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="disabilityCard">
              {t("step2.disabilityCard")}{" "}
              <span className="font-normal text-muted-foreground">
                {t("step2.disabilityCardHint")}
              </span>
            </Label>
            <Input
              variant="underline"
              id="disabilityCard"
              value={disabilityCardNo}
              onChange={(e) => setDisabilityCardNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("step2.password")}</Label>
            <Input
              variant="underline"
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("step2.passwordHint")}</p>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Button shape="pill" variant="outline" className="flex-1" onClick={() => setStep(1)}>
              <Icons.back className="size-5" aria-hidden />
              {t("step2.back")}
            </Button>
            <Button shape="pill" className="flex-1" onClick={goStep2ToStep3} disabled={loading}>
              {loading ? "..." : t("step2.next")}
              <Icons.next className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — OTP */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("step3.heading")}
            </h2>
            <p className="mt-1 text-sm">
              {t("step3.sentTo")} <span className="font-semibold">{formatPhone(phone)}</span>
            </p>
          </div>

          <OtpInput value={otp} onChange={setOtp} ariaLabel={t("step3.heading")} />

          {devCode && (
            <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm">
              {t("step3.devCode")} <span className="font-mono font-bold">{devCode}</span>
            </p>
          )}

          {error && <FieldError>{error}</FieldError>}

          <div className="text-center text-sm">
            {resendIn > 0 ? (
              <span className="text-muted-foreground">
                {t("step3.resendIn", { seconds: resendIn })}
              </span>
            ) : (
              <button
                type="button"
                onClick={sendOtp}
                className="font-semibold text-primary hover:underline"
              >
                {t("step3.resend")}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button shape="pill" variant="outline" className="flex-1" onClick={() => setStep(2)}>
              <Icons.back className="size-5" aria-hidden />
              {t("step3.back")}
            </Button>
            <Button
              className="flex-1"
              onClick={submit}
              disabled={loading || otp.length !== 6}
            >
              <Icons.confirm className="size-5" aria-hidden />
              {loading ? "..." : t("step3.submit")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          {t("haveAccount")}
          <Icons.next className="size-4" aria-hidden />
        </Link>
      </div>
      </Card>
    </div>
  );
}

const MESSAGE_KEYS = {
  invalid_phone: 1,
  phone_taken: 1,
  weak_password: 1,
  missing_name: 1,
  invalid_national_id: 1,
  invalid_otp: 1,
  otp_failed: 1,
  too_many_requests: 1,
  db_error: 1,
} as const;

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {children}
    </p>
  );
}
