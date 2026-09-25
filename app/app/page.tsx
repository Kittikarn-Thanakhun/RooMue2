import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HomeFlow } from "@/components/app/home-flow";
import type { HistoryItem } from "@/components/app/history-list";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const rows = await prisma.translationSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const historyPreview: HistoryItem[] = rows.map((r) => ({
    id: r.id,
    sentence: r.sentence,
    mode: r.mode,
    contextTag: r.contextTag,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    candidates: [],
  }));

  return <HomeFlow historyPreview={historyPreview} />;
}
