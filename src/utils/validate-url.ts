// ── URL Validation & Sanitization ────────────────────────────
//
// Validates share URLs before they reach the proxy.
// Rejects anything that isn't a known AI chat share link.

/** Max URL length to prevent abuse */
const MAX_URL_LENGTH = 2048;

/** Known AI chat share domains and their expected path patterns */
const KNOWN_SHARE_PATTERNS: Array<{
  domain: string;
  /** Regex the pathname must match */
  pathPattern: RegExp;
  /** Human-readable example for error messages */
  example: string;
}> = [
  {
    domain: 'chatgpt.com',
    pathPattern: /^\/share\/[a-f0-9-]+$/i,
    example: 'https://chatgpt.com/share/abc123-def456',
  },
  {
    domain: 'chat.openai.com',
    pathPattern: /^\/share\/[a-f0-9-]+$/i,
    example: 'https://chat.openai.com/share/abc123-def456',
  },
  {
    domain: 'claude.ai',
    pathPattern: /^\/share\/[a-zA-Z0-9_-]+$/i,
    example: 'https://claude.ai/share/abc123',
  },
  {
    domain: 'gemini.google.com',
    pathPattern: /^\/share\/[a-zA-Z0-9_-]+$/i,
    example: 'https://gemini.google.com/share/abc123',
  },
  {
    domain: 'aistudio.google.com',
    pathPattern: /^\/share\/[a-zA-Z0-9_-]+$/i,
    example: 'https://aistudio.google.com/share/abc123',
  },
];

export type ValidationResult =
  | { valid: true; sanitizedUrl: string }
  | { valid: false; error: string };

/**
 * Validate and sanitize a share URL.
 *
 * Checks:
 *  1. Not empty / not too long
 *  2. Valid URL syntax
 *  3. HTTPS only
 *  4. No auth/userinfo in the URL
 *  5. Domain is a known AI chat provider
 *  6. Path matches the expected share link pattern
 *  7. Strips fragments and query params (not needed)
 */
export function validateShareUrl(input: string): ValidationResult {
  // ── Basic checks ──
  const trimmed = input.trim();

  if (!trimmed) {
    return { valid: false, error: 'Paste a share link to get started.' };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'URL is too long.' };
  }

  // ── Parse URL ──
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Enter a complete share URL, including https://' };
  }

  // ── Protocol ──
  if (url.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS share links are supported.' };
  }

  // ── No credentials in URL ──
  if (url.username || url.password) {
    return { valid: false, error: 'URLs with credentials are not allowed.' };
  }

  // ── Domain check ──
  const match = KNOWN_SHARE_PATTERNS.find(
    (p) => url.hostname === p.domain || url.hostname.endsWith('.' + p.domain),
  );

  if (!match) {
    const supported = KNOWN_SHARE_PATTERNS.map((p) => p.domain).join(', ');
    return {
      valid: false,
      error: `This domain isn't supported. We support: ${supported}`,
    };
  }

  // ── Path pattern check ──
  if (!match.pathPattern.test(url.pathname)) {
    return {
      valid: false,
      error: `That doesn't look like a share link. Expected format: ${match.example}`,
    };
  }

  // ── Sanitize: strip fragments, query params, trailing slashes ──
  const sanitized = `${url.protocol}//${url.hostname}${url.pathname.replace(/\/+$/, '')}`;

  return { valid: true, sanitizedUrl: sanitized };
}
