import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries, normalizeStroke } from './pdfParserUtils';

const SUSSEX_AGE_GROUPS: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12' },
  { ageFrom: 13, ageTo: 13, ageCategory: '13' },
  { ageFrom: 14, ageTo: 14, ageCategory: '14' },
  { ageFrom: 15, ageTo: 15, ageCategory: '15' },
  { ageFrom: 16, ageTo: 99, ageCategory: '16+' },
];

// Sussex shows both age groups (10/11, 12, 13, 14, 15, 16+) but the PDF text shows
// both birth years and age categories. Extract times from lines that have the pattern:
// time time time time time time time EventName time time time time time time time
const SUSSEX_EVENT_RE = /(50|100|200|400|800|1500)\s*[mM]\s*(Free|Freestyle|Back|Backstroke|Breast|Breaststroke|Fly|Butterfly|I\.M\.|IM)/i;
const SUSSEX_TIME_RE = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function normalizeSussexText(text: string): string {
  // Sussex PDF uses dots in place of colons in times (e.g., 3.51.60 instead of 3:51.60)
  // Replace M.SS.XX format with M:SS.XX
  return text.replace(/(\d+)\.(\d{2})\.(\d{2})/g, '$1:$2.$3');
}

function normalizeEvent(raw: string): string {
  const m = raw.match(/^(\d+)\s*m\s+(.+)$/i);
  if (!m) return raw;
  const distance = m[1];
  const stroke = m[2].trim().replace(/\s+/g, '');
  return `${distance} ${normalizeStroke(stroke)}`;
}

export class SussexParser implements PdfParser {
  detect(text: string, fileName: string): boolean {
    return text.includes('Sussex County') && text.includes('Championship');
  }

  parse(text: string, fileName: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};

    // Normalize the text first to convert dot format times to colon format
    const normalized = normalizeSussexText(text);

    // Find the qualifying times section - look for lines with age group headers
    // The PDF structure shows age groups followed by times
    const lines = normalized.split('\n').map(l => l.trim());

    // Process lines to extract event data
    // Look for lines that contain event names and time patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and headers
      if (!line || line.length < 5) continue;

      // Look for event patterns: "time time ... EventName time time ..."
      const eventMatch = line.match(SUSSEX_EVENT_RE);
      if (!eventMatch) continue;

      // Found an event line
      const eventName = normalizeEvent(eventMatch[0]);
      const eventPos = eventMatch.index!;

      // Extract times before and after the event name
      const beforeEvent = line.substring(0, eventPos);
      const afterEvent = line.substring(eventPos + eventMatch[0].length);

      const beforeTimes = beforeEvent.match(new RegExp(SUSSEX_TIME_RE.source, 'g')) || [];
      const afterTimes = afterEvent.match(new RegExp(SUSSEX_TIME_RE.source, 'g')) || [];

      // Sussex format: male times, event name, female times
      // Use only the first 6 times (the age groups we have)
      const maleTimesForEvent = beforeTimes.slice(-6);
      const femaleTimesForEvent = afterTimes.slice(0, 6);

      // Both LC and SC times appear in the PDF, but they're shown twice
      // We'll use them as-is; assume these are LC times (50m course)
      if (maleTimesForEvent.length > 0) {
        addEntries(result, eventName, '50m', 'Male', SUSSEX_AGE_GROUPS, maleTimesForEvent);
      }
      if (femaleTimesForEvent.length > 0) {
        addEntries(result, eventName, '50m', 'Female', SUSSEX_AGE_GROUPS, femaleTimesForEvent);
      }
    }

    return { countyName: 'Sussex', times: result };
  }
}
