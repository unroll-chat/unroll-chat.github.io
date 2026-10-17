import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────

export const MessageRole = z.enum(['user', 'assistant', 'system']);

export const ContentType = z.enum(['text', 'code', 'image', 'mixed']);

export const MessageSchema = z.object({
  role: MessageRole,
  content: z.string(),
  contentType: ContentType,
  timestamp: z.string().optional(),
});

export const ConversationMetadataSchema = z.object({
  messageCount: z.number(),
  model: z.string().optional(),
  createdAt: z.string().optional(),
});

export const ConversationSchema = z.object({
  title: z.string(),
  source: z.string(),
  vendor: z.string(),
  exportedAt: z.string(),
  messages: z.array(MessageSchema),
  metadata: ConversationMetadataSchema,
});

// ── Inferred TypeScript Types ────────────────────────────────

export type Message = z.infer<typeof MessageSchema>;
export type ConversationMetadata = z.infer<typeof ConversationMetadataSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;

// ── VendorParser Interface ───────────────────────────────────

export interface VendorParser {
  /** Display name of the vendor (e.g. 'ChatGPT', 'Claude') */
  name: string;

  /** URL patterns this parser can handle */
  urlPatterns: RegExp[];

  /** Parse raw HTML from a share page into a structured Conversation */
  parse(html: string): Conversation;
}
