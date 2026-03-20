import { PDFParse } from 'pdf-parse';
import { CountyTimes, CountyTimeEntry } from '../../types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STROKE_MAP: Record<string, string> = {
  FREE: 'Freestyle',
  FREESTYLE: 'Freestyle',
  BACK: 'Backstroke',
  BACKSTROKE: 'Backstroke',
  BREAST: 'Breaststroke',
  BREASTSTROKE: 'Breaststroke',
  FLY: 'Butterfly',
  BUTTERFLY: 'Butterfly',
  IM: 'Individual Medley',
  INDIVIDUALMEDLEY: 'Individual Medley',
};

function normalizeStroke(s: string): string {
  return STROKE_MAP[s.toUpperCase().replace(/\s+/g, '')] || s;
}

/** Extract all swimming time values from a concatenated string */
function extractTimes(str: string): string[] {
  return str.match(/\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g) || [];
}

/**
 * Add CountyTimes entries for each age in the provided age groups.
 */
function addEntries(
  result: CountyTimes,
  event: string,
  poolSize: '25m' | '50m',
  gender: string,
  ageGroups: Array<{ ageFrom: number; ageTo: number; ageCategory: string }>,
  times: string[],
  consTimes?: string[],
): void {
  times.forEach((time, i) => {
    if (i >= ageGroups.length || !time) return;
    const ag = ageGroups[i];
    const consTime = consTimes?.[i];
    const entry: CountyTimeEntry = {
      time,
      ...(consTime ? { considerationTime: consTime } : {}),
      ageFrom: ag.ageFrom,
      ageTo: ag.ageTo,
      ageCategory: ag.ageCategory,
    };
    for (let age = ag.ageFrom; age <= Math.min(ag.ageTo, 99); age++) {
      result[`${event}_${poolSize}_${gender}_${age}`] = entry;
    }
  });
}

// ─── Kent parser ─────────────────────────────────────────────────────────────

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
  { name: '800 Freestyle',          ageOffset: 1, hasCons: false },  // No 10/11, Auto only
  { name: '1500 Freestyle',         ageOffset: 1, hasCons: false },  // No 10/11, Auto only
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
  { name: '400 Individual Medley',  ageOffset: 1, hasCons: true  },  // No 10/11
];

const KENT_AGE_GROUPS = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10/11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 99, ageCategory: '17+'   },
];

function parseKentFormat(text: string, fileName: string): { countyName: string; times: CountyTimes } {
  const times: CountyTimes = {};
  const gender = fileName.toLowerCase().includes('female') ? 'Female' : 'Male';

  // Collect lines that are SC/LC time rows.
  // Allow optional whitespace between the SC/LC prefix and the first time value,
  // since newer pdfjs versions may insert a cell separator before the first number.
  const dataRows = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^(SC|LC)[\s\t\d:]/.test(l));

  console.log('[PdfImporter] Kent dataRows found:', dataRows.length, dataRows.slice(0, 4));

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

// ─── SEH / Hertfordshire parser ───────────────────────────────────────────────

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

const SEH_AGE_GROUPS = [
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

function parseSehSection(lines: string[], gender: string, result: CountyTimes): void {
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

function parseSehFormat(text: string): { countyName: string; times: CountyTimes } {
  const times: CountyTimes = {};
  const lines = text.split('\n');

  const headerIndices: number[] = [];
  lines.forEach((l, i) => {
    if (/QT\s*CT\s*QT\s*CT/.test(l)) headerIndices.push(i);
  });

  if (headerIndices.length >= 2) {
    parseSehSection(lines.slice(headerIndices[0] + 1, headerIndices[1]), 'Male',   times);
    parseSehSection(lines.slice(headerIndices[1] + 1),                   'Female', times);
  } else if (headerIndices.length === 1) {
    parseSehSection(lines.slice(headerIndices[0] + 1), 'Male', times);
  }

  return { countyName: 'Hertfordshire', times };
}

// ─── Surrey parser ────────────────────────────────────────────────────────────

const SURREY_AGE_GROUPS_8 = [
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

function normalizeSurreyEvent(raw: string): string {
  const m = raw.match(/^(\d+)m\s+(.+)$/i);
  if (!m) return raw;
  const normStroke = normalizeStroke(m[2].trim().replace(/\s+/g, ''));
  return `${m[1]} ${normStroke}`;
}

const SURREY_EVENT_RE = /(?<![.\d])((?:50|100|200|400|800|1500)m\s+(?:Freestyle|Backstroke|Breaststroke|Butterfly|IM))/gi;
const SURREY_TIME_RE  = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function parseSurreyQualifyingSection(sectionText: string, gender: string, result: CountyTimes): void {
  const eventRe  = new RegExp(SURREY_EVENT_RE.source, 'i');
  const timeRe   = new RegExp(SURREY_TIME_RE.source,  'g');

  for (const line of sectionText.split('\n')) {
    const em = line.match(eventRe);
    if (!em) continue;

    const eventName = normalizeSurreyEvent(em[0]);
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

function parseSurreyFormat(text: string): { countyName: string; times: CountyTimes } {
  const result: CountyTimes = {};

  const qualSections: Array<{ start: string; end: string; gender: string }> = [
    { start: 'OPEN/MALE County Qualifying Times',     end: 'OPEN/MALE County Consideration Times',  gender: 'Male'   },
    { start: 'FEMALE County Qualifying Times',        end: 'FEMALE County Consideration Times',     gender: 'Female' },
  ];

  for (const { start, end, gender } of qualSections) {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) continue;
    const endIdx  = text.indexOf(end, startIdx + start.length);
    const section = endIdx !== -1 ? text.slice(startIdx, endIdx) : text.slice(startIdx);
    const dataStart = section.indexOf('\n');
    if (dataStart !== -1) parseSurreyQualifyingSection(section.slice(dataStart), gender, result);
  }

  const consResult: CountyTimes = {};
  const consSections: Array<{ start: string; end: string; gender: string }> = [
    { start: 'OPEN/MALE County Consideration Times',  end: 'FEMALE County Qualifying Times',        gender: 'Male'   },
    { start: 'FEMALE County Consideration Times',     end: '',                                       gender: 'Female' },
  ];

  for (const { start, end, gender } of consSections) {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) continue;
    const endIdx  = end ? text.indexOf(end, startIdx + start.length) : -1;
    const section = endIdx !== -1 ? text.slice(startIdx, endIdx) : text.slice(startIdx);
    const dataStart = section.indexOf('\n');
    if (dataStart !== -1) parseSurreyQualifyingSection(section.slice(dataStart), gender, consResult);
  }

  for (const key of Object.keys(result)) {
    if (consResult[key]) {
      result[key] = { ...result[key], considerationTime: consResult[key].time };
    }
  }

  return { countyName: 'Surrey', times: result };
}

// ─── Hampshire parser ─────────────────────────────────────────────────────────

const HANTS_AGE_GROUPS_7 = [
  { ageFrom: 10, ageTo: 11, ageCategory: '10-11' },
  { ageFrom: 12, ageTo: 12, ageCategory: '12'    },
  { ageFrom: 13, ageTo: 13, ageCategory: '13'    },
  { ageFrom: 14, ageTo: 14, ageCategory: '14'    },
  { ageFrom: 15, ageTo: 15, ageCategory: '15'    },
  { ageFrom: 16, ageTo: 16, ageCategory: '16'    },
  { ageFrom: 17, ageTo: 99, ageCategory: '17'    },
];
const HANTS_AGE_GROUPS_6 = HANTS_AGE_GROUPS_7.slice(1);

function normalizeHampshireText(text: string): string {
  return text.replace(/(\d+)\.(\d{2})\.(\d{2})/g, '$1:$2.$3');
}

const HANTS_STROKE_DIST_RE = /(Freestyle|Backstroke|Butterfly|Breaststroke\s*|IM)\s*(50|100|200|400|800|1500)/i;
const HANTS_TIME_RE = /\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g;

function parseHampshireSection(text: string, course: '25m' | '50m', gender: string, result: CountyTimes): void {
  const normalised = normalizeHampshireText(text);
  for (const line of normalised.split('\n')) {
    const sdMatch = line.match(HANTS_STROKE_DIST_RE);
    if (!sdMatch) continue;

    const stroke    = sdMatch[1].trim();
    const dist      = sdMatch[2];
    const eventName = `${dist} ${normalizeStroke(stroke)}`;

    const sdPos     = line.search(HANTS_STROKE_DIST_RE);
    const leftStr   = line.slice(0, sdPos);
    const rightStr  = line.slice(sdPos + sdMatch[0].length);

    const autoTimes = leftStr.match(new RegExp(HANTS_TIME_RE.source, 'g'))  || [];
    const consTimes = rightStr.match(new RegExp(HANTS_TIME_RE.source, 'g')) || [];

    const ageGroups = autoTimes.length <= 6 ? HANTS_AGE_GROUPS_6 : HANTS_AGE_GROUPS_7;

    addEntries(result, eventName, course, gender, ageGroups, autoTimes, consTimes);
  }
}

function parseHampshireGenderText(text: string, gender: string, result: CountyTimes): void {
  const lcStart = text.indexOf('Qualifying Times - LONG COURSE');
  const scStart = text.indexOf('Qualifying Times - SHORT COURSE');

  if (lcStart !== -1) {
    const lcEnd = scStart !== -1 ? scStart : text.length;
    parseHampshireSection(text.slice(lcStart, lcEnd), '50m', gender, result);
  }
  if (scStart !== -1) {
    parseHampshireSection(text.slice(scStart), '25m', gender, result);
  }
}

function parseHampshireFormat(text: string): { countyName: string; times: CountyTimes } {
  const result: CountyTimes = {};

  const girlsWatermark = text.indexOf('\nGIRLS/LADIES\n');
  const boysWatermark  = text.indexOf('\nBOYS/MEN/OPEN\n');

  const girlsText = girlsWatermark !== -1 ? text.slice(0, girlsWatermark) : '';
  const boysText  = boysWatermark  !== -1
    ? text.slice(girlsWatermark !== -1 ? girlsWatermark : 0, boysWatermark)
    : '';

  parseHampshireGenderText(girlsText, 'Female', result);
  parseHampshireGenderText(boysText,  'Male',   result);

  return { countyName: 'Hampshire', times: result };
}

// ─── Middlesex parser ─────────────────────────────────────────────────────────

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

const MIDDX_AGE_GROUPS_7 = [
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

function parseMiddlesexEventBlock(blockText: string, course: '25m' | '50m', gender: string, result: CountyTimes): void {
  // Format: each event is on a single line: "<key> <times...> [<key>]"
  const eventKeys = Object.keys(MIDDLESEX_EVENT_MAP);
  for (const line of blockText.split('\n').map(l => l.trim()).filter(Boolean)) {
    const key = eventKeys.find(k => line.startsWith(k + ' ') || line === k);
    if (!key) continue;

    const eventName = MIDDLESEX_EVENT_MAP[key];
    // Strip leading event name
    let dataStr = line.slice(key.length).trim();
    // Strip trailing repeated event name (used as a label in the PDF)
    if (dataStr.endsWith(key)) {
      dataStr = dataStr.slice(0, dataStr.length - key.length).trim();
    }

    const hasNone = /NONE/i.test(dataStr);
    const cleanStr = dataStr.replace(/NONE/gi, ' ');
    const allTimes = extractMiddlesexTimes(cleanStr);
    const ageGroups = hasNone ? MIDDX_AGE_GROUPS_6 : MIDDX_AGE_GROUPS_7;
    const autoTimes = allTimes.filter((_, i) => i % 2 === 0);
    const consTimes = allTimes.filter((_, i) => i % 2 === 1);
    addEntries(result, eventName, course, gender, ageGroups, autoTimes, consTimes);
  }
}

function parseMiddlesexGenderSection(sectionText: string, gender: string, result: CountyTimes): void {
  const lines = sectionText.split('\n');

  const headerIndices: number[] = [];
  lines.forEach((line, i) => {
    if (/^Events?\b/i.test(line.trim())) headerIndices.push(i);
  });

  headerIndices.forEach((startIdx, bi) => {
    // Detect course from header text ("long" = 50m, "Short" = 25m)
    const headerLine = lines[startIdx].trim().toLowerCase();
    const course: '25m' | '50m' = headerLine.includes('short') ? '25m' : '50m';
    const endIdx = bi + 1 < headerIndices.length ? headerIndices[bi + 1] : lines.length;
    const blockText = lines.slice(startIdx + 1, endIdx).join('\n');
    parseMiddlesexEventBlock(blockText, course, gender, result);
  });
}

function parseMiddlesexFormat(text: string): { countyName: string; times: CountyTimes } {
  const result: CountyTimes = {};

  // Try multiple patterns for the gender section markers
  const boysMatch  = text.match(/\n(?:BOYS|MEN|MALE)[^\n]*\n/i);
  const girlsMatch = text.match(/\n(?:GIRLS|WOMEN|FEMALE)[^\n]*\n/i);

  console.log('[Middlesex] boysMatch:', boysMatch?.[0]?.trim(), 'at index', boysMatch?.index);
  console.log('[Middlesex] girlsMatch:', girlsMatch?.[0]?.trim(), 'at index', girlsMatch?.index);

  if (boysMatch?.index != null) {
    const boysEnd = girlsMatch?.index ?? text.length;
    parseMiddlesexGenderSection(text.slice(boysMatch.index, boysEnd), 'Male', result);
  }
  if (girlsMatch?.index != null) {
    parseMiddlesexGenderSection(text.slice(girlsMatch.index), 'Female', result);
  }

  console.log('[Middlesex] total entries parsed:', Object.keys(result).length);
  return { countyName: 'Middlesex', times: result };
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

let workerConfigured = false;

async function extractPdfText(data: Uint8Array): Promise<string> {
  if (!workerConfigured) {
    // Set worker source only in browser; in Node.js the path resolves as a 
    // filesystem.absolute path, causing pdf-parse to fail when it tries to 
    // import the worker module
    if (typeof (globalThis as { window?: unknown }).window !== 'undefined) {
      try {
        PDFParse.setWorker('/pdf.worker.mjs');
      } catch {
        // Worker setup is optional - falls back to main-thread rendering
      }
      workerConfigured = true;
    }
  }

  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText({
      // Concatenate text items on the same line (mirrors pdf-parse 1.x behaviour)
      cellSeparator: '',
      // Simple newline between pages
      pageJoiner: '\n',
    });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class PdfImporter {
  async importCountyTimesFromBuffer(
    buffer: Buffer | Uint8Array,
    fileName: string,
  ): Promise<{ countyName: string; times: CountyTimes }> {
    const uint8Array = buffer instance Uint8Array ? buffer : new Uint8Array(buffer);
    return this._parse(await extractPdfText(uint8Array), fileName);
  }
  
  async importCountyTimesFromBase64(
    base64: string,
    fileName: string,
  ): Promise<{ countyName: string; times: CountyTimes }> {
    const binaryString = atob(base64);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    return this._parse(awwait extractPdfText(uint8Array), fileName);
  }
  
  private _parser(text: string, fileName: string): {countyName: string; times: CountyTimes } {

    console.log('[PdfImporter] full extracted text:\n', text);

    // Kent detection: header row may be split by tabs in newer pdfjs versions,
    // so match on the key tokens rather than the exact concatenated string
    const isKent = text.includes('AutoCons.') || /Auto[\s\t]*Cons\./.test(text);
    if (isKent) {
      return parseKentFormat(text, fileName);
    }
    if (text.includes('Swim England Hertfordshire') || /QT\s*CT\s*QT\s*CT/.test(text)) {
      return parseSehFormat(text);
    }
    if (text.includes('Surrey County')) {
      return parseSurreyFormat(text);
    }
    if (text.includes('Hampshire County')) {
      return parseHampshireFormat(text);
    }
    if (/middlesex\s+county/i.test(text)) {
      return parseMiddlesexFormat(text);
    }

    throw new Error('Unrecognised county times PDF format. Supported: Kent, Hertfordshire (SEH), Surrey, Hampshire, Middlesex.');
  }
}
