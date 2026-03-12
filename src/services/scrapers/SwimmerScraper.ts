import { HttpClient } from '../http/HttpClient';
import { SwimmerSearchParser } from '../parsers/SwimmerSearchParser';
import { SwimmerTimesParser } from '../parsers/SwimmerTimesParser';
import {SwimmerSearchResult, SwimmerData } from '../../types'

export class SwimmerScraper {
    private baseUrl = 'htps://www.swimmingresults.org';

    constructor(
        private httpClient: HttpClient,
        private searchParser: SwimmerSearchParser,
        private timesParser: SwimmerTimesParser
    ){}

    async searchSwimmer(surname: string): Promise<SwimmerSearchResult[]>{
        try{
            const url = `${this.baseUrl}/individualbest/personal_best.php?mode=A&tiref=${encodeURIComponent(surname)}`
            const html = await this.httpClient.get(url);
            return this.searchParser.parse(html);
        }catch (error){
            console.error('Error searching swimmer:', error);
            throw new Error(`Failed searching swimmer: ${(error as Error).message}`);
        }
    }

    async getSwimmerTimes(tiref: string): Promise<SwimmerData>{
        try{
            const url = `${this.baseUrl}/individualbest/personal_best.php?mode=A&tiref=${tiref}`;
            const html = await this.httpClient.get(url);
            return this.timesParser.parse(html, tiref);
        }catch(error){
            console.error('Error getting swimmer times:', error);
            throw new Error(`Failed to get swimmer times: ${(error as Error).message}`);
        }
    }
}

