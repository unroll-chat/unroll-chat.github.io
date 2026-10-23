import { parsers } from '../parsers/index.js';
import { validateShareUrl } from '../utils/validate-url.js';

export interface LandingCallbacks {
  onSubmitUrl: (url: string) => void;
  onSubmitHtml: (html: string) => void;
}

const MAX_SOURCE_CHARACTERS = 2_000_000;

// ── Phosphor Icons (inline SVG, regular weight) ─────────────

const ICON_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 256 256" fill="currentColor"><path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>`;
const ICON_ARROW_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>`;
const ICON_CARET_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>`;
const ICON_BRAIN = `<img src="/brand/claude.png" width="20" height="20" alt="" class="vendor-icon vendor-icon--claude" />`;
const ICON_SPARKLES = `<img src="/brand/gemini.svg" width="20" height="20" alt="" class="vendor-icon vendor-icon--gemini" />`;
const ICON_CHAT_GPT = `<img src="/brand/openai-blossom.svg" width="20" height="20" alt="" class="vendor-icon" />`;

const vendorIcons: Record<string, string> = {
  ChatGPT: ICON_CHAT_GPT,
  Claude: ICON_BRAIN,
  Gemini: ICON_SPARKLES,
};

/**
 * Screen 1: Landing — hero, URL input, source paste fallback.
 * Faithful port of the v0.dev UnrollLanding React component.
 */
export function createLandingScreen(cb: LandingCallbacks): HTMLElement {
  let pageSource = '';
  let isLoading = false;

  const root = document.createElement('div');
  root.className = 'screen flex flex-1 items-center justify-center py-24 sm:py-20';

  const section = document.createElement('section');
  section.className = 'w-full max-w-[560px]';
  section.setAttribute('aria-labelledby', 'page-title');
  root.appendChild(section);

  // ── Brand Header ──
  const header = document.createElement('header');
  header.className = 'mb-9 text-center';
  header.innerHTML = `
    <h1 id="page-title" class="inline-flex items-center text-[2.5rem] font-semibold leading-none tracking-[-0.065em] text-(--text-primary)">
      <span>unroll</span><span class="text-[#f59e0b]">.</span><span>chat</span>
    </h1>
    <p class="mt-3 text-[15px] text-(--text-secondary)">
      Save any shared AI conversation as Markdown, PDF, HTML, JSON, or plain text.
    </p>
  `;
  section.appendChild(header);

  // ── Form ──
  const form = document.createElement('form');
  form.className = 'w-full';
  section.appendChild(form);

  // URL Input Shell
  const inputShell = document.createElement('div');
  inputShell.className =
    'share-link-shell flex h-14 w-full items-center rounded-lg border bg-[var(--surface-bg)] px-4 transition-colors duration-150';
  inputShell.innerHTML = `<span class="shrink-0 text-(--text-muted)">${ICON_LINK}</span>`;

  const urlInput = document.createElement('input');
  urlInput.id = 'share-link';
  urlInput.name = 'shareLink';
  urlInput.type = 'text';
  urlInput.inputMode = 'url';
  urlInput.setAttribute('autocomplete', 'url');
  urlInput.spellcheck = false;
  urlInput.placeholder = 'Paste a share link...';
  urlInput.className =
    'min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]';
  urlInput.addEventListener('input', clearNotice);
  inputShell.appendChild(urlInput);
  form.appendChild(inputShell);

  // Unroll Button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className =
    'relative mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-[#f59e0b] px-4 font-semibold text-[#0a0a0b] transition-colors duration-150 hover:bg-[#fbbf24] active:bg-[#f59e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] disabled:cursor-wait disabled:opacity-80';
  setButtonIdle();
  form.appendChild(submitBtn);

  // Supported Platforms
  const platformsList = document.createElement('ul');
  platformsList.setAttribute('aria-label', 'Supported platforms');
  platformsList.className = 'mt-6 flex list-none items-center justify-center gap-2 p-0';

  const registeredNames = parsers.map((p) => p.name);
  const allVendors = ['ChatGPT', 'Claude', 'Gemini'];
  for (const name of allVendors) {
    const li = document.createElement('li');
    li.className = 'vendor-pill';
    const icon = vendorIcons[name] || '';
    li.innerHTML = `${icon}<span>${name}</span>`;
    if (!registeredNames.includes(name)) {
      li.style.opacity = '0.5';
      li.title = 'Coming soon';
    }
    platformsList.appendChild(li);
  }
  form.appendChild(platformsList);

  // ── Source Disclosure (paste fallback) ──
  const details = document.createElement('details');
  details.className = 'group mt-6 w-full';

  const summary = document.createElement('summary');
  summary.className =
    'flex cursor-pointer list-none items-center justify-center gap-2 rounded-sm py-1 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]';
  summary.innerHTML = `<span>Or paste page source directly</span><span class="transition-transform duration-150 group-open:rotate-180">${ICON_CARET_DOWN}</span>`;
  details.appendChild(summary);

  const textareaWrap = document.createElement('div');
  textareaWrap.className = 'mt-3';

  const srLabel = document.createElement('label');
  srLabel.className = 'sr-only';
  srLabel.htmlFor = 'page-source';
  srLabel.textContent = 'Page source HTML';
  textareaWrap.appendChild(srLabel);

  const textarea = document.createElement('textarea');
  textarea.id = 'page-source';
  textarea.name = 'pageSource';
  textarea.rows = 6;
  textarea.spellcheck = false;
  textarea.placeholder = 'Paste the page source here...';
  textarea.className =
    'source-textarea w-full resize-y rounded-lg border bg-[var(--surface-bg)] p-4 text-sm leading-6 text-[var(--text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--text-muted)]';
  textarea.addEventListener('input', () => {
    pageSource = textarea.value;
    clearNotice();
  });
  textareaWrap.appendChild(textarea);

  const hint = document.createElement('p');
  hint.className = 'mt-2 text-xs text-[var(--text-muted)]';
  hint.textContent = 'Pasted source is parsed locally in this browser.';
  textareaWrap.appendChild(hint);

  details.appendChild(textareaWrap);
  form.appendChild(details);

  // ── Notice ──
  const notice = document.createElement('p');
  notice.id = 'form-status';
  notice.className = 'unroll-notice mt-3 hidden';
  form.appendChild(notice);

  // ── Form Handler ──
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isLoading) return;

    const shareLink = urlInput.value.trim();
    const source = pageSource.trim();

    if (!shareLink && !source) {
      showNotice('error', 'Paste a share link or page source to get started.');
      return;
    }

    if (source.length > MAX_SOURCE_CHARACTERS) {
      showNotice('error', 'Source is too large to process.');
      return;
    }

    if (source) {
      cb.onSubmitHtml(source);
      return;
    }

    try {
      const result = validateShareUrl(shareLink);
      if (!result.valid) {
        showNotice('error', result.error);
        return;
      }
      setLoading(true);
      cb.onSubmitUrl(result.sanitizedUrl);
    } catch {
      showNotice('error', 'Enter a valid share URL.');
      return;
    }
  });

  // ── Helpers ──
  function showNotice(tone: 'error' | 'success', message: string): void {
    notice.textContent = message;
    notice.dataset.tone = tone;
    notice.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    notice.classList.remove('hidden');
  }

  function clearNotice(): void {
    notice.classList.add('hidden');
  }

  function setButtonIdle(): void {
    submitBtn.innerHTML = `<span>Unroll</span><span class="absolute right-4">${ICON_ARROW_RIGHT}</span>`;
  }

  function setLoading(loading: boolean): void {
    isLoading = loading;
    submitBtn.disabled = loading;
    submitBtn.setAttribute('aria-busy', String(loading));
    if (loading) {
      submitBtn.innerHTML = '<span>Unrolling…</span>';
    } else {
      setButtonIdle();
    }
  }

  return root;
}
