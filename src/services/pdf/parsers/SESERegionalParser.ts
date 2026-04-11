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

function normalizeQualifyingTime(value: string): string {
  let normalized = value.replace(/,/g, '.').replace(/：/g, ':');

  const mmsscc = normalized.match(/^([0-9]+):([0-9]{2})\.([0-9]{2})$/);
  if (mmsscc) {
    return `${parseInt(mmsscc[1], 10)}:${mmsscc[2]}.${mmsscc[3]}`;
  }

  const dotMsCs = normalized.match(/^([0-9]+)\.([0-9]{2})\.([0-9]{1,2})$/);
  if (dotMsCs) {
    return `${parseInt(dotMsCs[1], 10)}:${dotMsCs[2]}.${dotMsCs[3].padEnd(2, '0')}`;
  }

  const colonMissing = normalized.match(/^([0-9]{1,2}):\.([0-9]{2})\.([0-9]{1,2})$/);
  if (colonMissing) {
    return `${parseInt(colonMissing[1], 10)}:${colonMissing[2]}.${colonMissing[3].padEnd(2, '0')}`;
  }

  const sscc = normalized.match(/^([0-9]{1,2})\.([0-9]{2})$/);
  if (sscc) {
    return `${parseInt(sscc[1], 10)}.${sscc[2]}`;
  }

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

function isTimeToken(value: string): boolean {
  const normalized = normalizeQualifyingTime(value);
  return /^\d{1,2}(?::\d{2})?\.\d{1,2}$/.test(normalized);
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
  const tokens = line.slice(match[0].length).trim().split(/\s+/);
  console.log('[SESERegionalParser] tokens:', tokens);
  const normalizedTimes = tokens.map(normalizeQualifyingTime);
  console.log('[SESERegionalParser] normalized:', normalizedTimes);
  const times = normalizedTimes.filter(t => t !== '');
  console.log('[SESERegionalParser] filtered times:', times);

  if (times.length < 7) {
    console.log('[SESERegionalParser] not enough times:', times.length);
    return;
  }

  const qtTimes: string[] = [];
  const ctTimes: string[] = [];

  for (let i = 0; i < times.length; i += 1) {
    if (i < 8) {
      if (i % 2 === 0) {
        ctTimes.push(times[i]);
      } else {
        qtTimes.push(times[i]);
      }
    } else {
      qtTimes.push(times[i]);
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
