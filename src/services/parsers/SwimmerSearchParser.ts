import * as cheerio from 'cheerio';
import { SwimmerSearchResult } from '../../types';  

export class SwimmerSearchParser {

    parse(html: string): SwimmerSearchResult[] {
        const $ = cheerio.load(html);
        const swimmers: SwimmerSearchResult[] = [];

        $('table tr').each((index, element) => {
            if (index === 0) return; // Skip header row

            const cells = $(element).find('td');
            if (cells.length == 0) return; 

            const link = $(element).find('a');
            if (link.length == 0) return; 

            const href = link.attr('href');
            const tirefMatch = href?.match(/tiref=(\d+)/);

            if (!tirefMatch) return;

            const tiref = tirefMatch[1];
            const surname = $(cells[1]).text().trim();
            const firstName = $(cells[2]).text().trim();
            const knownName = $(cells[3]).text().trim();
            const birthYear = $(cells[4]).text().trim();
            const gender = $(cells[5]).text().trim();
            const club = $(cells[6]).text().trim();
            const fullName = `${firstName} ${surname}`.trim();

            swimmers.push({
                name: fullName,
                tiref,
                club,
                birthYear,
                gender,
                knownName
            });

        });

        return swimmers;
    }
}