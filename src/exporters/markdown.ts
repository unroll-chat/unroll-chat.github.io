import type { Conversation } from '../parsers/types.js';
import type { Exporter, ExportOptions } from './types.js';
import { ExportOptionsSchema, filterMessages } from './types.js';

function roleHeading(role: string): string {
  switch (role) {
    case 'user':
      return '## User';
    case 'assistant':
      return '## Assistant';
    case 'system':
      return '## System';
    default:
      return `## ${role}`;
  }
}

export const markdownExporter: Exporter = {
  format: 'markdown',
  label: 'Markdown',
  extension: 'md',
  mimeType: 'text/markdown',

  export(conversation: Conversation, options?: ExportOptions): string {
    const opts = ExportOptionsSchema.parse(options ?? {});
    const messages = filterMessages(conversation.messages, opts);
    const lines: string[] = [];

    // ── Title ─────────────────────────────────────────────
    lines.push(`# ${conversation.title}`);
    lines.push('');

    // ── Metadata block ────────────────────────────────────
    if (opts.includeMetadata) {
      lines.push('> **Source:** ' + conversation.source);
      lines.push('> **Vendor:** ' + conversation.vendor);
      lines.push('> **Exported at:** ' + conversation.exportedAt);
      if (conversation.metadata.model) {
        lines.push('> **Model:** ' + conversation.metadata.model);
      }
      if (conversation.metadata.createdAt) {
        lines.push('> **Created:** ' + conversation.metadata.createdAt);
      }
      lines.push(`> **Messages:** ${conversation.metadata.messageCount}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // ── Messages ──────────────────────────────────────────
    for (const msg of messages) {
      lines.push(roleHeading(msg.role));
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  },
};
