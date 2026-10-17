// ── CORS Proxy Layer ─────────────────────────────────────────
//
// The browser can't fetch share pages directly (CORS blocks it).
//
// Strategy:
//   DEV MODE  → Vite dev server proxy at /api/fetch?url=...
//               Fetches server-side from your machine (same as curl).
//
//   PROD MODE → Self-hosted Cloudflare Worker (primary)
//               Client-side rate limiting prevents unnecessary calls.
//               Falls back to paste-source fallback.

const isDev = import.meta.env.DEV;

/**
 * Set this to your deployed Cloudflare Worker URL.
 * Example: 'https://unroll-proxy.your-name.workers.dev'
 *
 * Deploy instructions: see worker/cors-proxy.js
 */
const SELF_HOSTED_PROXY: string | null = null;

// ── Client-side Rate Limiting ────────────────────────────────
// Enforced BEFORE any network request. No call hits Cloudflare
// if the client is over the limit. Persisted in localStorage so
// refreshing the page doesn't reset the counters.

const RL_STORAGE_KEY = 'unroll_rate_limit';
const RL_PER_MINUTE = 5;
const RL_PER_DAY = 50;

interface RateLimitState {
  /** Timestamps of requests in the current minute window */
  minuteLog: number[];
  /** Timestamps of requests in the current day window */
  dayLog: number[];
}

function loadRateLimitState(): RateLimitState {
  try {
    const raw = localStorage.getItem(RL_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RateLimitState;
  } catch { /* ignore corrupt data */ }
  return { minuteLog: [], dayLog: [] };
}

function saveRateLimitState(state: RateLimitState): void {
  try {
    localStorage.setItem(RL_STORAGE_KEY, JSON.stringify(state));
  } catch { /* storage full or unavailable */ }
}

/**
 * Check if a new request is allowed. If yes, records it and returns true.
 * If no, returns false with a human-readable reason.
 */
function acquireRateSlot(): { allowed: true } | { allowed: false; reason: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const state = loadRateLimitState();

  // Prune expired entries
  state.minuteLog = state.minuteLog.filter((t) => t > oneMinuteAgo);
  state.dayLog = state.dayLog.filter((t) => t > oneDayAgo);

  // Check limits
  if (state.dayLog.length >= RL_PER_DAY) {
    saveRateLimitState(state);
    return { allowed: false, reason: `Daily limit reached (${RL_PER_DAY}/day). Use "paste page source" instead, or try again tomorrow.` };
  }

  if (state.minuteLog.length >= RL_PER_MINUTE) {
    const oldestInWindow = state.minuteLog[0];
    const waitSeconds = Math.ceil((oldestInWindow + 60_000 - now) / 1000);
    saveRateLimitState(state);
    return { allowed: false, reason: `Too many requests. Wait ${waitSeconds}s, or use "paste page source" instead.` };
  }

  // Record this request
  state.minuteLog.push(now);
  state.dayLog.push(now);
  saveRateLimitState(state);

  return { allowed: true };
}

// ── Fetch Logic ──────────────────────────────────────────────

/**
 * Short-lived response cache. If the same URL was just fetched,
 * serve from cache instead of hitting the proxy again.
 * Entries expire after 5 minutes.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<string, { html: string; cachedAt: number }>();

function getCached(url: string): string | null {
  const entry = responseCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    responseCache.delete(url);
    return null;
  }
  return entry.html;
}

function setCache(url: string, html: string): void {
  // Cap cache size at 20 entries
  if (responseCache.size >= 20) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
  responseCache.set(url, { html, cachedAt: Date.now() });
}

/**
 * Fetch a page's HTML, handling CORS appropriately.
 *
 * Dev:  Vite server-side proxy (always works, no rate limit)
 * Prod: Cache check → Client-side rate check → Cloudflare Worker → error with paste fallback hint
 */
export async function fetchViaProxy(url: string): Promise<string> {
  // ── Dev mode: use Vite proxy (no rate limiting) ──
  if (isDev) {
    const proxyUrl = `/api/fetch?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Dev proxy returned HTTP ${res.status}`);
    const html = await res.text();
    if (html.length < 100) throw new Error('Dev proxy returned empty response');
    return html;
  }

  // ── Production: check cache first (no network call) ──
  const cached = getCached(url);
  if (cached) {
    console.log('[cors-proxy] Serving from cache');
    return cached;
  }

  // ── Enforce client-side rate limit ──
  const slot = acquireRateSlot();
  if (!slot.allowed) {
    throw new Error(slot.reason);
  }

  // ── Try Cloudflare Worker ──
  if (SELF_HOSTED_PROXY) {
    try {
      console.log('[cors-proxy] Using Cloudflare Worker...');
      const proxyUrl = `${SELF_HOSTED_PROXY}/?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15_000) });

      if (res.status === 429) {
        throw new Error('Server rate limit hit. Wait a moment, or use "paste page source" instead.');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      if (html.length < 100) throw new Error('Response too small — likely blocked');

      console.log('[cors-proxy] Cloudflare Worker succeeded');
      setCache(url, html);
      return html;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[cors-proxy] Cloudflare Worker failed: ${msg}`);
    }
  }

  throw new Error(
    `Could not fetch this page.\n\n` +
    `Workaround: Open the share link in your browser, right-click → View Page Source, ` +
    `copy everything, and paste it in the "Or paste page source directly" section below.`,
  );
}
