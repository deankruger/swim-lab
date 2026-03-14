import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { SwimmerData, SwimTime } from '../../types';
import { TimeConverter } from '../utils/TimeConverter';

export class SwimmerTimesParser {
    constructor(private timeConverter: TimeConverter) {}

    parse(html: string, tiref: string): SwimmerData {        
        const $ = cheerio.load(html);
        const swimmerInfo: SwimmerData = {
            tiref,
            name: '',            
            club: '',
            region: '',
            times: []
        };

        //Extract swimmer basic info
        this.extractSwimmerInfo($, swimmerInfo);

        //Parse times from tables
        const timesByEvent = this.extractTimes($);

        swimmerInfo.times = Object.values(timesByEvent);
        console.log('Total times extracted:', swimmerInfo.times.length);

        return swimmerInfo;
    }

    private extractSwimmerInfo($: cheerio.CheerioAPI, swimmerInfo: SwimmerData): void {
        const headerText = $('h2, h3').first().text();
        if (headerText) {
            const fullHeader = headerText.trim();
            const headerMatch = fullHeader.match(/^(.+?)\s*-\s*\(\d+\)\s*-\s(.+)$/);
            if (headerMatch) {
                swimmerInfo.name = headerMatch[1].trim();
                swimmerInfo.club = headerMatch[2].trim();
            } else {
                swimmerInfo.name = fullHeader; // Fallback to full header if format is unexpected
            }
        }
        //Extract Region
        $('p, div, span').each((_, element) => {
            const text = $(element).text().trim();
            const regionMatch = text.match(/Region:\s*([^\n\r]+?)(?:\s*$)/i);

            if (regionMatch && !swimmerInfo.region) {  
                swimmerInfo.region = regionMatch[1].trim();
            }
        });

        console.log('Extracted Swimmer Info:', swimmerInfo);
    }

    private extractTimes($: cheerio.CheerioAPI): {[key: string]: SwimTime } {
        const timesByEvent: {[key: string]: SwimTime } = {};

        $('table').each((tableIndex, table) => {
            //console.log(table);
            const tableCourse = this.detectCourseFromTable($, table);
            console.log(`Processing table ${tableIndex + 1} with detected course: ${tableCourse || 'Unknown'}`);

            $(table).find('tr').each((_, row) => {
                const swimTime = this.parseTimeRow($, row, tableCourse);

                if (swimTime) {
                    const key = `${swimTime.event}_${swimTime.course}`;
                    if (!timesByEvent[key] || this.timeConverter.compareSwimTimes(swimTime.time, timesByEvent[key].time) < 0) {
                        timesByEvent[key] = swimTime;
                    }
                }
            });
        });

        return timesByEvent;
    }
    
    private detectCourseFromTable($: cheerio.CheerioAPI, table: AnyNode): '25m' | '50m' | null {
        const prevElements = $(table).prevAll();
        
        for (let i = 0; i <  Math.min(5, prevElements.length); i++) {
            const elem = $(prevElements[i]);
            const text = elem.text().toLowerCase();

            if (text.includes('long course') || text.includes('50m') || text.includes('50 m')) {
                return '50m';
            } else if (text.includes('short course') || text.includes('25m') || text.includes('25 m')) {
                return '25m';
            }
        }
        
        return null; // Unable to determine course
    }

    private parseTimeRow($: cheerio.CheerioAPI, row: AnyNode, tableCourse: '25m' | '50m' | null): SwimTime | null {
        const cells = $(row).find('td');
        if (cells.length < 5) return null; // Not enough data

        const event = $(cells[0]).text().trim();
        const time = $(cells[1]).text().trim();
        const convertedToSC = tableCourse === '25m' ? time :  $(cells[2]).text().trim();
        const convertedToLC = tableCourse === '50m' ? time :  $(cells[2]).text().trim();
        const date = $(cells[4]).text().trim();
        const venue = cells.length >= 6 ? $(cells[5]).text().trim() : '';
        
        //Determins course
        let course: '25m' | '50m' = tableCourse || '25m'

        //Check course info is in the table cell
        if (cells.length >= 7) {
            const possibleCourse = $(cells[6]).text().trim();
            if (possibleCourse === '25m' || possibleCourse === '50m') {
                course = possibleCourse;
            }
        }
        
        if (venue.includes('50m') || venue.includes('50 m')) {
            course = '50m';
        } else if (venue.includes('25m') || venue.includes('25 m')) {
            course = '25m';
        }

        if (!this.IsValidTimeRow(event, time)){
            return null;
        }

        return {
            event,
            course,
            time,
            convertedToSC: convertedToSC || undefined,
            convertedToLC: convertedToLC || undefined,
            date,
            venue
        };
    }

    private IsValidTimeRow(event: string, time: string): boolean {
        if (!event || !time) return false;

        const eventLower = event.toLowerCase();
        if (eventLower === 'event' || eventLower === 'stroke' || eventLower.includes('personal best')) {
            return false;
        }

        if (!time.match(/\d+[:\.]\d+/)) {
            return false;
        }

        return true;
    }
}