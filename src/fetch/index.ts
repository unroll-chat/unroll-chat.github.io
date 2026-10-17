import { fetchViaProxy } from './cors-proxy.js';

// ── URL Validation ───────────────────────────────────────────

const SHARE_URL_RE = /^https?:\/\/.+/i;

/**
 * Fetch the raw HTML of a chat share page.
 * Validates the URL format before fetching through the CORS proxy.
 */
export async function fetchSharePage(url: string): Promise<string> {
  const trimmed = url.trim();

  if (!SHARE_URL_RE.test(trimmed)) {
    throw new Error(
      `Invalid URL: "${trimmed}". Expected a full URL starting with http:// or https://.`,
    );
  }

  return fetchViaProxy(trimmed);
}

export { fetchViaProxy } from './cors-proxy.js';
