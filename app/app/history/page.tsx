import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HistoryList, type HistoryItem } from "@/components/app/history-list";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const rows = await prisma.translationSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const items: HistoryItem[] = rows.map((r) => ({
    id: r.id,
    sentence: r.sentence,
    mode: r.mode,
    contextTag: r.contextTag,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    candidates: r.candidatesJson ? safeParse(r.candidatesJson) : [],
  }));

  return <HistoryList items={items} />;
}

function safeParse(json: string): { text: string; confidence: number }[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
