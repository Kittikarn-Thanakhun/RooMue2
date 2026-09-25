"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

/** Inline Google "G" mark (brand SVG, not an emoji). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden focusable="false">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.5 6.5 28.9 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c4.8 0 9.2-1.8 12.5-4.8l-5.8-4.9C28.8 34.5 26.5 35.3 24 35.3c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.5 39 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.3l5.8 4.9c-.4.4 6.5-4.7 6.5-14.2 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleButton({ label }: { label: string }) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signIn("google", { callbackUrl: "/app" })}
    >
      <GoogleMark />
      {label}
    </Button>
  );
}
