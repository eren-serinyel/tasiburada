import fs from 'node:fs';
import path from 'node:path';

const DOCUMENTS_DIR = path.resolve(process.cwd(), 'uploads', 'documents');
const SEEDED_DOCUMENT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

const TURKISH_TO_ASCII_MAP: Record<string, string> = {
  'Ç': 'C',
  'ç': 'c',
  'Ğ': 'G',
  'ğ': 'g',
  'İ': 'I',
  'ı': 'i',
  'Ö': 'O',
  'ö': 'o',
  'Ş': 'S',
  'ş': 's',
  'Ü': 'U',
  'ü': 'u',
  '—': '-',
  '–': '-',
};

function toPdfSafeAscii(text: string): string {
  return Array.from(text)
    .map((char) => TURKISH_TO_ASCII_MAP[char] ?? char)
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapPdfLines(text: string, maxLineLength = 70): string[] {
  const normalized = toPdfSafeAscii(text).trim();
  if (!normalized) {
    return ['Bos belge'];
  }

  const lines: string[] = [];

  for (const paragraph of normalized.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= maxLineLength) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : ['Bos belge'];
}

export function ensureSeedDocumentsDirectory(): string {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }

  return DOCUMENTS_DIR;
}

export function cleanupSeededDocumentFiles(): number {
  const documentsDir = ensureSeedDocumentsDirectory();
  const files = fs.readdirSync(documentsDir);
  let removedCount = 0;

  for (const fileName of files) {
    if (!SEEDED_DOCUMENT_PATTERN.test(fileName)) {
      continue;
    }

    fs.unlinkSync(path.join(documentsDir, fileName));
    removedCount += 1;
  }

  return removedCount;
}

export function resolveSeedDocumentPath(fileUrl: string): string {
  const fileName = String(fileUrl || '').split('/').pop() || '';
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error(`Invalid seeded document path: ${fileUrl}`);
  }

  return path.join(ensureSeedDocumentsDirectory(), fileName);
}

export function generateMinimalPdf(text: string): Buffer {
  const titleLine = 'Tasiburada Demo Belge';
  const bodyLines = wrapPdfLines(text);
  const textOperations: string[] = [
    'BT',
    '/F1 18 Tf',
    '50 770 Td',
    `(${escapePdfText(titleLine)}) Tj`,
    '0 -28 Td',
    '/F1 12 Tf',
  ];

  bodyLines.forEach((line, index) => {
    textOperations.push(`(${escapePdfText(line)}) Tj`);
    if (index < bodyLines.length - 1) {
      textOperations.push('0 -18 Td');
    }
  });
  textOperations.push('ET');

  const contentStream = `${textOperations.join('\n')}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}endstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
