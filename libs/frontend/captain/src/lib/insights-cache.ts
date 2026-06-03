import { CaptainInsight, CaptainSummary } from './captain.types';

const CACHE_KEY = 'captain.insight';

/**
 * A stable key for "this portfolio, today". Same portfolio on the same calendar
 * day → same fingerprint → cache hit → no OpenAI call (survives page reloads).
 * A changed value/holding or a new day → new fingerprint → regenerate.
 */
export function insightFingerprint(summary: CaptainSummary): string {
  const today = new Date().toISOString().slice(0, 10);
  const holdings = summary.holdings
    .map((h) => `${h.ticker}:${h.value}`)
    .join('|');
  return `${today}|${summary.portfolio.value}|${holdings}`;
}

export function readCachedInsight(): CaptainInsight | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CaptainInsight) : null;
  } catch {
    return null;
  }
}

export function writeCachedInsight(insight: CaptainInsight): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(insight));
  } catch {
    // localStorage unavailable (private mode / quota) — skip caching silently.
  }
}
