import { chatgptParser } from './chatgpt.js';
import type { VendorParser } from './types.js';

// ── Parser Registry ──────────────────────────────────────────

export const parsers: VendorParser[] = [
  chatgptParser,
];

/**
 * Detect the correct parser for a given share URL.
 * Returns null if no parser matches.
 */
export function detectParser(url: string): VendorParser | null {
  for (const parser of parsers) {
    if (parser.urlPatterns.some((pattern) => pattern.test(url))) {
      return parser;
    }
  }
  return null;
}

/**
 * Look up a parser by its vendor name (case-insensitive).
 * Returns null if no parser matches.
 */
export function getParserByName(name: string): VendorParser | null {
  const lower = name.toLowerCase();
  return parsers.find((p) => p.name.toLowerCase() === lower) ?? null;
}

// Re-export types for convenience
export type { VendorParser, Conversation, Message, ConversationMetadata } from './types.js';
export { ConversationSchema, MessageSchema, ConversationMetadataSchema } from './types.js';
