import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries } from './pdfParserUtils';

const SE_LONDON_AGE_GROUPS: AgeGroup[] = [
  { ageFrom: 11, ageTo: 12, ageCategory: '11/12' },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 17, ageCategory: '17'    },
  { ageFrom: 18, ageTo: 99, ageCategory: '18+'   },
];

const SE_LONDON_EVENT_RE = /((?:50|100|200|400|800|1500)m\s+(?:Freestyle|Backstroke|Breaststroke|Butterfly|Individual Medley))/;
const SE_LONDON_TIME_RE  = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function parseSection(lines: string[], course: '25m' | '50m', gender: string, result: CountyTimes): void {
  for (const line of lines) {
    const em = line.match(SE_LONDON_EVENT_RE);
    if (!em) continue;

    const rawEvent  = em[1];
    // "50m Freestyle" → "50 Freestyle"
    const eventName = rawEvent.replace(/^(\d+)m\s+/, '$1 ');
    const dataStr   = line.slice(em.index! + rawEvent.length);
    const allTimes  = dataStr.match(new RegExp(SE_LONDON_TIME_RE.source, 'g')) || [];

    const qtTimes = allTimes.filter((_, i) => i % 2 === 0);
    const ctTimes = allTimes.filter((_, i) => i % 2 === 1);
    addEntries(result, eventName, course, gender, SE_LONDON_AGE_GROUPS, qtTimes, ctTimes);
  }
}

function parsePage(pageText: string, course: '25m' | '50m', result: CountyTimes): void {
  const lines = pageText.split('\n');
  const headerIndices: number[] = [];

  lines.forEach((l, i) => {
    if (/QT\s+CT\s+QT\s+CT/.test(l)) headerIndices.push(i);
  });

  console.log(`[SELondonParser] ${course} QT/CT headers found:`, headerIndices.length);

  if (headerIndices.length >= 2) {
    // Block 1 = OPEN/MALE (faster times), Block 2 = FEMALE (slower times)
    parseSection(lines.slice(headerIndices[0] + 1, headerIndices[1]), course, 'Male',   result);
    parseSection(lines.slice(headerIndices[1] + 1),                   course, 'Female', result);
  } else if (headerIndices.length === 1) {
    parseSection(lines.slice(headerIndices[0] + 1), course, 'Male', result);
  }
}

export class SELondonParser implements PdfParser {
  detect(text: string): boolean {
    return text.includes('SE LONDON');
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};

    // Pages are separated by "Page 2 " in the extracted text
    const page2Start = text.indexOf('\nPage 2 ');
    const page1Text  = page2Start !== -1 ? text.slice(0, page2Start) : text;
    const page2Text  = page2Start !== -1 ? text.slice(page2Start)    : '';

    parsePage(page1Text, '50m', result); // Long Course
    if (page2Text) parsePage(page2Text, '25m', result); // Short Course

    console.log('[SELondonParser] total entries:', Object.keys(result).length);
    return { countyName: 'SE London', times: result };
  }
}
