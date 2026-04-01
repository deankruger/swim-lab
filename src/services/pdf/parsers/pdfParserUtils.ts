import { CountyTimes, CountyTimeEntry } from '../../../types';

export interface AgeGroup {
  ageFrom: number;
  ageTo: number;
  ageCategory: string;
}

export interface PdfParser {
  detect(text: string, fileName: string): boolean;
  parse(text: string, fileName: string): { countyName: string; times: CountyTimes };
  /* Optional: return multiple named sets from a single PDF (eg. SSA Level 3 / Level 3 / SANJ). */
  parseMultiple? (text: string, fileName: string) : Array<{ countyName: string; times: CountyTimes}>;
}

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

export function normalizeStroke(s: string): string {
  return STROKE_MAP[s.toUpperCase().replace(/\s+/g, '')] || s;
}

export function extractTimes(str: string): string[] {
  return str.match(/\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2}/g) || [];
}

export function addEntries(
  result: CountyTimes,
  event: string,
  poolSize: '25m' | '50m',
  gender: string,
  ageGroups: AgeGroup[],
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
    // One key per age group, not per individual age — keeps storage compact.
    // Key format: Event_course_Gender_ageFrom_ageTo
    result[`${event}_${poolSize}_${gender}_${ag.ageFrom}_${ag.ageTo}`] = entry;
  });
}
