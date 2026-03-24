import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries, extractTimes } from './pdfParserUtils';

interface KentEventConfig {
  name: string;
  /** 0 = all 7 age groups starting at 10/11; 1 = skip 10/11, start at 12 */
  ageOffset: number;
  /** true = Auto+Cons values interleaved (take even indices); false = Auto only */
  hasCons: boolean;
}

const KENT_EVENTS: KentEventConfig[] = [
  { name: '50 Freestyle',           ageOffset: 0, hasCons: true  },
  { name: '100 Freestyle',          ageOffset: 0, hasCons: true  },
  { name: '200 Freestyle',          ageOffset: 0, hasCons: true  },
  { name: '400 Freestyle',          ageOffset: 0, hasCons: true  },
  { name: '800 Freestyle',          ageOffset: 1, hasCons: false }, // No 10/11, Auto only
  { name: '1500 Freestyle',         ageOffset: 1, hasCons: false }, // No 10/11, Auto only
  { name: '50 Backstroke',          ageOffset: 0, hasCons: true  },
  { name: '100 Backstroke',         ageOffset: 0, hasCons: true  },
  { name: '200 Backstroke',         ageOffset: 0, hasCons: true  },
  { name: '50 Breaststroke',        ageOffset: 0, hasCons: true  },
  { name: '100 Breaststroke',       ageOffset: 0, hasCons: true  },
  { name: '200 Breaststroke',       ageOffset: 0, hasCons: true  },
  { name: '50 Butterfly',           ageOffset: 0, hasCons: true  },
  { name: '100 Butterfly',          ageOffset: 0, hasCons: true  },
  { name: '200 Butterfly',          ageOffset: 0, hasCons: true  },
  { name: '200 Individual Medley',  ageOffset: 0, hasCons: true  },
  { name: '400 Individual Medley',  ageOffset: 1, hasCons: true  }, // No 10/11
];

const KENT_AGE_GROUPS: AgeGroup[] = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 99, ageCategory: '17+'   },
];

export class KentParser implements PdfParser {
  detect(text: string): boolean {
    return text.includes('AutoCons.') || /Auto[\s\t]*Cons\./.test(text);
  }

  parse(text: string, fileName: string): { countyName: string; times: CountyTimes } {
    const times: CountyTimes = {};
    const gender = fileName.toLowerCase().includes('female') ? 'Female' : 'Male';

    // Collect lines that are SC/LC time rows.
    // Allow optional whitespace between the SC/LC prefix and the first time value,
    // since newer pdfjs versions may insert a cell separator before the first number.
    const dataRows = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^(SC|LC)[\s\t\d:]/.test(l));

    console.log('[KentParser] dataRows found:', dataRows.length, dataRows.slice(0, 4));

    // Pair consecutive SC+LC rows
    const pairs: Array<{ sc: string[]; lc: string[] }> = [];
    for (let i = 0; i + 1 < dataRows.length; i += 2) {
      const r1 = dataRows[i];
      const r2 = dataRows[i + 1];
      if (r1.startsWith('SC') && r2.startsWith('LC')) {
        pairs.push({
          sc: extractTimes(r1.slice(2)),
          lc: extractTimes(r2.slice(2)),
        });
      }
    }

    KENT_EVENTS.forEach((cfg, idx) => {
      if (idx >= pairs.length) return;
      const { sc, lc } = pairs[idx];
      const ageGroups = KENT_AGE_GROUPS.slice(cfg.ageOffset);

      (['sc', 'lc'] as const).forEach(k => {
        const course: '25m' | '50m' = k === 'sc' ? '25m' : '50m';
        const raw = k === 'sc' ? sc : lc;
        const autoTimes = cfg.hasCons ? raw.filter((_, i) => i % 2 === 0) : raw;
        const consTimes  = cfg.hasCons ? raw.filter((_, i) => i % 2 === 1) : undefined;
        addEntries(times, cfg.name, course, gender, ageGroups, autoTimes, consTimes);
      });
    });

    return { countyName: 'Kent', times };
  }
}
