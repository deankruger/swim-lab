import { SwimmerRankings, SwimmerData } from "../../types";
import { HttpClient } from "../http/HttpClient";
import { RankingsParser } from "../parsers/RankingsParser";

export class RankingsFetcher{

    constructor(
        private httpClient: HttpClient,
        private rankingsParser: RankingsParser
    ){ }

    async getSwimmerRankings(swimmerData: SwimmerData, level?: 'C' | 'N', forecast?: boolean, countyCode: string = 'KNTQ'): Promise<SwimmerRankings>{
        throw new Error('Not implemented');
    }
}