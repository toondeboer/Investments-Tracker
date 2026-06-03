import { z } from 'zod';

// Validate the Captain Lambda response before it reaches the UI — a malformed
// payload would otherwise render as `undefined` in the chat.
const captainReplySchema = z.object({ reply: z.string() });

export function parseCaptainReply(raw: unknown): string {
  return captainReplySchema.parse(raw).reply;
}
