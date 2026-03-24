import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries } from './pdfParserUtils';

const MIDDLESEX_EVENT_MAP: Record<string, string> = {
  '50 Free':   '50 Freestyle',
  '100 Free':  '100 Freestyle',
  '200 Free':  '200 Freestyle',
  '400 Free':  '400 Freestyle',
  '800 Free':  '800 Freestyle',
  '1500 Free': '1500 Freestyle',
  '50 Back':   '50 Backstroke',
  '100 Back':  '100 Backstroke',
  '200 Back':  '200 Backstroke',
  '50 BR':     '50 Breaststroke',
  '100 BR':    '100 Breaststroke',
  '200 BR':    '200 Breaststroke',
  '50 Fly':    '50 Butterfly',
  '100 Fly':   '100 Butterfly',
  '200 Fly':   '200 Butterfly',
  '200 IM':    '200 Individual Medley',
  '400 IM':    '400 Individual Medley',
};

const MIDDX_AGE_GROUPS_7: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 99, ageCategory: '17+'   },
];
const MIDDX_AGE_GROUPS_6 = MIDDX_AGE_GROUPS_7.slice(1);

function extractMiddlesexTimes(str: string): string[] {
  const times: string[] = [];
  const re = /(\d{1,2})\.(\d{2})\.(\d{1,2})|(\d{1,2}):(\d{2})\.(\d{1,2})|(\d{2})\.(\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    if (m[1] !== undefined) {
      times.push(`${parseInt(m[1], 10)}:${m[2]}.${m[3].padEnd(2, '0')}`);
    } else if (m[4] !== undefined) {
      times.push(`${parseInt(m[4], 10)}:${m[5]}.${m[6].padEnd(2, '0')}`);
    } else {
      times.push(m[0]);
    }
  }
  return times;
}

function parseEventBlock(blockText: string, course: '25m' | '50m', gender: string, result: CountyTimes): void {
  const eventKeys = Object.keys(MIDDLESEX_EVENT_MAP);
  for (const line of blockText.split('\n').map(l => l.trim()).filter(Boolean)) {
    const key = eventKeys.find(k => line.startsWith(k + ' ') || line === k);
    if (!key) continue;

    const eventName = MIDDLESEX_EVENT_MAP[key];
    let dataStr = line.slice(key.length).trim();
    // Strip trailing repeated event name (used as a label in the PDF)
    if (dataStr.endsWith(key)) {
      dataStr = dataStr.slice(0, dataStr.length - key.length).trim();
    }

    const hasNone   = /NONE/i.test(dataStr);
    const cleanStr  = dataStr.replace(/NONE/gi, ' ');
    const allTimes  = extractMiddlesexTimes(cleanStr);
    const ageGroups = hasNone ? MIDDX_AGE_GROUPS_6 : MIDDX_AGE_GROUPS_7;
    const autoTimes = allTimes.filter((_, i) => i % 2 === 0);
    const consTimes = allTimes.filter((_, i) => i % 2 === 1);
    addEntries(result, eventName, course, gender, ageGroups, autoTimes, consTimes);
  }
}

function parseGenderSection(sectionText: string, gender: string, result: CountyTimes): void {
  const lines = sectionText.split('\n');

  const headerIndices: number[] = [];
  lines.forEach((line, i) => {
    if (/^Events?\b/i.test(line.trim())) headerIndices.push(i);
  });

  headerIndices.forEach((startIdx, bi) => {
    const headerLine = lines[startIdx].trim().toLowerCase();
    const course: '25m' | '50m' = headerLine.includes('short') ? '25m' : '50m';
    const endIdx = bi + 1 < headerIndices.length ? headerIndices[bi + 1] : lines.length;
    parseEventBlock(lines.slice(startIdx + 1, endIdx).join('\n'), course, gender, result);
  });
}

export class MiddlesexParser implements PdfParser {
  detect(text: string): boolean {
    return /middlesex\s+county/i.test(text);
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};

    const boysMatch  = text.match(/\n(?:BOYS|MEN|MALE)[^\n]*\n/i);
    const girlsMatch = text.match(/\n(?:GIRLS|WOMEN|FEMALE)[^\n]*\n/i);

    console.log('[MiddlesexParser] boysMatch:', boysMatch?.[0]?.trim(), 'at index', boysMatch?.index);
    console.log('[MiddlesexParser] girlsMatch:', girlsMatch?.[0]?.trim(), 'at index', girlsMatch?.index);

    if (boysMatch?.index != null) {
      const boysEnd = girlsMatch?.index ?? text.length;
      parseGenderSection(text.slice(boysMatch.index, boysEnd), 'Male', result);
    }
    if (girlsMatch?.index != null) {
      parseGenderSection(text.slice(girlsMatch.index), 'Female', result);
    }

    console.log('[MiddlesexParser] total entries parsed:', Object.keys(result).length);
    return { countyName: 'Middlesex', times: result };
  }
}
