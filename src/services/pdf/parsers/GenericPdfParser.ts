import { CountyTimes } from '../../../types';
import { AgeGroup, PdfParser, addEntries } from './pdfParserUtils';

const SESE_AGE_GROUPS: AgeGroup[] = [
    { ageFrom: 10, ageTo: 10, ageCategory: '10' },
    { ageFrom: 11, ageTo: 11, ageCategory: '11' },
    { ageFrom: 12, ageTo: 12, ageCategory: '12' },
    { ageFrom: 13, ageTo: 13, ageCategory: '13' },
    { ageFrom: 14, ageTo: 14, ageCategory: '14' },
    { ageFrom: 15, ageTo: 15, ageCategory: '15' },
    { ageFrom: 16, ageTo: 16, ageCategory: '16' },
    { ageFrom: 17, ageTo: 17, ageCategory: '17' },
    { ageFrom: 18, ageTo: 99, ageCategory: '18+' },
];

const EVENT_MAP: Record<string, string> = {
    '50 Free': '50 Freestyle',
    '100 Free': '100 Freestyle',
    '200 Free': '200 Freestyle',
    '400 Free': '400 Freestyle',
    '800 Free': '800 Freestyle',
    '1500 Free': '1500 Freestyle',
    '50 Freestyle': '50 Freestyle',
    '100 Freestyle': '100 Freestyle',
    '200 Freestyle': '200 Freestyle',
    '400 Freestyle': '400 Freestyle',
    '800 Freestyle': '800 Freestyle',
    '1500 Freestyle': '1500 Freestyle',
    '50 Back': '50 Backstroke',
    '100 Back': '100 Backstroke',
    '200 Back': '200 Backstroke',
    '50 Backstroke': '50 Backstroke',
    '100 Backstroke': '100 Backstroke',
    '200 Backstroke': '200 Backstroke',
    '50 Breaststroke': '50 Breaststroke',
    '100 Breaststroke': '100 Breaststroke',
    '200 Breaststroke': '200 Breaststroke',
    '50 Fly': '50 Butterfly',
    '100 Fly': '100 Butterfly',
    '200 Fly': '200 Butterfly',
    '50 Butterfly': '50 Butterfly',
    '100 Butterfly': '100 Butterfly',
    '200 Butterfly': '200 Butterfly',
    '100 IM': '100 Individual Medley',
    '200 IM': '200 Individual Medley',
    '400 IM': '400 Individual Medley',
    '100 Individual Medley': '100 Individual Medley',
    '200 Individual Medley': '200 Individual Medley',
    '400 Individual Medley': '400 Individual Medley',
};

function normalizeQualifyingTime(value : string) {
    let normalized = value.replace(/,/g, '.').replace(/：/g, ':');

    // mm:ss.cc  (e.g. "6:00.12")
    const mmsscc = normalized.match(/^([0-9]+):([0-9]{2})\.([0-9]{2})$/);
    if (mmsscc) {
        return `${parseInt(mmsscc[1], 10)}:${mmsscc[2]}.${mmsscc[3]}`;
    }

    // mm:ss.c or mm:ss.  (e.g. "6:00.1" or "6:00.")
    const mmssc = normalized.match(/^([0-9]+):([0-9]{2})\.([0-9]{0,2})$/);
    if (mmssc) {
        const cs = (mmssc[3] || '').padEnd(2, '0'); // "" → "00", "1" → "10"
        return `${parseInt(mmssc[1], 10)}:${mmssc[2]}.${cs}`;
    }

    // s.cc or s.c  (e.g. "32.4" → "32.40")
    const dotMsCs = normalized.match(/^([0-9]+)\.([0-9]{1,2})$/);
    if (dotMsCs) {
        return `${parseInt(dotMsCs[1], 10)}.${dotMsCs[2].padEnd(2, '0')}`;
    }

    // colonMissing: "6:.00.1" (if you really need this odd format)
    const colonMissing = normalized.match(/^([0-9]{1,2}):\.([0-9]{2})\.([0-9]{1,2})$/);
    if (colonMissing) {
        return `${parseInt(colonMissing[1], 10)}:${colonMissing[2]}.${colonMissing[3].padEnd(2, '0')}`;
    }

    // ss.cc
    const sscc = normalized.match(/^([0-9]{1,2})\.([0-9]{2})$/);
    if (sscc) {
        return `${parseInt(sscc[1], 10)}.${sscc[2]}`;
    }

    // ss:cc  (looks like you want "12:34" → "12.34")
    const ssColon = normalized.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (ssColon) {
        return `${parseInt(ssColon[1], 10)}.${ssColon[2]}`;
    }

    // Plain seconds, e.g. "32" -> "32.00"
    const plainSeconds = normalized.match(/^([0-9]{1,2})$/);
    if (plainSeconds) {
        return `${plainSeconds[1]}.00`;
    }
    
    // Not a time, return empty to filter out
    return '';
}

function parseEventRow(line: string, gender: string, result: CountyTimes): void {
    const match = line.match(/^(50|100|200|400|800|1500)m?\s+(Free|Freestyle|Breast|Breaststroke|Fly|Butterfly|Back|Backstroke|IM|Individual Medley)\b/i);
    if (!match)
        return;

    const eventKey = `${match[1]} ${match[2]}`;
    const eventName = EVENT_MAP[eventKey];
    if (!eventName)
        return;

    const poolSize = '50m';
    var tokens = line.slice(match[0].length).trim().split(/\s+/);
    console.log('[GenericPdfParser] tokens:', tokens);

    var normalizedTimes = tokens.map(normalizeQualifyingTime);
    console.log('[GenericPdfParser] normalized:', normalizedTimes);
    if (normalizedTimes.filter(t => t !== '').length < 7) {
        console.log('[GenericPdfParser] not enough times:', normalizedTimes.filter(t => t !== '').length);
        return;
    }
    const qtTimes: string[] = [];
    const ctTimes: string[] = [];
    for (let i = 0; i < normalizedTimes.length; i += 1) {
        var time = normalizedTimes[i];
        if (time === '') {
            console.log(`[GenericPdfParser] skipping invalid time at index ${i}: "${tokens[i]}"`);
            continue;
        }
        qtTimes.push(time);
    }
    console.log('[GenericPdfParser] qtTimes:', qtTimes, 'ctTimes:', ctTimes);
    addEntries(result, eventName, poolSize, gender, SESE_AGE_GROUPS, qtTimes, ctTimes);
}

function parseGenderSection(lines: string[], gender: string, result: CountyTimes): void {
    console.log(`[GenericPdfParser] parsing ${gender} section with ${lines.length} lines`);
    lines.forEach(line => parseEventRow(line, gender, result));
}

export class GenericPdfParser {
    detect(text: string, fileName?: string): boolean {
        return true;
    }
    parse(text: string, fileName?: string): { countyName: string; times: CountyTimes } {
        console.log('[GenericPdfParser] parsing PDF with GenericPdfParser - this is a fallback and may not produce correct results');
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        console.log('[GenericPdfParser] total lines:', lines.length);
        const maleStart = lines.findIndex(l => /male|open/i.test(l));
        const femaleStart = lines.findIndex(l => /^female qualifying times$/i.test(l));
        const result: CountyTimes = {};
        if (maleStart !== -1) {
            const maleEnd = femaleStart !== -1 ? femaleStart : lines.length;
            console.log(`[GenericPdfParser] parsing male section from ${maleStart + 1} to ${maleEnd}`);
            parseGenderSection(lines.slice(maleStart + 1, maleEnd), 'Male', result);
        }
        if (femaleStart !== -1) {
            console.log(`[GenericPdfParser] parsing female section from ${femaleStart + 1}`);
            parseGenderSection(lines.slice(femaleStart + 1), 'Female', result);
        }
        console.log('[GenericPdfParser] total entries parsed:', Object.keys(result).length);
        return { countyName: 'Custom', times: result };
    }
}

