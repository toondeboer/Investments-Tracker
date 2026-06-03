import { CaptainInsight } from './captain.types';

/**
 * Static, offline responses for the public /demo page. The demo is
 * unauthenticated and the Captain Lambda requires auth, so demo mode never
 * calls OpenAI — these canned, sailing-flavoured replies stand in. The
 * advice-refusal behaviour mirrors the Lambda's system-prompt guardrail.
 */

// Funny, varied sailing-themed deflections for any advice/forecast request.
export const ADVICE_DEFLECTIONS: string[] = [
  "That I can't chart for you — let's see where the waves take us. ⚓",
  'Forecasting the markets? I left my crystal ball ashore. I can tell you where you have sailed, not where the wind blows next.',
  'I read the wake, not the horizon — no course-setting from this captain. 🧭',
  'Buy or sell? You are the helmsman here — I only point out what is on the charts behind us.',
  'The seas ahead are nobody’s to predict. I share what your logbook shows, not what tomorrow’s tide brings.',
];

const ADVICE_PATTERNS: RegExp[] = [
  /\bshould i\b/,
  /\b(buy|sell|hold)\b/,
  /\b(will|gonna|going to)\b.*\b(go|rise|drop|fall|crash|moon)\b/,
  /\b(forecast|predict|prediction|outlook|future)\b/,
  /\b(worth (it|buying)|good (investment|buy|stock)|bad (investment|buy))\b/,
  /\b(recommend|advice|advise|price target|what do you think)\b/,
];

/** True when the prompt is asking for advice, an opinion or a forecast. */
export function isAdviceRequest(text: string): boolean {
  const t = text.toLowerCase();
  return ADVICE_PATTERNS.some((re) => re.test(t));
}

// Keyword → canned factual answer about the demo portfolio.
const DEMO_QA: { match: RegExp; reply: string }[] = [
  {
    match: /\b(week|weekly|this week|recent)\b/,
    reply:
      'Steady sailing this week, captain — the demo portfolio is up around +1.4%, riding the same upward swell it has held all year. 📈',
  },
  {
    match: /\b(biggest|largest|top) (holding|position)\b|allocation/,
    reply:
      'Your largest position carries roughly a third of the demo portfolio’s value — a well-ballasted ship, with the rest spread across smaller holdings.',
  },
  {
    match: /\b(moved|mover|move|biggest change|rise|drop|gain|loss)\b/,
    reply:
      'The biggest mover this week climbed about +6% — a brisk gust in its sails — while the rest of the fleet drifted gently along.',
  },
  {
    match: /\bdividend/,
    reply:
      'Dividends drip in quarterly in this demo, and the trailing-twelve-month total has been climbing each quarter — a tidy following current of income. 💧',
  },
  {
    match: /\b(total|overall|how am i doing|performance|return)\b/,
    reply:
      'All told, the demo portfolio sits comfortably in profit — up roughly +18% on what was invested, dividends included.',
  },
];

const DEMO_FALLBACK =
  'I can read out what is on the demo charts — your value, returns, biggest movers and dividends. Pick one of the prompts below and I’ll tell you what I see. 🧭';

/** Deterministic so tests and renders are stable. */
function pickDeflection(text: string): string {
  return ADVICE_DEFLECTIONS[text.length % ADVICE_DEFLECTIONS.length];
}

/** The Captain's canned reply for the demo page (no network call). */
export function demoChatReply(text: string): string {
  if (isAdviceRequest(text)) {
    return pickDeflection(text);
  }
  const t = text.toLowerCase();
  const hit = DEMO_QA.find((qa) => qa.match.test(t));
  return hit ? hit.reply : DEMO_FALLBACK;
}

/** Ready-to-use prompt chips shown in the chat panel. */
export const CAPTAIN_PROMPTS: string[] = [
  'How did I do this week?',
  'What is my biggest holding?',
  'Which holding moved the most?',
  'Explain my dividends',
];

/** Static "Captain's read" for the demo dashboard banner. */
export const DEMO_INSIGHT: CaptainInsight = {
  narrative:
    'A calm, profitable voyage so far: the portfolio is up about +18% overall with dividends climbing each quarter. This week’s strongest gust lifted the top mover near +6%, while the largest holding holds steady at roughly a third of the fleet. ⚓',
  generatedAt: new Date().toISOString(),
  fingerprint: 'demo',
};
