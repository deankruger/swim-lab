import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries } from './pdfParserUtils';

const SEH_EVENT_MAP: Record<string, string> = {
  '50mFree':    '50 Freestyle',
  '100mFree':   '100 Freestyle',
  '200mFree':   '200 Freestyle',
  '400mFree':   '400 Freestyle',
  '800mFree':   '800 Freestyle',
  '1500mFree':  '1500 Freestyle',
  '50mBreast':  '50 Breaststroke',
  '100mBreast': '100 Breaststroke',
  '200mBreast': '200 Breaststroke',
  '50mFly':     '50 Butterfly',
  '100mFly':    '100 Butterfly',
  '200mFly':    '200 Butterfly',
  '50mBack':    '50 Backstroke',
  '100mBack':   '100 Backstroke',
  '200mBack':   '200 Backstroke',
  '100mIM':     '100 Individual Medley',
  '200mIM':     '200 Individual Medley',
  '400mIM':     '400 Individual Medley',
};

const SEH_AGE_GROUPS: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 99, ageCategory: '16+'   },
];

const SEH_400IM_AGE_GROUPS = SEH_AGE_GROUPS.slice(1);

function normalizeHertsTime(t: string): string {
  const m = t.match(/^(\d{2}):(\d{2}\.\d{2})$/);
  if (!m) return t;
  const mins = parseInt(m[1], 10);
  return mins === 0 ? m[2] : `${mins}:${m[2]}`;
}

function parseSection(lines: string[], gender: string, result: CountyTimes): void {
  const paddedTimeRe = /\d{2}:\d{2}\.\d{2}/g;
  const eventRe = /^(50m|100m|200m|400m|800m|1500m)\s*(Free|Breast|Fly|Back|IM)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const em = line.match(eventRe);
    if (!em) { i++; continue; }

    const eventKey = `${em[1]}${em[2]}`;
    const eventName = SEH_EVENT_MAP[eventKey];
    if (!eventName) { i++; continue; }

    let timesStr = line;
    if (eventKey === '400mIM') {
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (/^\d/.test(next)) { timesStr += next; j++; } else break;
      }
      i = j;
    } else {
      i++;
    }

    const allTimes = (timesStr.match(paddedTimeRe) || []).map(normalizeHertsTime);
    const qtTimes = allTimes.filter((_, idx) => idx % 2 === 0);
    const ctTimes = allTimes.filter((_, idx) => idx % 2 === 1);

    const ageGroups = eventKey === '400mIM' ? SEH_400IM_AGE_GROUPS : SEH_AGE_GROUPS;
    addEntries(result, eventName, '50m', gender, ageGroups, qtTimes, ctTimes);
  }
}

export class HertfordshireParser implements PdfParser {
  detect(text: string): boolean {
    return text.includes('Swim England Hertfordshire') || /QT\s*CT\s*QT\s*CT/.test(text);
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const times: CountyTimes = {};
    const lines = text.split('\n');

    const headerIndices: number[] = [];
    lines.forEach((l, i) => {
      if (/QT\s*CT\s*QT\s*CT/.test(l)) headerIndices.push(i);
    });

    if (headerIndices.length >= 2) {
      parseSection(lines.slice(headerIndices[0] + 1, headerIndices[1]), 'Male',   times);
      parseSection(lines.slice(headerIndices[1] + 1),                   'Female', times);
    } else if (headerIndices.length === 1) {
      parseSection(lines.slice(headerIndices[0] + 1), 'Male', times);
    }

    return { countyName: 'Hertfordshire', times };
  }
}
