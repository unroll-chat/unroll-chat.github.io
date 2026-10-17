/**
 * Copy text to the clipboard.
 * Uses the Clipboard API with an execCommand fallback.
 * Returns `true` on success, `false` on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  // Legacy fallback
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
