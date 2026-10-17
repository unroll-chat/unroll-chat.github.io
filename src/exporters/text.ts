import type { Conversation } from '../parsers/types.js';
import type { Exporter, ExportOptions } from './types.js';
import { ExportOptionsSchema, filterMessages } from './types.js';

const SEPARATOR = '─'.repeat(60);

function roleLabel(role: string): string {
  return `[${role.toUpperCase()}]`;
}

export const textExporter: Exporter = {
  format: 'text',
  label: 'Plain Text',
  extension: 'txt',
  mimeType: 'text/plain',

  export(conversation: Conversation, options?: ExportOptions): string {
    const opts = ExportOptionsSchema.parse(options ?? {});
    const messages = filterMessages(conversation.messages, opts);
    const lines: string[] = [];

    // ── Title ─────────────────────────────────────────────
    lines.push(conversation.title);
    lines.push('='.repeat(conversation.title.length));
    lines.push('');

    // ── Metadata ──────────────────────────────────────────
    if (opts.includeMetadata) {
      lines.push(`Source:      ${conversation.source}`);
      lines.push(`Vendor:      ${conversation.vendor}`);
      lines.push(`Exported at: ${conversation.exportedAt}`);
      if (conversation.metadata.model) {
        lines.push(`Model:       ${conversation.metadata.model}`);
      }
      if (conversation.metadata.createdAt) {
        lines.push(`Created:     ${conversation.metadata.createdAt}`);
      }
      lines.push(`Messages:    ${conversation.metadata.messageCount}`);
      lines.push('');
    }

    lines.push(SEPARATOR);
    lines.push('');

    // ── Messages ──────────────────────────────────────────
    for (const msg of messages) {
      lines.push(roleLabel(msg.role));
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push(SEPARATOR);
      lines.push('');
    }

    return lines.join('\n');
  },
};
