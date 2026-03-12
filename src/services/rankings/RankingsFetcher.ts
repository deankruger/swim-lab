import { SwimmerRankings, SwimmerData } from "../../types";

export class RankingsFetcher{
    async getSwimmerRankings(swimmerData: SwimmerData, level?: 'C' | 'N', forecast?: boolean, countyCode: string = 'KNTQ'): Promise<SwimmerRankings>{
        throw new Error('Not implemented');
    }


}