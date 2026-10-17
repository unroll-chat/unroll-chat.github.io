import { jsPDF } from 'jspdf';
import type { Conversation } from '../parsers/types.js';
import type { Exporter, ExportOptions } from './types.js';
import { ExportOptionsSchema, filterMessages } from './types.js';

// ── Layout constants ─────────────────────────────────────────

const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const MAX_Y = PAGE_HEIGHT - MARGIN_BOTTOM;

// ── Colours ──────────────────────────────────────────────────

const COLOR_TITLE: [number, number, number] = [233, 69, 96];
const COLOR_META: [number, number, number] = [150, 160, 175];
const COLOR_USER: [number, number, number] = [99, 179, 237];
const COLOR_ASSISTANT: [number, number, number] = [104, 211, 145];
const COLOR_SYSTEM: [number, number, number] = [160, 174, 192];
const COLOR_BODY: [number, number, number] = [50, 50, 60];
const COLOR_CODE_BG: [number, number, number] = [240, 240, 245];

// ── Helpers ──────────────────────────────────────────────────

function roleLabel(role: string): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'assistant':
      return 'Assistant';
    case 'system':
      return 'System';
    default:
      return role;
  }
}

function roleColor(role: string): [number, number, number] {
  switch (role) {
    case 'user':
      return COLOR_USER;
    case 'assistant':
      return COLOR_ASSISTANT;
    case 'system':
      return COLOR_SYSTEM;
    default:
      return COLOR_BODY;
  }
}

/**
 * Write wrapped text at `cursorY`, adding pages as needed.
 * Returns the final Y position.
 */
function writeWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines: string[] = doc.splitTextToSize(text, maxWidth) as string[];
  let curY = y;

  for (const line of lines) {
    if (curY + lineHeight > MAX_Y) {
      doc.addPage();
      curY = MARGIN_TOP;
    }
    doc.text(line, x, curY);
    curY += lineHeight;
  }

  return curY;
}

// ── Exporter ─────────────────────────────────────────────────

export const pdfExporter: Exporter = {
  format: 'pdf',
  label: 'PDF',
  extension: 'pdf',
  mimeType: 'application/pdf',

  async export(
    conversation: Conversation,
    options?: ExportOptions,
  ): Promise<Uint8Array> {
    const opts = ExportOptionsSchema.parse(options ?? {});
    const messages = filterMessages(conversation.messages, opts);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = MARGIN_TOP;

    // ── Title ───────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLOR_TITLE);
    y = writeWrappedText(doc, conversation.title, MARGIN_LEFT, y, CONTENT_WIDTH, 8);
    y += 4;

    // ── Metadata ────────────────────────────────────────
    if (opts.includeMetadata) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_META);

      const metaLines: string[] = [
        `Source: ${conversation.source}`,
        `Vendor: ${conversation.vendor}  |  Exported: ${conversation.exportedAt}`,
      ];
      if (conversation.metadata.model) {
        metaLines.push(`Model: ${conversation.metadata.model}`);
      }
      if (conversation.metadata.createdAt) {
        metaLines.push(`Created: ${conversation.metadata.createdAt}`);
      }
      metaLines.push(`Messages: ${conversation.metadata.messageCount}`);

      for (const line of metaLines) {
        if (y + 4 > MAX_Y) {
          doc.addPage();
          y = MARGIN_TOP;
        }
        doc.text(line, MARGIN_LEFT, y);
        y += 4;
      }
      y += 4;
    }

    // ── Separator line ──────────────────────────────────
    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 6;

    // ── Messages ────────────────────────────────────────
    for (const msg of messages) {
      // Role label
      if (y + 10 > MAX_Y) {
        doc.addPage();
        y = MARGIN_TOP;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...roleColor(msg.role));
      doc.text(roleLabel(msg.role), MARGIN_LEFT, y);
      y += 6;

      // Message content — split into code / non-code segments
      const segments = splitCodeBlocks(msg.content);

      for (const seg of segments) {
        if (seg.isCode) {
          // Draw a light background rect for code
          doc.setFont('courier', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...COLOR_BODY);

          const codeLines: string[] = doc.splitTextToSize(
            seg.text,
            CONTENT_WIDTH - 6,
          ) as string[];

          const blockHeight = codeLines.length * 3.8 + 4;

          if (y + blockHeight > MAX_Y) {
            doc.addPage();
            y = MARGIN_TOP;
          }

          doc.setFillColor(...COLOR_CODE_BG);
          doc.roundedRect(
            MARGIN_LEFT,
            y - 2,
            CONTENT_WIDTH,
            blockHeight,
            1.5,
            1.5,
            'F',
          );

          y += 2;
          for (const codeLine of codeLines) {
            if (y + 3.8 > MAX_Y) {
              doc.addPage();
              y = MARGIN_TOP;
            }
            doc.text(codeLine, MARGIN_LEFT + 3, y);
            y += 3.8;
          }
          y += 4;
        } else {
          // Regular text
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(...COLOR_BODY);
          y = writeWrappedText(
            doc,
            seg.text,
            MARGIN_LEFT,
            y,
            CONTENT_WIDTH,
            4.5,
          );
          y += 2;
        }
      }

      // Separator between messages
      y += 2;
      if (y + 4 > MAX_Y) {
        doc.addPage();
        y = MARGIN_TOP;
      }
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.15);
      doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
      y += 6;
    }

    // Return binary PDF as Uint8Array
    const arrayBuf = doc.output('arraybuffer');
    return new Uint8Array(arrayBuf);
  },
};

// ── Code-block splitter ──────────────────────────────────────

interface Segment {
  text: string;
  isCode: boolean;
}

function splitCodeBlocks(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```\w*\n([\s\S]*?)```/g;
  let lastIndex = 0;

  for (const match of content.matchAll(regex)) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ text: before.trim(), isCode: false });
    }
    segments.push({ text: match[1]!.trimEnd(), isCode: true });
    lastIndex = match.index! + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ text: remaining.trim(), isCode: false });
  }

  // If nothing was found, return the whole content as one segment
  if (segments.length === 0) {
    segments.push({ text: content, isCode: false });
  }

  return segments;
}
