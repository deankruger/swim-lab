import express from 'express';
import { HttpClient } from '../services/http/HttpClient';
import { SwimmerSearchParser } from '../services/parsers/SwimmerSearchParser';
import { SwimmerTimesParser } from '../services/parsers/SwimmerTimesParser';
import { RankingsParser } from '../services/parsers/RankingsParser';
import { SwimmerScraper } from '../services/scrapers/SwimmerScraper'
import { RankingsFetcher } from '../services/rankings/RankingsFetcher';;
import { TimeConverter } from '../services/utils/TimeConverter';
import { SwimmerData } from '../types';

const router = express.Router();

const httpClient = new HttpClient(true);
const timeConverter = new TimeConverter();
const scraper = new SwimmerScraper(
    httpClient, 
    new SwimmerSearchParser(),
    new SwimmerTimesParser(timeConverter)
);
const rankingsFetcher = new RankingsFetcher(httpClient, new RankingsParser());

router.get('/search', async (req, res) => {
    const surname = req.query.surname as string;
    if (!surname){
        res.status(400).json({error: 'surname query parameter is required'});
        return;
    }
    try{
        const results = await scraper.searchSwimmer(surname);
        res.json(results);
    }catch (err){
        console.error('[api] /search error:', err);
        res.status(502).json({error : (err as Error).message});
    }
})

router.get('/swimmer/:tiref', async (req, res) => {    
    try{
        const results = await scraper.getSwimmerTimes(req.params.tiref);
        res.json(results);
    }catch (err){
        console.error('[api] /swimmer time search error:', err);
        res.status(502).json({error : (err as Error).message});
    }
})


router.post('/rankings', async (req, res) => {
    const { level, forecast, countyCode, ...swimmerData } = req.body as SwimmerData & {
        level?: 'C' | 'N';
        forecast?: boolean;
        countyCode?: string;
    };
    try{
        const rankings = await rankingsFetcher.getSwimmerRankings(swimmerData, level, forecast, countyCode);
        res.json(rankings);
    }catch (err){
        console.error('[api] /swimmer rankings search error:', err);
        res.status(502).json({error : (err as Error).message});
    }
})

export default router;