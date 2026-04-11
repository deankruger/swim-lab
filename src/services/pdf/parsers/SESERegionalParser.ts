import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries } from './pdfParserUtils';

const SESE_AGE_GROUPS: AgeGroup[] = [
  { ageFrom: 11, ageTo: 12, ageCategory: '11/12' },
  { ageFrom: 13, ageTo: 13, ageCategory: '13' },
  { ageFrom: 14, ageTo: 14, ageCategory: '14' },
  { ageFrom: 15, ageTo: 15, ageCategory: '15' },
  { ageFrom: 16, ageTo: 16, ageCategory: '16' },
  { ageFrom: 17, ageTo: 17, ageCategory: '17' },
  { ageFrom: 18, ageTo: 99, ageCategory: '18+' },
];

const EVENT_MAP: Record<string, string> = {
  '50 Free':    '50 Freestyle',
  '100 Free':   '100 Freestyle',
  '200 Free':   '200 Freestyle',
  '400 Free':   '400 Freestyle',
  '800 Free':   '800 Freestyle',
  '1500 Free':  '1500 Freestyle',
  '50 Back':    '50 Backstroke',
  '100 Back':   '100 Backstroke',
  '200 Back':   '200 Backstroke',
  '50 Breast':  '50 Breaststroke',
  '100 Breast': '100 Breaststroke',
  '200 Breast': '200 Breaststroke',
  '50 Fly':     '50 Butterfly',
  '100 Fly':    '100 Butterfly',
  '200 Fly':    '200 Butterfly',
  '100 IM':     '100 Individual Medley',
  '200 IM':     '200 Individual Medley',
  '400 IM':     '400 Individual Medley',
};

function normalizeQualifyingTime(value : string) {
    let normalized = value.replace(/,/g, '.').replace(/：/g, ':');

    // mm:ss.cc  (e.g. "6:00.12")
    const mmsscc = normalized.match(/^([0-9]+):([0-9]{2})\.([0-9]{2})$/);
    if (mmsscc) {
        return `${parseInt(mmsscc[1], 10)}:${mmsscc[2]}.${mmsscc[3]}`;
    }

    // mm:ss.c or mm:ss.  (e.g. "6:00.1" or "6:00.")
    const mmssc = normalized.match(/^([0-9]+):([0-9]{2})\.([0-9]{0,2})$/);
    if (mmssc) {
        const cs = (mmssc[3] || '').padEnd(2, '0'); // "" → "00", "1" → "10"
        return `${parseInt(mmssc[1], 10)}:${mmssc[2]}.${cs}`;
    }

    // s.cc or s.c  (e.g. "32.4" → "32.40")
    const dotMsCs = normalized.match(/^([0-9]+)\.([0-9]{1,2})$/);
    if (dotMsCs) {
        return `${parseInt(dotMsCs[1], 10)}.${dotMsCs[2].padEnd(2, '0')}`;
    }

    // colonMissing: "6:.00.1" (if you really need this odd format)
    const colonMissing = normalized.match(/^([0-9]{1,2}):\.([0-9]{2})\.([0-9]{1,2})$/);
    if (colonMissing) {
        return `${parseInt(colonMissing[1], 10)}:${colonMissing[2]}.${colonMissing[3].padEnd(2, '0')}`;
    }

    // ss.cc
    const sscc = normalized.match(/^([0-9]{1,2})\.([0-9]{2})$/);
    if (sscc) {
        return `${parseInt(sscc[1], 10)}.${sscc[2]}`;
    }

    // ss:cc  (looks like you want "12:34" → "12.34")
    const ssColon = normalized.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (ssColon) {
        return `${parseInt(ssColon[1], 10)}.${ssColon[2]}`;
    }

    // Plain seconds, e.g. "32" -> "32.00"
    const plainSeconds = normalized.match(/^([0-9]{1,2})$/);
    if (plainSeconds) {
        return `${plainSeconds[1]}.00`;
    }

    // Not a time, return empty to filter out
    return '';
}

function parseEventRow(line: string, gender: string, result: CountyTimes): void {
  console.log(`[SESERegionalParser] checking line: "${line}"`);
  const match = line.match(/^(50|100|200|400|800|1500)\s+(Free|Breast|Fly|Back|IM)\s+(LC|SC)\b/i);
  if (!match) {
    console.log('[SESERegionalParser] no match');
    return;
  }
  console.log('[SESERegionalParser] matched:', match[0]);

  const eventKey = `${match[1]} ${match[2]}`;
  const eventName = EVENT_MAP[eventKey];
  if (!eventName) {
    console.log('[SESERegionalParser] unknown event:', eventKey);
    return;
  }

  const courseToken = match[3];
  const poolSize = courseToken === 'LC' ? '50m' : '25m';
  var tokens = line.slice(match[0].length).trim().split(/\s+/);
  console.log('[SESERegionalParser] tokens:', tokens);

  // Apply special-case trimming rules
  if (tokens.length === 15) {
    console.log('[SESERegionalParser] trimming 15-length row (removing 0,7,8,9)');
    const skip = new Set([0, 7, 8, 9]);
    tokens = tokens.filter((_, idx) => !skip.has(idx));
    console.log('[SESERegionalParser] trimmed tokens:', tokens);
  }
  

  var normalizedTimes = tokens.map(normalizeQualifyingTime);
  console.log('[SESERegionalParser] normalized:', normalizedTimes);

  
  if (normalizedTimes.filter(t => t !== '').length < 7) {
    console.log('[SESERegionalParser] not enough times:', normalizedTimes.filter(t => t !== '').length);
    return;
  }

  const qtTimes: string[] = [];
  const ctTimes: string[] = [];

  for (let i = 0; i < normalizedTimes.length; i += 1) {
      var time = normalizedTimes[i];

      if (i < 8) {
          if (time === '') {
              console.log(`[SESERegionalParser] skipping invalid time at index ${i}: "${tokens[i]}"`);
              continue;
          }

          if (i % 2 === 0) {
              ctTimes.push(time);
          }
          else {
              qtTimes.push(time);
          }
      }
      else {
          qtTimes.push(time);
      }
  }  

  console.log('[SESERegionalParser] qtTimes:', qtTimes, 'ctTimes:', ctTimes);
  addEntries(result, eventName, poolSize, gender, SESE_AGE_GROUPS, qtTimes, ctTimes);
  console.log('[SESERegionalParser] added entries for', eventName, poolSize, gender);
}

function parseGenderSection(lines: string[], gender: string, result: CountyTimes): void {
  console.log(`[SESERegionalParser] parsing ${gender} section with ${lines.length} lines`);
  lines.forEach(line => parseEventRow(line, gender, result));
}

export class SESERegionalParser implements PdfParser {
  detect(text: string, fileName?: string): boolean {
    const detected = text.includes('Swim England South East Regional Summer Championships 2026') ||
           /sese-regional-summer-championships/i.test(fileName ?? '');
    if (detected) console.log('[SESERegionalParser] detected PDF');
    return detected;
  }

  parse(text: string, fileName?: string): { countyName: string; times: CountyTimes } {
    console.log('[SESERegionalParser] parsing SESE Regional');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('[SESERegionalParser] total lines:', lines.length);
    const maleStart = lines.findIndex(l => /male|open/i.test(l));
    const femaleStart = lines.findIndex(l => /^female$/i.test(l));
    console.log('[SESERegionalParser] maleStart:', maleStart, 'femaleStart:', femaleStart);

    const result: CountyTimes = {};

    if (maleStart !== -1) {
      const maleEnd = femaleStart !== -1 ? femaleStart : lines.length;
      console.log(`[SESERegionalParser] parsing male section from ${maleStart + 1} to ${maleEnd}`);
      parseGenderSection(lines.slice(maleStart + 1, maleEnd), 'Male', result);
    }
    if (femaleStart !== -1) {
      console.log(`[SESERegionalParser] parsing female section from ${femaleStart + 1}`);
      parseGenderSection(lines.slice(femaleStart + 1), 'Female', result);
    }

    console.log('[SESERegionalParser] total entries parsed:', Object.keys(result).length);
    return { countyName: 'SESE Regional', times: result };
  }
}
