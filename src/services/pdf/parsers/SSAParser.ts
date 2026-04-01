import { CountyTimes, CountyTimeEntry } from '../../../types';
import { PdfParser } from './pdfParserUtils';

// ─── Static age-group list (matches fixed page order in PDF) ─────────────────

interface SSAAgeGroup {
  gender: string;
  ageFrom: number;
  ageTo: number;
  ageCategory: string;
}

const FIXED_AGE_GROUPS: SSAAgeGroup[] = [
  { gender: 'Female', ageFrom: 0,  ageTo: 10, ageCategory: '10 & Under' },
  { gender: 'Female', ageFrom: 11, ageTo: 11, ageCategory: '11'         },
  { gender: 'Female', ageFrom: 12, ageTo: 12, ageCategory: '12'         },
  { gender: 'Female', ageFrom: 13, ageTo: 13, ageCategory: '13'         },
  { gender: 'Female', ageFrom: 14, ageTo: 14, ageCategory: '14'         },
  { gender: 'Female', ageFrom: 15, ageTo: 15, ageCategory: '15'         },
  { gender: 'Female', ageFrom: 16, ageTo: 16, ageCategory: '16'         },
  { gender: 'Male',   ageFrom: 0,  ageTo: 10, ageCategory: '10 & Under' },
  { gender: 'Male',   ageFrom: 11, ageTo: 11, ageCategory: '11'         },
  { gender: 'Male',   ageFrom: 12, ageTo: 12, ageCategory: '12'         },
  { gender: 'Male',   ageFrom: 13, ageTo: 13, ageCategory: '13'         },
  { gender: 'Male',   ageFrom: 14, ageTo: 14, ageCategory: '14'         },
  { gender: 'Male',   ageFrom: 15, ageTo: 15, ageCategory: '15'         },
  { gender: 'Male',   ageFrom: 16, ageTo: 16, ageCategory: '16'         },
];

// ─── Event name mapping ───────────────────────────────────────────────────────

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
  '200 IM':     '200 Individual Medley',
  '400 IM':     '400 Individual Medley',
};

// Sorted longest-first to prevent shorter names partially matching longer ones.
const EVENT_RE =
  /200 Breast|100 Breast|1500 Free|800 Free|400 Free|200 Free|100 Free|50 Breast|200 Back|100 Back|50 Free|200 Fly|100 Fly|50 Back|400 IM|200 IM|50 Fly/;

// ─── Time handling ────────────────────────────────────────────────────────────

/**
 * Extract raw time tokens from a string.
 * Handles all formats found in the SSA PDF:
 *   SS.cc       e.g. 39.72
 *   SS:cc       e.g. 58:69  (colon used as decimal separator in source)
 *   M.SS.cc     e.g. 1.32.45
 *   M.SS:cc     e.g. 1.16:00, 2.49:95
 *   MM.SS:cc    e.g. 10.37:38, 20.20:46
 *   MM:SS.cc    e.g. 02:53.36
 */
function extractSSATimes(text: string): string[] {
  return (
    text.match(
      /\d{1,2}\.\d{2}[:.]\d{2}|\d{2}:\d{2}\.\d{2}|\d{2}[:.]\d{2}/g,
    ) ?? []
  );
}

/**
 * Normalise any SSA time variant to the standard M:SS.cc (or SS.cc) form
 * that TimeConverter can parse.
 */
function normalizeSSATime(t: string): string {
  let m: RegExpMatchArray | null;

  // MM:SS.cc  e.g. 02:53.36 — strip leading zero
  m = t.match(/^0?(\d+):(\d{2})\.(\d{2})$/);
  if (m) return `${parseInt(m[1], 10)}:${m[2]}.${m[3]}`;

  // M(M).SS:cc  e.g. 1.16:00, 2.49:95, 10.37:38 → M:SS.cc
  m = t.match(/^(\d{1,2})\.(\d{2}):(\d{2})$/);
  if (m) return `${parseInt(m[1], 10)}:${m[2]}.${m[3]}`;

  // M.SS.cc  e.g. 1.32.45, 3.40.94 → M:SS.cc
  m = t.match(/^(\d)\.(\d{2})\.(\d{2})$/);
  if (m) return `${m[1]}:${m[2]}.${m[3]}`;

  // SS:cc  e.g. 58:69, 56:22 → SS.cc
  m = t.match(/^(\d{2}):(\d{2})$/);
  if (m) return `${m[1]}.${m[2]}`;

  // SS.cc — already fine
  return t;
}

// ─── Column assignment ────────────────────────────────────────────────────────

interface LevelColumns {
  SANJ?: string;
  LEVEL3?: string;
  LEVEL2?: string;
}

/**
 * Given N times from one side (LC or SC) of an event row, assign them to the
 * SSA qualification levels.
 *
 * Column order in the PDF is always: SANJ | LEVEL 3 | LEVEL 2 (left → right).
 * Empty cells are simply absent from the extracted text, so N values fill from
 * the left — except for 50 m events and the 10-&-Under age group where only
 * LEVEL 2 is published (rightmost column).
 *
 *   3 values → [SANJ, LEVEL3, LEVEL2]
 *   2 values → [SANJ, LEVEL3]
 *   1 value, 50 m or 10-&-Under → LEVEL2
 *   1 value, other              → SANJ  (long/specialist events)
 */
function assignLevelColumns(
  times: string[],
  is50m: boolean,
  is10Under: boolean,
): LevelColumns {
  if (times.length === 3) return { SANJ: times[0], LEVEL3: times[1], LEVEL2: times[2] };
  if (times.length === 2) return { SANJ: times[0], LEVEL3: times[1] };
  if (times.length === 1) {
    if (is50m || is10Under) return { LEVEL2: times[0] };
    return { SANJ: times[0] };
  }
  return {};
}

// ─── Section parser ───────────────────────────────────────────────────────────

interface LevelMaps {
  level2: CountyTimes;
  level3: CountyTimes;
  sanj: CountyTimes;
}

function makeEntry(time: string, ag: SSAAgeGroup): CountyTimeEntry {
  return { time, ageFrom: ag.ageFrom, ageTo: ag.ageTo, ageCategory: ag.ageCategory };
}

function parseSection(sectionText: string, ag: SSAAgeGroup, maps: LevelMaps): void {
  const is10Under = ag.ageTo <= 10;
  const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const eventMatch = line.match(EVENT_RE);
    if (!eventMatch) continue;

    const eventRaw = eventMatch[0];
    const eventFull = EVENT_MAP[eventRaw];
    if (!eventFull) continue;

    const splitIdx = line.indexOf(eventRaw);
    const lcPart = line.slice(0, splitIdx).trim();
    const scPart = line.slice(splitIdx + eventRaw.length).trim();

    const is50m = eventRaw.startsWith('50 ');
    const lcCols = assignLevelColumns(extractSSATimes(lcPart).map(normalizeSSATime), is50m, is10Under);
    const scCols = assignLevelColumns(extractSSATimes(scPart).map(normalizeSSATime), is50m, is10Under);

    const store = (cols: LevelColumns, course: '25m' | '50m') => {
      const key = `${eventFull}_${course}_${ag.gender}_${ag.ageFrom}_${ag.ageTo}`;
      if (cols.LEVEL2) maps.level2[key] = makeEntry(cols.LEVEL2, ag);
      if (cols.LEVEL3) maps.level3[key] = makeEntry(cols.LEVEL3, ag);
      if (cols.SANJ)   maps.sanj[key]   = makeEntry(cols.SANJ,   ag);
    };

    store(lcCols, '50m');
    store(scCols, '25m');
  }
}

// ─── Parser class ─────────────────────────────────────────────────────────────

export class SSAParser implements PdfParser {
  detect(text: string): boolean {
    return (
      text.includes('SSA AGE GROUP QUALIFYING TIMES') ||
      (text.includes('LEVEL 3') && text.includes('LEVEL 2') && text.includes('SANJ') &&
       text.includes('50 Free') && text.includes('200 IM'))
    );
  }

  /** Single-set fallback: returns LEVEL2 times only. */
  parse(text: string): { countyName: string; times: CountyTimes } {
    const sets = this.parseMultiple(text);
    return sets.find(s => s.countyName.includes('Level 2')) ?? sets[0];
  }

  parseMultiple(text: string): Array<{ countyName: string; times: CountyTimes }> {
    console.log('[SSAParser] parsing SSA Age Group QTs → Level 2, Level 3, SANJ');

    // The PDF text-extraction order (pdfjs rendering): data cells appear before
    // section labels ("Women 11-11" etc.).  Each age-group data block is
    // introduced by a column-header line containing LEVEL 3 / LEVEL 2 / SANJ.
    // We split on that pattern to get one text chunk per age group; chunks
    // appear in the fixed order Women 10U … Women 16 → Men 10U … Men 16.
    const sections = text.split(
      /(?:SANJ\s+)?LEVEL\s+3\s+LEVEL\s+2\s+(?:SANJ\s+)?LEVEL\s+3\s+LEVEL\s+2/,
    );
    // sections[0]  = preamble (ignored)
    // sections[1..14] = one section per age group
    const dataSections = sections.slice(1, FIXED_AGE_GROUPS.length + 1);

    console.log(`[SSAParser] sections found: ${dataSections.length} (expected ${FIXED_AGE_GROUPS.length})`);

    const maps: LevelMaps = { level2: {}, level3: {}, sanj: {} };

    dataSections.forEach((sectionText, i) => {
      const ag = FIXED_AGE_GROUPS[i];
      if (ag) parseSection(sectionText, ag, maps);
    });

    const results: Array<{ countyName: string; times: CountyTimes }> = [];
    if (Object.keys(maps.level2).length) results.push({ countyName: 'SSA Level 2', times: maps.level2 });
    if (Object.keys(maps.level3).length) results.push({ countyName: 'SSA Level 3', times: maps.level3 });
    if (Object.keys(maps.sanj).length)   results.push({ countyName: 'SSA SANJ',    times: maps.sanj   });

    return results;
  }
}
