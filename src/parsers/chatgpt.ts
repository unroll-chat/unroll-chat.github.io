import {
  ConversationSchema,
  ContentType,
  type Conversation,
  type VendorParser,
} from './types.js';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Decode the escaped unicode string embedded in the React Router script.
 *
 * The Python version does:
 *   raw.encode("utf-8").decode("unicode_escape").encode("latin-1").decode("utf-8")
 *
 * In JS we replicate this by resolving `\uXXXX` sequences, then fixing
 * the multi-byte UTF-8 that was encoded as latin-1 code-points.
 */
function decodeEscapedUnicode(raw: string): string {
  // Step 1: resolve \uXXXX / \n / \t / \\ / \" escape sequences
  const unescaped = raw.replace(
    /\\u([0-9a-fA-F]{4})|\\([nrt\\"\/])/g,
    (_, hex: string | undefined, ch: string | undefined) => {
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      switch (ch) {
        case 'n':  return '\n';
        case 'r':  return '\r';
        case 't':  return '\t';
        case '\\': return '\\';
        case '"':  return '"';
        case '/':  return '/';
        default:   return ch ?? '';
      }
    },
  );

  // Step 2: re-encode as latin-1 bytes then decode as UTF-8
  // Each char in `unescaped` is a latin-1 byte (0-255).
  try {
    const bytes = new Uint8Array(unescaped.length);
    for (let i = 0; i < unescaped.length; i++) {
      bytes[i] = unescaped.charCodeAt(i) & 0xff;
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    // Fallback: return the simpler unescaped version
    return unescaped;
  }
}

/**
 * Get a string value at an index in the flat data array.
 */
function getString(data: unknown[], idx: unknown): string | null {
  if (typeof idx === 'number' && idx >= 0 && idx < data.length && typeof data[idx] === 'string') {
    return data[idx] as string;
  }
  return null;
}

/**
 * Resolve a pointer-reference object at `objIdx` into a plain record.
 *
 * ChatGPT turbo-stream objects look like `{ _3: 7, _5: 9 }` where
 * the key index (_N) points to the key string in `data[N]` and the
 * value is either an index into data or a literal.
 */
function resolveObject(data: unknown[], objIdx: number): Record<string, unknown> | null {
  const obj = data[objIdx];
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null;

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const keyIdx = parseInt(k.replace(/^_/, ''), 10);
    const keyName = (keyIdx < data.length && typeof data[keyIdx] === 'string')
      ? data[keyIdx] as string
      : k;
    result[keyName] = v;
  }
  return result;
}

// ── Core Parsing Functions ───────────────────────────────────

/**
 * Extract and parse the React Router turbo-stream data from the HTML page.
 */
function extractStreamData(html: string): unknown[] {
  const match = html.match(
    /window\.__reactRouterContext\.streamController\.enqueue\("(.*?)"\);/s,
  );
  if (!match) {
    throw new Error(
      'Could not find turbo-stream data in page. ' +
      'The page might require authentication or the format may have changed.',
    );
  }

  // The captured string is a JS string literal content (inside double quotes).
  // It contains double-escaped sequences like \\n, \\", \\u0026, etc.
  // Step 1: Use JSON.parse to unwrap the JS string escaping layer.
  //         This converts \\n → \n, \\" → ", \\u0026 → &, etc.
  let jsonString: string;
  try {
    jsonString = JSON.parse(`"${match[1]}"`);
  } catch {
    // Fallback: try the old decode approach
    jsonString = decodeEscapedUnicode(match[1]);
  }

  // Step 2: Parse the resulting JSON array.
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error(
      `Failed to parse stream data as JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!Array.isArray(data)) {
    throw new Error('Stream data is not an array.');
  }

  return data;
}

/**
 * Find the `linear_conversation` array — ordered message node indices.
 */
function findLinearConversation(data: unknown[]): number[] {
  for (let i = 0; i < data.length; i++) {
    if (
      data[i] === 'linear_conversation' &&
      i + 1 < data.length &&
      Array.isArray(data[i + 1]) &&
      (data[i + 1] as unknown[]).every((x) => typeof x === 'number')
    ) {
      return data[i + 1] as number[];
    }
  }
  throw new Error('Could not find linear_conversation in stream data.');
}

/**
 * Find the conversation title from the flat data array.
 */
function findTitle(data: unknown[]): string {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 'pageTitle' && i + 1 < data.length && typeof data[i + 1] === 'string') {
      return data[i + 1] as string;
    }
  }
  return 'ChatGPT Conversation';
}

/**
 * Map ChatGPT content_type values to our ContentType enum.
 */
function mapContentType(raw: string | null): 'text' | 'code' | 'image' | 'mixed' {
  if (!raw) return 'text';
  const parsed = ContentType.safeParse(raw);
  if (parsed.success) return parsed.data;
  // ChatGPT uses 'multimodal_text' for mixed content
  if (raw === 'multimodal_text') return 'mixed';
  return 'text';
}

/**
 * Parse all messages from the turbo-stream data in conversation order.
 */
function parseMessages(
  data: unknown[],
  linearConv: number[],
): Array<{ role: 'user' | 'assistant'; content: string; contentType: 'text' | 'code' | 'image' | 'mixed' }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string; contentType: 'text' | 'code' | 'image' | 'mixed' }> = [];

  for (const nodeIdx of linearConv) {
    if (nodeIdx >= data.length) continue;

    const node = resolveObject(data, nodeIdx);
    if (!node || !('message' in node)) continue;

    const msgIdx = node['message'];
    if (typeof msgIdx !== 'number' || msgIdx >= data.length) continue;

    const msg = resolveObject(data, msgIdx);
    if (!msg) continue;

    // ── Extract author role ──
    let role: string | null = null;
    const authorIdx = msg['author'];
    if (typeof authorIdx === 'number' && authorIdx < data.length) {
      const authorRaw = data[authorIdx];
      if (typeof authorRaw === 'object' && authorRaw !== null && !Array.isArray(authorRaw)) {
        for (const [k, v] of Object.entries(authorRaw as Record<string, unknown>)) {
          const ki = parseInt(k.replace(/^_/, ''), 10);
          if (ki < data.length && data[ki] === 'role' && typeof v === 'number') {
            role = getString(data, v);
            break;
          }
        }
      }
    }

    // ── Extract content parts ──
    let partsText = '';
    let contentType: string | null = null;
    const contentIdx = msg['content'];
    if (typeof contentIdx === 'number' && contentIdx < data.length) {
      const contentRaw = data[contentIdx];
      if (typeof contentRaw === 'object' && contentRaw !== null && !Array.isArray(contentRaw)) {
        for (const [k, v] of Object.entries(contentRaw as Record<string, unknown>)) {
          const ki = parseInt(k.replace(/^_/, ''), 10);
          if (ki >= data.length) continue;

          const keyName = data[ki];

          // Extract text parts
          if (keyName === 'parts' && typeof v === 'number') {
            const partsArr = data[v];
            if (Array.isArray(partsArr)) {
              for (const p of partsArr) {
                const text = getString(data, p);
                if (text) partsText += text;
              }
            }
          }

          // Extract content_type
          if (keyName === 'content_type' && typeof v === 'number') {
            contentType = getString(data, v);
          }
        }
      }
    }

    if ((role === 'user' || role === 'assistant') && partsText) {
      messages.push({
        role,
        content: partsText,
        contentType: mapContentType(contentType),
      });
    }
  }

  return messages;
}

// ── ChatGPT VendorParser ─────────────────────────────────────

export const chatgptParser: VendorParser = {
  name: 'ChatGPT',

  urlPatterns: [
    /chatgpt\.com\/share\//,
    /chat\.openai\.com\/share\//,
  ],

  parse(html: string): Conversation {
    if (!html || !html.trim()) {
      throw new Error('Empty HTML input.');
    }

    const data = extractStreamData(html);
    const title = findTitle(data);
    const linearConv = findLinearConversation(data);
    const messages = parseMessages(data, linearConv);

    if (messages.length === 0) {
      throw new Error(
        'No messages found. The conversation might be empty or the format has changed.',
      );
    }

    const conversation = ConversationSchema.parse({
      title,
      source: 'chatgpt-share',
      vendor: 'OpenAI',
      exportedAt: new Date().toISOString(),
      messages,
      metadata: {
        messageCount: messages.length,
      },
    });

    return conversation;
  },
};
