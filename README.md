# unroll.chat

**Save any shared AI conversation as Markdown, PDF, HTML, JSON, or plain text.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Paste a ChatGPT, Claude, or Gemini share link and instantly export the full conversation — no login, no sign-up, everything runs in your browser.

## Features

- **One-click export** — paste a share link, hit Unroll, pick your format
- **5 export formats** — Markdown, JSON, plain text, HTML, PDF
- **Copy to clipboard** — one-click Markdown copy
- **Dark / Light theme** — toggleable, persisted to localStorage
- **Conversation stats** — message count, word count, code blocks, estimated tokens
- **100% client-side** — no conversation data ever leaves your browser
- **Paste source fallback** — works even when the proxy can't reach the page
- **Extensible** — pluggable vendor parsers and export formats

## How It Works

```
Share link → Fetch via CORS proxy → Parse conversation → Export
```

1. You paste a share link (e.g. `https://chatgpt.com/share/abc123`)
2. The page HTML is fetched through a Cloudflare Worker proxy
3. A vendor-specific parser extracts the conversation (title, messages, metadata)
4. You pick an export format — done

The proxy only relays HTML. Your conversation content is parsed and formatted entirely in the browser.

## Security

Multiple layers protect the proxy from abuse:

| Layer | Where | What |
|---|---|---|
| URL validation | Client | Domain whitelist, path pattern check, HTTPS-only, sanitization |
| Response cache | Client | Same URL served from memory for 5 min (zero network calls) |
| Rate limit | Client | 5/min, 50/day per browser (localStorage, blocks before network call) |
| Origin lock | Worker | Only requests from `unroll-chat.github.io` / `unroll.chat` accepted |
| Rate limit | Worker | 10/min, 100/day per IP |
| Domain whitelist | Worker | Only fetches from known AI chat domains |

## Quick Start

```bash
git clone https://github.com/unroll-chat/unroll-chat.github.io.git
cd unroll-chat.github.io

# Install dependencies
pnpm install

# Start the dev server (includes a local CORS proxy)
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) and paste a share link.

> **Note:** Requires Node.js 22.13+. The dev server includes a built-in proxy so CORS isn't an issue locally.

## Deploy

The site is hosted on GitHub Pages via the `unroll-chat` org. Push to `main` and GitHub Actions builds and deploys automatically.

The Cloudflare Worker proxy (`worker/cors-proxy.js`) is deployed separately — see the comments in that file for setup instructions.

## Supported Vendors

| Vendor  | Status |
|---------|--------|
| ChatGPT | Supported |
| Claude  | Coming soon |
| Gemini  | Coming soon |

Want to add a vendor? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Export Formats

| Format   | Extension | Description |
|----------|-----------|-------------|
| Markdown | `.md`     | Clean Markdown with headings, code blocks, and metadata |
| JSON     | `.json`   | Structured conversation data (Zod-validated schema) |
| Text     | `.txt`    | Plain text, human-readable |
| HTML     | `.html`   | Self-contained styled HTML document |
| PDF      | `.pdf`    | Printable PDF via jsPDF |

## Tech Stack

- **TypeScript 7** (strict mode) + **Zod 4** (runtime validation)
- **Vite 8** (dev server + bundler)
- **Tailwind CSS 4** (utility-first styling)
- **jsPDF** (client-side PDF generation)
- **Vanilla TS** — no React, no framework, minimal bundle
- **Phosphor Icons** (inline SVG, no dependency)
- **Cloudflare Worker** (CORS proxy, free tier)

## Project Structure

```
src/
  parsers/       Vendor-specific HTML parsers (ChatGPT, Claude, Gemini)
  exporters/     Output format generators (MD, JSON, TXT, HTML, PDF)
  fetch/         CORS proxy layer (dev proxy + Cloudflare Worker client)
  ui/            Vanilla TS DOM screens (landing, processing, preview)
  utils/         URL validation, stats, clipboard, download helpers
worker/
  cors-proxy.js  Cloudflare Worker source (deploy separately)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new vendor parsers, exporters, and development guidelines.

## License

[MIT](LICENSE) © 2026
