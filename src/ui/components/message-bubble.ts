import type { Message } from '../../parsers/types.js';

/**
 * Render simple markdown-like content to HTML.
 * Handles: code blocks, inline code, bold, italic, links.
 */
function renderContent(raw: string): string {
  let html = escapeHtml(raw);

  // Code blocks: ```lang\n...\n```
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre class="msg-code-block"><code>${code.trim()}</code></pre>`,
  );

  // Inline code: `...`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="msg-inline-code">$1</code>',
  );

  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *...*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Convert newlines to <br> (outside of <pre> blocks)
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Create a DOM element for a single chat message.
 */
export function createMessageBubble(message: Message): HTMLElement {
  const isUser = message.role === 'user';

  const wrapper = document.createElement('div');
  wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;

  const bubble = document.createElement('div');
  bubble.className = isUser
    ? 'msg-bubble msg-bubble--user'
    : 'msg-bubble msg-bubble--assistant';

  // Role label
  const label = document.createElement('div');
  label.className = 'msg-role-label';
  label.textContent = isUser ? 'You' : 'Assistant';
  bubble.appendChild(label);

  // Content
  const body = document.createElement('div');
  body.className = 'msg-body';
  body.innerHTML = renderContent(message.content);
  bubble.appendChild(body);

  wrapper.appendChild(bubble);
  return wrapper;
}
