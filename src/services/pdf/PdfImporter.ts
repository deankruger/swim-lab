import { PDFParse } from 'pdf-parse';
import { CountyTimes } from '../../types';
import { PdfParser } from './parsers/pdfParserUtils';
import { KentParser } from './parsers/KentParser';
import { HertfordshireParser } from './parsers/HertfordshireParser';
import { SurreyParser } from './parsers/SurreyParser';
import { HampshireParser } from './parsers/HampshireParser';
import { MiddlesexParser } from './parsers/MiddlesexParser';
import { SELondonParser } from './parsers/SELondonParser';

// Order matters: more specific detectors must come before broad ones.
// SELondon before Hertfordshire because both match QT/CT patterns.
const PARSERS: PdfParser[] = [
  new KentParser(),
  new SELondonParser(),
  new HertfordshireParser(),
  new SurreyParser(),
  new HampshireParser(),
  new MiddlesexParser(),
];

// ─── PDF text extraction ──────────────────────────────────────────────────────

let workerConfigured = false;

async function extractPdfText(data: Uint8Array): Promise<string> {
  if (!workerConfigured) {
    // Set worker source only in browser - in Node.js the path resolves as a 
    // filesystem absolute path, causing pdf-parse to fail when it tries to 
    // import the worker module.
    if (typeof (globalThis as { window?: unknown }).window !== 'undefined') {
      try {
        PDFParse.setWorker('/pdf.worker.mjs');
      } catch {
        // Worker setup is optional - falls back to main-thread rendering
      }
    }
    workerConfigured = true;
  }

  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText({
      // Concatenate text items on the same line (mirrors pdf-parse 1.x behaviour)
      cellSeparator: '',
      // Simple newline between pages
      pageJoiner: '\n',
    });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class PdfImporter {
  async importCountyTimesFromBuffer(buffer: Buffer | Uint8Array, fileName: string): Promise<{ countyName: string; times: CountyTimes }> {
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return this._parse(await extractPdfText(uint8Array), fileName);
  }
  
  async importCountyTimesFromBase64(base64: string, fileName: string): Promise<{ countyName: string; times: CountyTimes }> {
    const binaryString = atob(base64);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    return this._parse(await extractPdfText(uint8Array), fileName);
  }
  
  private _parse(text: string, fileName: string): { countyName: string; times: CountyTimes } {
    console.log('[PdfImporter] full extracted text:\n', text);
    const parser = PARSERS.find(p => p.detect(text, fileName));
    if (!parser) {      
       throw new Error('Unrecognised standards PDF format. Currently Supported: Kent, Hertfordshire (SEH), Surrey, Hampshire, Middlesex, SE. London.');
    }  
    return parser.parse(text, fileName);
  }
}
