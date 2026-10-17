import type { Conversation } from '../../parsers/types.js';
import { exporters } from '../../exporters/index.js';
import { markdownExporter } from '../../exporters/markdown.js';
import { downloadFile } from '../../utils/download.js';
import { copyToClipboard } from '../../utils/clipboard.js';

// ── Phosphor Icons ───────────────────────────────────────────

const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>`;
const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>`;
const ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z"/></svg>`;

/**
 * Create the export action bar with format buttons and a copy button.
 */
export function createExportBar(conversation: Conversation): HTMLElement {
  const bar = document.createElement('div');
  bar.className =
    'flex flex-wrap items-center gap-2 py-3 px-4 rounded-xl ' +
    'bg-[var(--color-surface-alt)] border border-[var(--color-border)]';

  // Format download buttons
  for (const exp of exporters) {
    const btn = document.createElement('button');
    btn.className = 'export-btn';
    btn.innerHTML = `${ICON_DOWNLOAD} ${exp.label}`;
    btn.title = `Download as .${exp.extension}`;

    btn.addEventListener('click', async () => {
      try {
        const result = await exp.export(conversation);
        const slug = conversation.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 60);
        const filename = `${slug}.${exp.extension}`;
        downloadFile(result, filename, exp.mimeType);
      } catch (err) {
        console.error(`Export to ${exp.format} failed:`, err);
      }
    });

    bar.appendChild(btn);
  }

  // Separator
  const sep = document.createElement('div');
  sep.className = 'w-px h-6 bg-[var(--color-border)] mx-1';
  bar.appendChild(sep);

  // Copy MD button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'export-btn export-btn--copy';
  copyBtn.innerHTML = `${ICON_COPY} Copy MD`;
  copyBtn.addEventListener('click', async () => {
    const md = markdownExporter.export(conversation) as string;
    const ok = await copyToClipboard(md);
    if (ok) {
      copyBtn.innerHTML = `${ICON_CHECK} Copied!`;
      setTimeout(() => {
        copyBtn.innerHTML = `${ICON_COPY} Copy MD`;
      }, 2000);
    }
  });
  bar.appendChild(copyBtn);

  return bar;
}
