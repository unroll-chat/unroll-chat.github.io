// ── CORS Proxy Layer ─────────────────────────────────────────
//
// The browser can't fetch share pages directly (CORS blocks it).
//
// Strategy:
//   DEV MODE  → Vite dev server proxy at /api/fetch?url=...
//               Fetches server-side from your machine (same as curl).
//
//   PROD MODE → Google Cloud Run Function (primary)
//               Client-side rate limiting prevents unnecessary calls.
//               Falls back to paste-source fallback.
//
// Security layers (client → server):
//   1. URL validation (validate-url.ts) — domain + path pattern
//   2. Response cache — 5 min dedup
//   3. Client rate limit — 5/min, 50/day (localStorage)
//   4. Challenge token — time-based token in X-Challenge header
//   5. Server checks: origin, referer, challenge, rate limit, domain whitelist

const isDev = import.meta.env.DEV;

/**
 * Google Cloud Run proxy URL.
 */
const SELF_HOSTED_PROXY: string | null = 'https://us-central1-unroll-proxy.cloudfunctions.net/unroll-proxy';

// ── Challenge Token ──────────────────────────────────────────
// Time-based token that expires in 60 seconds.
// Forces attackers to reverse-engineer the generation logic
// instead of just copying a static key.
//
// Algorithm: base36(timestamp_bucket) + '-' + base36(simple_hash)
// The server validates that the timestamp is within ±60s and
// the hash matches.

const CHALLENGE_SALT = 'k9m2x4p7';
const CHALLENGE_WINDOW_MS = 60_000;

function generateChallenge(): string {
  const now = Date.now();
  const bucket = Math.floor(now / CHALLENGE_WINDOW_MS);
  const hash = simpleHash(`${bucket}:${CHALLENGE_SALT}`);
  return `${bucket.toString(36)}-${hash.toString(36)}`;
}

function simpleHash(str: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return Math.abs(h);
}

// ── Client-side Rate Limiting ────────────────────────────────
// Enforced BEFORE any network request. Persisted in localStorage
// so refreshing the page doesn't reset the counters.

const RL_STORAGE_KEY = 'unroll_rate_limit';
const RL_PER_MINUTE = 5;
const RL_PER_DAY = 50;

interface RateLimitState {
  minuteLog: number[];
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

function acquireRateSlot(): { allowed: true } | { allowed: false; reason: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const oneDayAgo = now - 86_400_000;

  const state = loadRateLimitState();

  state.minuteLog = state.minuteLog.filter((t) => t > oneMinuteAgo);
  state.dayLog = state.dayLog.filter((t) => t > oneDayAgo);

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

  state.minuteLog.push(now);
  state.dayLog.push(now);
  saveRateLimitState(state);

  return { allowed: true };
}

// ── Response Cache ───────────────────────────────────────────

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
  if (responseCache.size >= 20) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
  responseCache.set(url, { html, cachedAt: Date.now() });
}

// ── Fetch Logic ──────────────────────────────────────────────

export async function fetchViaProxy(url: string): Promise<string> {
  // ── Dev mode: use Vite proxy (no guards needed) ──
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

  // ── Try Cloud Run proxy ──
  if (SELF_HOSTED_PROXY) {
    try {
      console.log('[cors-proxy] Using Cloud Run proxy...');
      const proxyUrl = `${SELF_HOSTED_PROXY}/?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15_000),
        headers: {
          'X-Challenge': generateChallenge(),
        },
      });

      if (res.status === 429) {
        throw new Error('Server rate limit hit. Wait a moment, or use "paste page source" instead.');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      if (html.length < 100) throw new Error('Response too small — likely blocked');

      console.log('[cors-proxy] Cloud Run proxy succeeded');
      setCache(url, html);
      return html;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[cors-proxy] Cloud Run proxy failed: ${msg}`);
    }
  }

  throw new Error(
    `Could not fetch this page.\n\n` +
    `Workaround: Open the share link in your browser, right-click → View Page Source, ` +
    `copy everything, and paste it in the "Or paste page source directly" section below.`,
  );
}
