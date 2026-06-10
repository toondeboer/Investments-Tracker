/**
 * Render-prep for the Captain's read.
 *
 * The narrative arrives as lightweight markdown (figures wrapped in `**…**`),
 * but Angular interpolation renders that verbatim, so the asterisks leak into
 * the UI. Rather than trust the model's markdown, this parser strips the `**`
 * markers and picks out the figures itself.
 *
 * Two levels of emphasis:
 *   - Every figure — a currency amount, a percentage, or a signed value —
 *     becomes **bold**, so totals, invested, dividends and allocations are easy
 *     to scan.
 *   - Colour is reserved for *direction*: a leading `+` reads as a gain
 *     (green), a leading `-`/`−` as a loss (red). Unsigned figures stay the
 *     normal text colour, so green/red keeps meaning "you gained / you lost"
 *     rather than just "this is a number".
 *
 * This is deterministic and works the same for the live narrative and the
 * static demo string.
 */

export type InsightTone = 'positive' | 'negative' | 'neutral';

export interface InsightSegment {
  text: string;
  bold: boolean;
  tone: InsightTone;
}

// A number body: digits that may carry thousands/decimal separators, but never
// ending on a separator — so a trailing sentence comma ("…€1,430.29, though…")
// is left out of the figure.
const NUM = '\\d(?:[\\d.,]*\\d)?';

// A figure worth emphasising. The leading `(?<![\\d.,])` stops us starting in
// the middle of a number, so a date range like "2020-2021" is left alone. A
// bare integer (a year, a count) has no currency, sign or `%`, so it matches
// none of the branches and stays plain.
const FIGURE = new RegExp(
  '(?<![\\d.,])(?:' +
    // signed value — currency and % optional (e.g. +€5,192.08, -3.82%, +18%)
    `[+\\-−]\\s?[€$£]?${NUM}%?` +
    '|' +
    // unsigned currency amount (e.g. €42,153.34)
    `[€$£]${NUM}%?` +
    '|' +
    // bare percentage (e.g. 83.88%)
    `${NUM}%` +
    ')',
  'g',
);

/** Green for a leading `+`, red for a leading `-`/`−`, otherwise no tint. */
function detectTone(figure: string): InsightTone {
  const sign = figure[0];
  if (sign === '+') return 'positive';
  if (sign === '-' || sign === '−') return 'negative';
  return 'neutral';
}

/**
 * Split a narrative into ordered render segments. Every figure becomes a bold
 * segment (tinted only when signed); all other text stays plain and neutral.
 */
export function parseInsightNarrative(narrative: string): InsightSegment[] {
  // We choose the emphasis ourselves, so drop the model's bold markers rather
  // than render them.
  const clean = narrative.replace(/\*\*/g, '');

  const segments: InsightSegment[] = [];
  let lastIndex = 0;

  for (const match of clean.matchAll(FIGURE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({
        text: clean.slice(lastIndex, start),
        bold: false,
        tone: 'neutral',
      });
    }
    segments.push({
      text: match[0],
      bold: true,
      tone: detectTone(match[0]),
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < clean.length) {
    segments.push({
      text: clean.slice(lastIndex),
      bold: false,
      tone: 'neutral',
    });
  }

  return segments;
}
