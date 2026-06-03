import { Return } from '@aws/util';

/** A single turn in the chat thread sent to / shown by the Captain. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** One holding, flattened to just the figures the Captain narrates. */
export interface CaptainHolding {
  ticker: string;
  value: number;
  /** Share of total portfolio value, as a percentage. */
  allocationPct: number;
  shares: number;
  weeklyReturnPct: number;
  monthlyReturnPct: number;
  totalReturnPct: number;
}

/**
 * The compact, pre-computed payload sent to the Captain Lambda. Everything is
 * derived client-side and rounded so the prompt stays small (low token cost)
 * and the numbers are reproducible — the model only narrates, it never computes.
 */
export interface CaptainSummary {
  currency: string;
  asOf: string;
  portfolio: {
    value: number;
    invested: number;
    dividend: number;
    commission: number;
    dailyReturn: Return;
    weeklyReturn: Return;
    monthlyReturn: Return;
    totalReturn: Return;
  };
  holdings: CaptainHolding[];
  /** Deterministically ranked biggest movers, to seed the insight. */
  notableMovers: { ticker: string; weeklyReturnPct: number; notable: boolean }[];
}

/** The dashboard's daily "Captain's read", cached in localStorage. */
export interface CaptainInsight {
  narrative: string;
  /** ISO timestamp of when it was generated. */
  generatedAt: string;
  /** Identifies the date + portfolio state it was generated for (cache key). */
  fingerprint: string;
}
