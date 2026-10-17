import type { ConversationStats } from '../../utils/stats.js';

/**
 * Render a horizontal stats strip.
 */
export function createStatsBar(stats: ConversationStats): HTMLElement {
  const bar = document.createElement('div');
  bar.className =
    'flex items-center gap-4 text-sm text-[var(--color-on-surface-muted)] py-2';

  const items = [
    `Messages: ${stats.messageCount}`,
    `Words: ${stats.wordCount.toLocaleString()}`,
    `Code blocks: ${stats.codeBlockCount}`,
  ];

  for (let i = 0; i < items.length; i++) {
    if (i > 0) {
      const dot = document.createElement('span');
      dot.textContent = '·';
      dot.className = 'select-none';
      bar.appendChild(dot);
    }
    const span = document.createElement('span');
    span.textContent = items[i];
    bar.appendChild(span);
  }

  return bar;
}
