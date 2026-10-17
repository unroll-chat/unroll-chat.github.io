import type { Conversation } from '../parsers/types.js';

export interface ConversationStats {
  messageCount: number;
  wordCount: number;
  codeBlockCount: number;
  estimatedTokens: number;
}

/**
 * Calculate aggregate statistics for a conversation.
 */
export function calculateStats(conversation: Conversation): ConversationStats {
  const { messages } = conversation;
  const messageCount = messages.length;

  let wordCount = 0;
  let codeBlockCount = 0;

  for (const msg of messages) {
    // Words: split on whitespace, filter empty
    const words = msg.content.split(/\s+/).filter((w) => w.length > 0);
    wordCount += words.length;

    // Code blocks: count ``` fence pairs
    const fences = msg.content.match(/```/g);
    if (fences) {
      codeBlockCount += Math.floor(fences.length / 2);
    }
  }

  const estimatedTokens = Math.round(wordCount * 1.3);

  return { messageCount, wordCount, codeBlockCount, estimatedTokens };
}
