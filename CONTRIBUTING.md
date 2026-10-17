# Contributing to unroll-chat

Thanks for your interest in contributing! This guide covers how to add new vendor parsers, new export formats, and general development setup.

## Dev Setup

```bash
# Prerequisites: Node.js 22+, pnpm 9+

git clone https://github.com/<your-username>/unroll-chat.git
cd unroll-chat
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # tsc + vite build → dist/
```

## Code Style

- **TypeScript strict mode** — no `any`, no implicit returns, no unchecked index access
- **Zod for validation** — all external data (parsed HTML, user input) goes through Zod schemas
- **ESM only** — use `.js` extensions in imports (TypeScript resolves them at compile time)
- **No classes for data** — prefer interfaces + plain objects; classes only for stateful services

## Adding a New Vendor Parser

Vendor parsers live in `src/parsers/`. Each parser implements the `VendorParser` interface.

### Step 1 — Create the parser file

Create `src/parsers/<vendor>.ts`:

```typescript
import type { VendorParser, Conversation } from './types.js';

export const myVendorParser: VendorParser = {
  name: 'MyVendor',

  urlPatterns: [
    /^https:\/\/myvendor\.com\/share\//,
  ],

  parse(html: string): Conversation {
    // 1. Parse the HTML string (use DOMParser in the browser)
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 2. Extract title, messages, metadata
    // 3. Return a Conversation object (validated by ConversationSchema)
    return {
      title: '...',
      source: '...',
      vendor: 'MyVendor',
      exportedAt: new Date().toISOString(),
      messages: [],
      metadata: { messageCount: 0 },
    };
  },
};
```

### Step 2 — Register it

Add your parser to the registry in `src/parsers/index.ts`:

```typescript
import { myVendorParser } from './myvendor.js';

export const parsers: VendorParser[] = [
  chatgptParser,
  myVendorParser,  // ← add here
];
```

### Step 3 — Add URL pattern tests

Verify your `urlPatterns` match real share URLs and reject non-matching ones. At minimum, test:

- A valid share URL returns your parser from `detectParser()`
- An unrelated URL does not match
- Edge cases (trailing slashes, query params, fragments)

## Adding a New Exporter

Exporters live in `src/exporters/`. Each exporter implements the `Exporter` interface.

### Step 1 — Create the exporter file

Create `src/exporters/<format>.ts`:

```typescript
import type { Exporter, ExportOptions } from './types.js';
import { filterMessages } from './types.js';
import type { Conversation } from '../parsers/types.js';

export const myFormatExporter: Exporter = {
  format: 'myformat',
  label: 'My Format',
  extension: 'mf',
  mimeType: 'application/x-myformat',

  export(conversation: Conversation, options?: ExportOptions): string {
    const messages = filterMessages(conversation.messages, options);
    // Build and return the formatted string
    return '...';
  },
};
```

### Step 2 — Register it

Add your exporter to the registry in `src/exporters/index.ts`:

```typescript
import { myFormatExporter } from './myformat.js';

export const exporters: Exporter[] = [
  markdownExporter,
  jsonExporter,
  textExporter,
  htmlExporter,
  pdfExporter,
  myFormatExporter,  // ← add here
];
```

### Step 3 — Add export button in UI

The export bar (`src/ui/components/export-bar.ts`) reads from the `exporters` array automatically — registering your exporter in the index file is enough for it to appear in the UI.

## Project Structure

```
src/
├── parsers/          # Vendor-specific HTML → Conversation parsers
│   ├── types.ts      # VendorParser interface + Zod schemas
│   ├── chatgpt.ts    # ChatGPT parser
│   └── index.ts      # Parser registry + detectParser()
├── exporters/        # Conversation → file format exporters
│   ├── types.ts      # Exporter interface + Zod schemas
│   ├── markdown.ts   # Markdown exporter
│   ├── json.ts       # JSON exporter
│   ├── text.ts       # Plain text exporter
│   ├── html.ts       # Self-contained HTML exporter
│   ├── pdf.ts        # PDF exporter (jsPDF)
│   └── index.ts      # Exporter registry + getExporter()
├── fetch/            # CORS proxy fetch layer
├── utils/            # download, clipboard, stats helpers
├── ui/               # UI components (vanilla TS, no framework)
│   ├── app.ts        # Main controller + state machine
│   ├── landing.ts    # URL input + hero screen
│   ├── processing.ts # Progress indicator
│   ├── preview.ts    # Conversation preview + export bar
│   ├── theme.ts      # Dark/light toggle
│   └── components/   # Reusable UI components
├── main.ts           # Entry point
└── style.css         # Tailwind + custom properties
```

## Questions?

Open an issue or start a discussion. We're happy to help!
