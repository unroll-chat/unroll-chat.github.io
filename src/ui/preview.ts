import type { Conversation } from '../parsers/types.js';
import { createExportBar } from './components/export-bar.js';
import { createStatsBar } from './components/stats-bar.js';
import { createMessageBubble } from './components/message-bubble.js';
import { calculateStats } from '../utils/stats.js';

/**
 * Screen 3: Conversation preview with export controls.
 */
export function createPreviewScreen(
  conversation: Conversation,
  onReset: () => void,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'screen screen--preview flex flex-col gap-4';

  // ── Header: title + vendor + count ──
  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center gap-3 mb-2';

  const title = document.createElement('h2');
  title.className = 'text-2xl font-bold text-[var(--color-on-surface)] truncate flex-1 min-w-0';
  title.textContent = conversation.title;
  title.title = conversation.title;
  header.appendChild(title);

  const vendorBadge = document.createElement('span');
  vendorBadge.className = 'vendor-badge';
  vendorBadge.textContent = conversation.vendor;
  header.appendChild(vendorBadge);

  const countBadge = document.createElement('span');
  countBadge.className = 'text-sm text-[var(--color-on-surface-muted)]';
  countBadge.textContent = `${conversation.messages.length} messages`;
  header.appendChild(countBadge);

  root.appendChild(header);

  // ── Export Bar ──
  root.appendChild(createExportBar(conversation));

  // ── Messages ──
  const messagesContainer = document.createElement('div');
  messagesContainer.className =
    'flex flex-col gap-1 max-h-[60vh] overflow-y-auto rounded-xl ' +
    'p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)]';

  for (const msg of conversation.messages) {
    messagesContainer.appendChild(createMessageBubble(msg));
  }
  root.appendChild(messagesContainer);

  // ── Stats Bar ──
  const stats = calculateStats(conversation);
  root.appendChild(createStatsBar(stats));

  // ── Reset Button ──
  const resetRow = document.createElement('div');
  resetRow.className = 'flex justify-center pt-2';
  const resetBtn = document.createElement('button');
  resetBtn.className =
    'inline-flex items-center gap-1.5 text-sm text-[var(--color-on-surface-muted)] hover:text-[var(--color-accent)] ' +
    'transition-colors cursor-pointer';
  resetBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/></svg> Unroll another`;
  resetBtn.addEventListener('click', onReset);
  resetRow.appendChild(resetBtn);
  root.appendChild(resetRow);

  return root;
}
