"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { translationEngine } from "@/lib/translation";
import type { TranslationRequest, Candidate } from "@/lib/translation";

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

/** Runs the (stubbed) translation engine on captured frames. */
export async function translate(req: TranslationRequest) {
  await requireUserId();
  return translationEngine.translate(req);
}

export type SaveSessionInput = {
  mode: "emergency" | "everyday";
  contextTag?: string | null;
  sentence: string;
  candidates?: Candidate[];
  source: "camera" | "preset";
};

/** Persists a finished translation to the user's history. */
export async function saveSession(
  input: SaveSessionInput
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();

  // The JWT can reference a user that no longer exists — e.g. the dev DB was
  // reset while a login cookie was still valid. Creating the row would throw a
  // foreign-key error and crash the UI, so verify the user first and skip
  // saving (best-effort history) instead.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { ok: false };

  await prisma.translationSession.create({
    data: {
      userId,
      mode: input.mode,
      contextTag: input.contextTag ?? null,
      sentence: input.sentence,
      candidatesJson: input.candidates ? JSON.stringify(input.candidates) : null,
      source: input.source,
    },
  });

  revalidatePath("/app/history");
  return { ok: true };
}
