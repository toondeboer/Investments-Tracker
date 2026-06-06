import { z } from 'zod';
import { CaptainStatus } from './captain.types';

// Usage snapshot the Lambda returns alongside a reply and from `mode: 'status'`.
const usageSchema = z.object({
  plan: z.enum(['free', 'paid', 'admin']),
  limit: z.number().nullable(),
  used: z.number(),
  remaining: z.number().nullable(),
});

// Validate the Captain Lambda response before it reaches the UI — a malformed
// payload would otherwise render as `undefined` in the chat.
const captainReplySchema = z.object({
  reply: z.string(),
  usage: usageSchema.nullable().optional(),
});

/** A Captain chat/insights reply plus the caller's post-call usage snapshot. */
export interface CaptainReply {
  reply: string;
  usage: CaptainStatus | null;
}

export function parseCaptainReply(raw: unknown): CaptainReply {
  const parsed = captainReplySchema.parse(raw);
  return { reply: parsed.reply, usage: parsed.usage ?? null };
}

/** Validate the `mode: 'status'` response. */
export function parseCaptainStatus(raw: unknown): CaptainStatus {
  return usageSchema.parse(raw);
}
