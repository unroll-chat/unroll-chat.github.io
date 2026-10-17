import type { Exporter } from './types.js';
import { markdownExporter } from './markdown.js';
import { jsonExporter } from './json.js';
import { textExporter } from './text.js';
import { htmlExporter } from './html.js';
import { pdfExporter } from './pdf.js';

// ── Registry ─────────────────────────────────────────────────

/** All available exporters, ordered for UI display */
export const exporters: Exporter[] = [
  markdownExporter,
  jsonExporter,
  textExporter,
  htmlExporter,
  pdfExporter,
];

// ── Lookup ───────────────────────────────────────────────────

/**
 * Find an exporter by format identifier (case-insensitive).
 * Returns `null` if no exporter matches.
 */
export function getExporter(format: string): Exporter | null {
  const key = format.toLowerCase();
  return exporters.find((e) => e.format === key) ?? null;
}

// ── Re-exports ───────────────────────────────────────────────

export type { Exporter, ExportOptions } from './types.js';
export { ExportOptionsSchema, filterMessages } from './types.js';
export { markdownExporter } from './markdown.js';
export { jsonExporter } from './json.js';
export { textExporter } from './text.js';
export { htmlExporter } from './html.js';
export { pdfExporter } from './pdf.js';
