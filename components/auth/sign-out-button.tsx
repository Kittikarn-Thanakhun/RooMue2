"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

export function SignOutButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })} className={className}>
      <Icons.close className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
