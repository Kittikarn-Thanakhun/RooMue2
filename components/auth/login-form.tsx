"use client";

import { useState } from "react";
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
import { Icons } from "@/components/icons";
import { BrandMark } from "@/components/brand/logo";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth.login");
  const tTabs = useTranslations("auth.tabs");
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      phone,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError(t("invalid"));
      setLoading(false);
      return;
    }
    router.push("/app");
  }

  return (
    <div className="w-full max-w-[420px] space-y-4">
      <PillTabs
        activeKey="login"
        options={[
          { key: "register", label: tTabs("register"), href: "/register" },
          { key: "login", label: tTabs("login") },
        ]}
      />
      <Card className="border-white/60 bg-card/95 p-5 shadow-xl backdrop-blur-sm sm:p-8 dark:border-white/10">
        <div className="mb-5 text-center sm:mb-6">
          <BrandMark className="mx-auto size-14" />
          <h1 className="mt-4 text-2xl font-extrabold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              variant="underline"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081-234-5678"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              variant="underline"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button shape="pill" type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("submit")}
          </Button>
        </form>

      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton label={t("google")} />
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          {t("forgot")}
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          {t("noAccount")}
          <Icons.next className="size-4" aria-hidden />
        </Link>
      </div>
      </Card>
    </div>
  );
}
