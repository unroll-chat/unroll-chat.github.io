import type { Conversation } from '../parsers/types.js';
import type { Exporter, ExportOptions } from './types.js';
import { ExportOptionsSchema, filterMessages } from './types.js';

export const jsonExporter: Exporter = {
  format: 'json',
  label: 'JSON',
  extension: 'json',
  mimeType: 'application/json',

  export(conversation: Conversation, options?: ExportOptions): string {
    const opts = ExportOptionsSchema.parse(options ?? {});
    const messages = filterMessages(conversation.messages, opts);

    const output = {
      ...conversation,
      messages,
    };

    // Pretty-printed, preserve unicode (no ensure_ascii escaping)
    return JSON.stringify(output, null, 2);
  },
};
