import { SwimmerSearchResult, SwimmerData, KentTimes, ComparisonResult, SwimmerRankings } from '../types';
import { HttpClient } from './http/HttpClient';
import { TimeConverter } from './utils/TimeConverter';
import { SwimmerSearchParser } from './parsers/SwimmerSearchParser';
import { SwimmerTimesParser } from './parsers/SwimmerTimesParser';
import { RankingsParser } from './parsers/RankingsParser';
import { SwimmerScraper } from './scrapers/SwimmerScraper';
import { RankingsFetcher } from './rankings/RankingsFetcher';
import { StandardsComparator } from './comparators/StandardsComparator';

class SwimmerService {
    private swimmerScraper: SwimmerScraper;
    private rankingsFetcher: RankingsFetcher;
    private standardsComparator: StandardsComparator;

    constructor() {
        //Init dependencies
        const httpClient = new HttpClient();
        const timeConverter = new TimeConverter();

        //Init parsers
        const searchParser = new SwimmerSearchParser();
        const timesParser = new SwimmerTimesParser(timeConverter);
        const rankingsParser = new RankingsParser();

        //Init scrapers and fetchers
        this.swimmerScraper = new SwimmerScraper(httpClient, searchParser, timesParser);
        this.rankingsFetcher = new RankingsFetcher(httpClient, rankingsParser);
        this.standardsComparator = new StandardsComparator(timeConverter);
    }


    async searchSwimmer(surname: string): Promise<SwimmerSearchResult[]> {
        return this.swimmerScraper.searchSwimmer(surname);
    }

    async getSwimmerTimes(tiref: string): Promise<SwimmerData> {
        return this.swimmerScraper.getSwimmerTimes(tiref);
    }
    
    compareWithStandards(swimmerData: SwimmerData, standards: KentTimes) : ComparisonResult {        
        return this.standardsComparator.compareWithStandards(swimmerData, standards);
    }

    async getSwimmerRankings(swimmerData: SwimmerData, level?: 'C' | 'N', forecast?: boolean, countyCode?: string): Promise<SwimmerRankings> {
        return this.rankingsFetcher.getSwimmerRankings(swimmerData, level, forecast, countyCode);
    }
}

export default SwimmerService;
