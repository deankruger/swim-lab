import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addConsiderationEntries } from './pdfParserUtils';

// Essex Age Group championships have ONLY consideration times (no automatic qualifying times).
// Times are stored in the `considerationTime` field; `time` is left empty.

const ESSEX_AGE_GROUPS_8: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 17, ageCategory: '17'    },
  { ageFrom: 18, ageTo: 99, ageCategory: '18+'   },
];

// 800m/1500m Freestyle and 400m IM start at age 12 (no 10/11 group)
const ESSEX_AGE_GROUPS_7: AgeGroup[] = ESSEX_AGE_GROUPS_8.slice(1);

const EVENTS_NO_1011 = new Set(['800 Freestyle', '1500 Freestyle', '400 Individual Medley']);

interface EssexEventDef {
  // Pattern to find the event label in the extracted line
  pattern: RegExp;
  // Normalised event name used as key in CountyTimes
  name: string;
}

const EVENT_DEFS: EssexEventDef[] = [
  { pattern: /1500m Freestyle/,   name: '1500 Freestyle'         },
  { pattern: /800m Freestyle/,    name: '800 Freestyle'          },
  { pattern: /400m Freestyle/,    name: '400 Freestyle'          },
  { pattern: /200m Freestyle/,    name: '200 Freestyle'          },
  { pattern: /100m Freestyle/,    name: '100 Freestyle'          },
  { pattern: /50m Freestyle/,     name: '50 Freestyle'           },
  { pattern: /200m Backstroke/,   name: '200 Backstroke'         },
  { pattern: /100m Backstroke/,   name: '100 Backstroke'         },
  { pattern: /50m Backstroke/,    name: '50 Backstroke'          },
  { pattern: /200m Breaststroke/, name: '200 Breaststroke'       },
  { pattern: /100m Breaststroke/, name: '100 Breaststroke'       },
  { pattern: /50m Breaststroke/,  name: '50 Breaststroke'        },
  { pattern: /200m Butterfly/,    name: '200 Butterfly'          },
  { pattern: /100m Butterfly/,    name: '100 Butterfly'          },
  { pattern: /50m Butterfly/,     name: '50 Butterfly'           },
  { pattern: /400m IM/,           name: '400 Individual Medley'  },
  { pattern: /200m IM/,           name: '200 Individual Medley'  },
];

const TIME_RE = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function normalizeLine(line: string): string {
  // Fix typos like "00:38..60" → "00:38.60"
  return line.replace(/\.{2,}/g, '.');
}

function extractLineTimes(str: string): string[] {
  return str.match(new RegExp(TIME_RE.source, 'g')) || [];
}

export class EssexParser implements PdfParser {
  detect(text: string, fileName: string): boolean {
    return /swim\s+england\s+essex/i.test(text) || /essex.*county.*age\s+group/i.test(text)
      || /essex/i.test(fileName);
  }

  parse(text: string): { countyName: string; times: CountyTimes } {
    const result: CountyTimes = {};
    const lines = text.split('\n');

    for (const rawLine of lines) {
      const line = normalizeLine(rawLine);

      for (const { pattern, name } of EVENT_DEFS) {
        const match = line.match(pattern);
        if (!match || match.index === undefined) continue;

        const eventEnd  = match.index + match[0].length;
        const leftStr   = line.slice(0, match.index);
        const rightStr  = line.slice(eventEnd);

        const maleTimes   = extractLineTimes(leftStr);
        const femaleTimes = extractLineTimes(rightStr);

        const ageGroups = EVENTS_NO_1011.has(name) ? ESSEX_AGE_GROUPS_7 : ESSEX_AGE_GROUPS_8;

        // All Essex times are consideration times only (no automatic qualifying times).
        addConsiderationEntries(result, name, '25m', 'Male',   ageGroups, maleTimes);
        addConsiderationEntries(result, name, '25m', 'Female', ageGroups, femaleTimes);
        break;
      }
    }

    console.log('[EssexParser] total entries:', Object.keys(result).length);
    return { countyName: 'Essex', times: result };
  }
}
