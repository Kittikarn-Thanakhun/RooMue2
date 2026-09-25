/**
 * Natural Thai sentences composed from the basic sign vocabulary
 * ("ภาษามือเบื้องต้น 20 ท่า") plus words the current model recognizes.
 *
 * `words` are the constituent sign-words (as the recognizer outputs them); the
 * sentence-composer (lib/sentence/compose.ts) matches a recognized sequence
 * against these to suggest a complete, polished sentence.
 */
export type BasicSentence = {
  words: string[];
  th: string;
  en: string;
};

export const BASIC_SENTENCES: BasicSentence[] = [
  // greetings / courtesy
  { words: ["สวัสดี"], th: "สวัสดีค่ะ", en: "Hello" },
  { words: ["ขอบคุณ"], th: "ขอบคุณมากค่ะ", en: "Thank you very much" },
  { words: ["ขอโทษ"], th: "ขอโทษนะคะ", en: "I'm sorry" },
  { words: ["ไม่เป็นไร"], th: "ไม่เป็นไรนะคะ", en: "It's all right" },
  { words: ["โชคดี"], th: "ขอให้โชคดีนะคะ", en: "Good luck to you" },
  { words: ["สวัสดี", "ขอบคุณ"], th: "สวัสดีค่ะ ขอบคุณมากค่ะ", en: "Hello, thank you very much" },

  // feelings
  { words: ["สบายดี"], th: "ฉันสบายดีค่ะ", en: "I'm doing well" },
  { words: ["รัก"], th: "ฉันรักคุณ", en: "I love you" },
  { words: ["คิดถึง"], th: "ฉันคิดถึงคุณ", en: "I miss you" },
  { words: ["รัก", "คิดถึง"], th: "ฉันรักและคิดถึงคุณ", en: "I love and miss you" },
  { words: ["เป็นห่วง"], th: "ฉันเป็นห่วงคุณ", en: "I'm worried about you" },
  { words: ["เศร้า"], th: "ฉันรู้สึกเศร้า", en: "I feel sad" },
  { words: ["เสียใจ"], th: "ฉันเสียใจด้วยค่ะ", en: "I'm sorry to hear that" },
  { words: ["ชอบ"], th: "ฉันชอบสิ่งนี้", en: "I like it" },
  { words: ["ไม่ชอบ"], th: "ฉันไม่ชอบสิ่งนี้", en: "I don't like it" },
  { words: ["เข้าใจ"], th: "ฉันเข้าใจแล้วค่ะ", en: "I understand" },

  // compliments
  { words: ["น่ารัก"], th: "คุณน่ารักมาก", en: "You are very cute" },
  { words: ["สวย"], th: "คุณสวยมาก", en: "You are very beautiful" },
  { words: ["เก่ง"], th: "คุณเก่งมาก", en: "You are very capable" },
  { words: ["ฉลาด"], th: "คุณฉลาดมาก", en: "You are very smart" },

  // needs / daily life
  { words: ["หิว"], th: "ฉันหิวแล้วค่ะ", en: "I'm hungry" },
  { words: ["อิ่ม"], th: "ฉันอิ่มแล้วค่ะ", en: "I'm full" },
  { words: ["ไม่สบาย"], th: "ฉันไม่สบายค่ะ", en: "I'm not feeling well" },
  { words: ["ช่วย"], th: "ช่วยฉันหน่อยค่ะ", en: "Please help me" },
  { words: ["กิน"], th: "ฉันอยากกินข้าวค่ะ", en: "I want to eat" },
  { words: ["พักผ่อน"], th: "ฉันอยากพักผ่อน", en: "I want to rest" },
  { words: ["ไป"], th: "ฉันอยากไปแล้วค่ะ", en: "I want to go" },
  { words: ["คุย"], th: "ฉันอยากคุยด้วยค่ะ", en: "I'd like to talk with you" },
];
