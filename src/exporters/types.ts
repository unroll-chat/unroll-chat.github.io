import { z } from 'zod';
import type { Conversation, Message } from '../parsers/types.js';

// ── Zod Schema for ExportOptions ─────────────────────────────

export const ExportOptionsSchema = z.object({
  includeMetadata: z.boolean().optional().default(true),
  onlyRoles: z
    .array(z.enum(['user', 'assistant', 'system']))
    .optional(),
});

export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

// ── Exporter Interface ───────────────────────────────────────

export interface Exporter {
  /** Short identifier (e.g. 'markdown', 'json') */
  format: string;

  /** Human-readable label (e.g. 'Markdown', 'JSON') */
  label: string;

  /** File extension without dot (e.g. 'md', 'json') */
  extension: string;

  /** MIME type for download (e.g. 'text/markdown') */
  mimeType: string;

  /** Export the conversation to the target format */
  export(
    conversation: Conversation,
    options?: ExportOptions,
  ): string | Uint8Array | Promise<string | Uint8Array>;
}

// ── Helpers ──────────────────────────────────────────────────

/** Filter messages by the roles specified in ExportOptions */
export function filterMessages(
  messages: readonly Message[],
  options?: ExportOptions,
): Message[] {
  const opts = ExportOptionsSchema.parse(options ?? {});
  if (!opts.onlyRoles || opts.onlyRoles.length === 0) {
    return [...messages];
  }
  return messages.filter((m) => opts.onlyRoles!.includes(m.role));
}
