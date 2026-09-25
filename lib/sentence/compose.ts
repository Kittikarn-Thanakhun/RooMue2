import { BASIC_SENTENCES } from "@/lib/data/basic-sentences";

export type Suggestion = {
  text: string;
  score: number;
  /** True for the literal word-join fallback (no dictionary match). */
  fallback?: boolean;
};

function dedupeConsecutive(words: string[]): string[] {
  return words
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w, i, arr) => i === 0 || w !== arr[i - 1]);
}

/** Is `needle` an in-order subsequence of `hay`? */
function isSubsequence(needle: string[], hay: string[]): boolean {
  let i = 0;
  for (const h of hay) {
    if (h === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

/**
 * Turns a sequence of recognized sign-words into ranked complete-sentence
 * suggestions. Matches the word set against the basic-sentence dictionary
 * (with an in-order bonus) and always offers the literal word-join as a
 * fallback so there's a usable result even with no dictionary hit.
 */
export function composeSentences(words: string[], locale: "th" | "en"): Suggestion[] {
  const seq = dedupeConsecutive(words);
  if (seq.length === 0) return [];

  const seqSet = new Set(seq);
  const matches: Suggestion[] = BASIC_SENTENCES.map((e) => {
    const inter = e.words.filter((w) => seqSet.has(w)).length;
    const denom = Math.max(e.words.length, seq.length);
    let score = denom ? inter / denom : 0;
    if (inter === e.words.length && isSubsequence(e.words, seq)) score += 0.15;
    return { text: locale === "th" ? e.th : e.en, score };
  })
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  // De-duplicate identical sentences, keep the best 3.
  const seen = new Set<string>();
  const top: Suggestion[] = [];
  for (const m of matches) {
    if (seen.has(m.text)) continue;
    seen.add(m.text);
    top.push(m);
    if (top.length === 3) break;
  }

  const fallback: Suggestion = { text: seq.join(" "), score: 0, fallback: true };
  if (!seen.has(fallback.text)) top.push(fallback);

  return top;
}
