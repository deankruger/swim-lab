import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries, normalizeStroke } from './pdfParserUtils';

const HANTS_AGE_GROUPS_7: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10-11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 99, ageCategory: '17'    },
];
const HANTS_AGE_GROUPS_6 = HANTS_AGE_GROUPS_7.slice(1);

const HANTS_STROKE_DIST_RE = /(Freestyle|Backstroke|Butterfly|Breaststroke\s*|IM)\s*(50|100|200|400|800|1500)/i;
const HANTS_TIME_RE = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function normalizeHampshireText(text: string): string {
  return text.replace(/(\d+)\.(\d{2})\.(\d{2})/g, '$1:$2.$3');
}

function parseSection(text: string, course: '25m' | '50m', gender: string, result: CountyTimes): void {
  const normalised = normalizeHampshireText(text);
  for (const line of normalised.split('\n')) {
    const sdMatch = line.match(HANTS_STROKE_DIST_RE);
    if (!sdMatch) continue;

    const stroke    = sdMatch[1].trim();
    const dist      = sdMatch[2];
    const eventName = `${dist} ${normalizeStroke(stroke)}`;

    const sdPos    = line.search(HANTS_STROKE_DIST_RE);
    const leftStr  = line.slice(0, sdPos);
    const rightStr = line.slice(sdPos + sdMatch[0].length);

    const autoTimes = leftStr.match(new RegExp(HANTS_TIME_RE.source, 'g'))  || [];
    const consTimes = rightStr.match(new RegExp(HANTS_TIME_RE.source, 'g')) || [];

    const ageGroups = autoTimes.length <= 6 ? HANTS_AGE_GROUPS_6 : HANTS_AGE_GROUPS_7;
    addEntries(result, eventName, course, gender, ageGroups, autoTimes, consTimes);
  }
}

function parseGenderText(text: string, gender: string, result: CountyTimes): void {
  const lcStart = text.indexOf('Qualifying Times - LONG COURSE');
  const scStart = text.indexOf('Qualifying Times - SHORT COURSE');

  if (lcStart !== -1) {
    const lcEnd = scStart !== -1 ? scStart : text.length;
    parseSection(text.slice(lcStart, lcEnd), '50m', gender, result);
  }
  if (scStart !== -1) {
    parseSection(text.slice(scStart), '25m', gender, result);
  }
}

export class HampshireParser implements PdfParser {
  detect(text: string): boolean {
    return text.includes('Hampshire County');
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};

    const girlsWatermark = text.indexOf('\nGIRLS/LADIES\n');
    const boysWatermark  = text.indexOf('\nBOYS/MEN/OPEN\n');

    const girlsText = girlsWatermark !== -1 ? text.slice(0, girlsWatermark) : '';
    const boysText  = boysWatermark  !== -1
      ? text.slice(girlsWatermark !== -1 ? girlsWatermark : 0, boysWatermark)
      : '';

    parseGenderText(girlsText, 'Female', result);
    parseGenderText(boysText,  'Male',   result);

    return { countyName: 'Hampshire', times: result };
  }
}
