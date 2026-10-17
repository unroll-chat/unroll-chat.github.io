import type { Conversation } from '../parsers/types.js';
import { detectParser, parsers } from '../parsers/index.js';
import { fetchSharePage } from '../fetch/index.js';
import { createLandingScreen } from './landing.js';
import { createProcessingScreen } from './processing.js';
import { createPreviewScreen } from './preview.js';
import { toggleTheme, getTheme } from './theme.js';

// ── Phosphor Icons ───────────────────────────────────────────

const ICON_SUN = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>`;
const ICON_MOON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg>`;
const ICON_ARROW_LEFT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/></svg>`;

// ── App Controller ───────────────────────────────────────────

export function initApp(): void {
  const container = document.getElementById('app');
  if (!container) throw new Error('#app element not found');

  // ── Root layout (matches v0 design: full-page, theme scoped) ──
  container.innerHTML = '';
  container.className = 'unroll-page flex min-h-svh flex-col px-5';
  container.dataset.theme = getTheme();

  // Top bar with theme toggle (proper flex row, no overlap)
  const topBar = document.createElement('div');
  topBar.className = 'flex items-center justify-end pt-4 pb-0';

  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.className =
    'flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-bg)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]';
  updateThemeBtn();
  themeBtn.addEventListener('click', () => {
    const next = toggleTheme();
    container.dataset.theme = next;
    updateThemeBtn();
  });
  topBar.appendChild(themeBtn);
  container.appendChild(topBar);

  // Main content area
  const mainEl = document.createElement('main');
  mainEl.className = 'flex flex-1 flex-col';
  container.appendChild(mainEl);

  // Footer
  const footer = createFooter();
  container.appendChild(footer);

  // ── Screen management ──
  function showScreen(el: HTMLElement): void {
    mainEl.innerHTML = '';
    mainEl.appendChild(el);
  }

  function showLanding(): void {
    showScreen(
      createLandingScreen({
        onSubmitUrl: (url) => void handleUrl(url),
        onSubmitHtml: (html) => void handleHtml(html, ''),
      }),
    );
  }

  // ── Processing pipeline ──
  async function handleUrl(url: string): Promise<void> {
    const proc = createProcessingScreen();
    showScreen(proc.root);
    proc.setStep('Fetching page…');

    let html: string;
    try {
      html = await fetchSharePage(url);
      proc.setDone('Page fetched');
    } catch (err) {
      proc.setError(err instanceof Error ? err.message : String(err));
      appendRetry(proc.root);
      return;
    }

    await handleHtml(html, url, proc);
  }

  async function handleHtml(
    html: string,
    url: string,
    proc?: ReturnType<typeof createProcessingScreen>,
  ): Promise<void> {
    if (!proc) {
      proc = createProcessingScreen();
      showScreen(proc.root);
    }

    proc.setStep('Parsing conversation…');

    let conversation: Conversation;
    try {
      const parser = url ? detectParser(url) : null;

      if (parser) {
        conversation = parser.parse(html);
      } else {
        let lastErr: unknown;
        let found = false;
        for (const p of parsers) {
          try {
            conversation = p.parse(html);
            found = true;
            break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!found) {
          throw lastErr ?? new Error('No parser could handle this content');
        }
        conversation = conversation!;
      }

      proc.setDone(`Found ${conversation.messages.length} messages`);
    } catch (err) {
      proc.setError(`Parse failed: ${err instanceof Error ? err.message : String(err)}`);
      appendRetry(proc.root);
      return;
    }

    await delay(500);
    showScreen(createPreviewScreen(conversation, showLanding));
  }

  function appendRetry(parent: HTMLElement): void {
    const btn = document.createElement('button');
    btn.className = 'mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline cursor-pointer';
    btn.innerHTML = `${ICON_ARROW_LEFT} Try again`;
    btn.addEventListener('click', showLanding);
    parent.appendChild(btn);
  }

  function updateThemeBtn(): void {
    const t = getTheme();
    themeBtn.innerHTML = t === 'dark' ? ICON_SUN : ICON_MOON;
    themeBtn.setAttribute(
      'aria-label',
      t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    );
  }

  // ── Boot ──
  showLanding();
}

// ── Footer ───────────────────────────────────────────────────

function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'pb-7 pt-4 text-center text-[11px] text-[var(--text-muted)]';

  const p = document.createElement('p');
  p.className = 'flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2';
  p.innerHTML = `
    <span>Open source</span>
    <span aria-hidden="true">·</span>
    <a href="https://github.com/unroll-chat" target="_blank" rel="noreferrer"
       class="inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]">
      <img src="/brand/github-dark.svg" alt="" aria-hidden="true" width="13" height="13" class="size-[13px] dark-only" />
      <img src="/brand/github-light.svg" alt="" aria-hidden="true" width="13" height="13" class="size-[13px] light-only" />
      <span>GitHub</span>
    </a>
    <span aria-hidden="true">·</span>
    <span>Privacy: nothing leaves your browser</span>
  `;
  footer.appendChild(p);
  return footer;
}

// ── Helpers ──────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
