/**
 * Trigger a browser file download for the given content.
 */
export function downloadFile(
  content: string | Uint8Array,
  filename: string,
  mimeType: string,
): void {
  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    // Convert Uint8Array to ArrayBuffer to satisfy strict TS
    const buffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer;
    blob = new Blob([buffer], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}
