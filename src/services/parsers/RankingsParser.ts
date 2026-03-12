import * as cheerio from 'cheerio';
import { RankingEntry } from '../../types';

export class RankingsParser {
    parse(html: string, swimmerName: string, swimmerClub: string): { entry: RankingEntry | null; total: number } {
        const $ = cheerio.load(html);
        const nameMatches: RankingEntry[] = [];
        let totalCount = 0;
        let lastPosition = 0;

        $('table tr').each((index, row) => {
            if (index === 0) return; // Skip header row

            const cells = $(row).find('td');
            if (cells.length < 6)
                return; // Skip rows that don't have enough cells

            totalCount++;

            const parsedPosition = parseInt($(cells[0]).text().trim());
            const isTied = isNaN(parsedPosition);
            const position = isTied ? lastPosition : parsedPosition;
            if (isTied)
                lastPosition = position;

            const name = $(cells[1]).text().trim();
            const club = $(cells[2]).text().trim();
            const venue = $(cells[5]).text().trim();
            const date = $(cells[7]).text().trim();
            const time = $(cells[8]).text().trim();
            const fina = $(cells[9]).text().trim();

            //Additional fields that could be parsed if needed:
            // const yob = $(cells[3]).text().trim();
            // const meetName = $(cells[4]).text().trim();
            // const level = $(cells[6]).text().trim();

            if (this.isMatchingName(name, swimmerName)) {
                nameMatches.push({
                    position,
                    name,
                    club,
                    time,
                    date,
                    venue,
                    fina,
                    isSwimmer: true,
                    isTied
                });
            }
        });

        let swimmerEntry: RankingEntry | null = null;

        if (nameMatches.length == 1) {
            swimmerEntry = nameMatches[0];
            console.log(`Unique match found for ${swimmerName}: Position ${swimmerEntry.position}, Time ${swimmerEntry.time}`);
        } else if (nameMatches.length > 1) {
            //Try to find an exact club match if multiple name matches are found
            const clubMatches = nameMatches.filter(entry => this.isMatchingClub(entry.club, swimmerClub));

            if (clubMatches.length > 0) {
                swimmerEntry = clubMatches[0];
                console.log(`Multiple matches found for ${swimmerName}, but club match found: Position ${swimmerEntry.position}, Time ${swimmerEntry.time}`);
            } else {
                console.warn(`Multiple matches found for ${swimmerName} with no club match. Returning first match: Position ${nameMatches[0].position}, Time ${nameMatches[0].time}`);
                swimmerEntry = nameMatches[0]; // Fallback to first match if no club match is found
            }
        }

        return { entry: swimmerEntry, total: totalCount };
    }

    private isMatchingName(entryName: string, swimmerName: string): boolean {
        const normalize = (str: string) => str.toLowerCase().replace(/\s/g, '');
        return normalize(entryName).includes(normalize(swimmerName));
    }

    private isMatchingClub(entryClub: string, swimmerClub: string): boolean {
        const normalize = (str: string) => str.toLowerCase().replace(/\s/g, '');
        return normalize(swimmerClub).startsWith(normalize(entryClub));
    }

    parseAll(html: string): RankingEntry[] {
        const $ = cheerio.load(html);
        const entries: RankingEntry[] = [];
        let lastPosition = 0;

        $('table tr').each((index, row) => {
            if (index === 0) return; // Skip header row

            const cells = $(row).find('td');
            if (cells.length < 6)
                return; // Skip rows that don't have enough cells

            const parsedPosition = parseInt($(cells[0]).text().trim());
            const isTied = isNaN(parsedPosition);
            const position = isTied ? lastPosition : parsedPosition;
            if (isTied)
                lastPosition = position;

            const name = $(cells[1]).text().trim();
            const club = $(cells[2]).text().trim();
            const venue = $(cells[5]).text().trim();
            const date = $(cells[7]).text().trim();
            const time = $(cells[8]).text().trim();
            const fina = $(cells[9]).text().trim();

            entries.push({
                position,
                name,
                club,
                time,
                date,
                venue,
                fina,
                isSwimmer: false,
                isTied
            });
        });

        return entries;
    }

}