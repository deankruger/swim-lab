import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries, normalizeStroke } from './pdfParserUtils';

const SURREY_AGE_GROUPS_8: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 17, ageCategory: '17'    },
  { ageFrom: 18, ageTo: 99, ageCategory: '18+'   },
];
const SURREY_AGE_GROUPS_7 = SURREY_AGE_GROUPS_8.slice(1);

const SURREY_EVENT_RE = /(?<![.\d])((?:50|100|200|400|800|1500)m\s+(?:Freestyle|Backstroke|Breaststroke|Butterfly|IM))/gi;
const SURREY_TIME_RE  = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function normalizeEvent(raw: string): string {
  const m = raw.match(/^(\d+)m\s+(.+)$/i);
  if (!m) return raw;
  return `${m[1]} ${normalizeStroke(m[2].trim().replace(/\s+/g, ''))}`;
}

function parseQualifyingSection(sectionText: string, gender: string, result: CountyTimes): void {
  const eventRe = new RegExp(SURREY_EVENT_RE.source, 'i');
  const timeRe  = new RegExp(SURREY_TIME_RE.source,  'g');

  for (const line of sectionText.split('\n')) {
    const em = line.match(eventRe);
    if (!em) continue;

    const eventName = normalizeEvent(em[0]);
    const dataStr   = line.slice(em.index! + em[0].length);
    const allTimes  = dataStr.match(timeRe) || [];

    const half    = Math.ceil(allTimes.length / 2);
    const lcTimes = allTimes.slice(0, half);
    const scTimes = allTimes.slice(half);

    const lcAg = lcTimes.length <= 7 ? SURREY_AGE_GROUPS_7 : SURREY_AGE_GROUPS_8;
    const scAg = scTimes.length <= 7 ? SURREY_AGE_GROUPS_7 : SURREY_AGE_GROUPS_8;

    if (lcTimes.length > 0) addEntries(result, eventName, '50m', gender, lcAg, lcTimes);
    if (scTimes.length > 0) addEntries(result, eventName, '25m', gender, scAg, scTimes);
  }
}

export class SurreyParser implements PdfParser {
  detect(text: string): boolean {
    return text.includes('Surrey County');
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};

    const qualSections: Array<{ start: string; end: string; gender: string }> = [
      { start: 'OPEN/MALE County Qualifying Times',    end: 'OPEN/MALE County Consideration Times', gender: 'Male'   },
      { start: 'FEMALE County Qualifying Times',       end: 'FEMALE County Consideration Times',    gender: 'Female' },
    ];

    for (const { start, end, gender } of qualSections) {
      const startIdx = text.indexOf(start);
      if (startIdx === -1) continue;
      const endIdx  = text.indexOf(end, startIdx + start.length);
      const section = endIdx !== -1 ? text.slice(startIdx, endIdx) : text.slice(startIdx);
      const dataStart = section.indexOf('\n');
      if (dataStart !== -1) parseQualifyingSection(section.slice(dataStart), gender, result);
    }

    const consResult: CountyTimes = {};
    const consSections: Array<{ start: string; end: string; gender: string }> = [
      { start: 'OPEN/MALE County Consideration Times', end: 'FEMALE County Qualifying Times',       gender: 'Male'   },
      { start: 'FEMALE County Consideration Times',    end: '',                                      gender: 'Female' },
    ];

    for (const { start, end, gender } of consSections) {
      const startIdx = text.indexOf(start);
      if (startIdx === -1) continue;
      const endIdx  = end ? text.indexOf(end, startIdx + start.length) : -1;
      const section = endIdx !== -1 ? text.slice(startIdx, endIdx) : text.slice(startIdx);
      const dataStart = section.indexOf('\n');
      if (dataStart !== -1) parseQualifyingSection(section.slice(dataStart), gender, consResult);
    }

    for (const key of Object.keys(result)) {
      if (consResult[key]) {
        result[key] = { ...result[key], considerationTime: consResult[key].time };
      }
    }

    return { countyName: 'Surrey', times: result };
  }
}
