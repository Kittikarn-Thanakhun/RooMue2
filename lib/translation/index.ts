import { stubEngine } from "./stub-engine";
import type { TranslationEngine } from "./types";

/**
 * Active translation engine. To integrate a real TSL model or inference API,
 * implement `TranslationEngine` (see ./types.ts) and assign it here.
 */
export const translationEngine: TranslationEngine = stubEngine;

export * from "./types";
