import express from 'express';
import { HttpClient } from '../services/http/HttpClient';
import { SwimmerSearchParser } from '../services/parsers/SwimmerSearchParser';
import { SwimmerTimesParser } from '../services/parsers/SwimmerTimesParser';
import { RankingsParser } from '../services/parsers/RankingsParser';
import { SwimmerScraper } from '../services/scrapers/SwimmerScraper'
import { RankingsFetcher } from '../services/rankings/RankingsFetcher';;
import { TimeConverter } from '../services/utils/TimeConverter';
import { ExcelImporter } from '../services/excel/ExcelImporter';
import { ExcelExporter } from '../services/excel/ExcelExporter';
import { PdfImporter } from '../services/pdf/PdfImporter';

import { SwimmerData, ComparisonResult } from '../types';

const router = express.Router();

const httpClient = new HttpClient(true);
const timeConverter = new TimeConverter();
const scraper = new SwimmerScraper(
    httpClient, 
    new SwimmerSearchParser(),
    new SwimmerTimesParser(timeConverter)
);
const rankingsFetcher = new RankingsFetcher(httpClient, new RankingsParser());
const excelImporter = new ExcelImporter(new TimeConverter());
const excelExporter = new ExcelExporter();
const pdfImporter = new PdfImporter();

router.get('/search', async (req, res) => {
    const surname = req.query.surname as string;
    if (!surname) {
        res.status(400).json({error: 'surname query parameter is required'});
        return;
    }
    try {
        const results = await scraper.searchSwimmer(surname);
        res.json(results);
    } catch (err) {
        console.error('[api] /search error:', err);
        res.status(502).json({error : (err as Error).message});
    }
})

router.get('/swimmer/:tiref', async (req, res) => {    
    try {
        const results = await scraper.getSwimmerTimes(req.params.tiref);
        res.json(results);
    } catch (err) {
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
    try {
        const rankings = await rankingsFetcher.getSwimmerRankings(swimmerData, level, forecast, countyCode);
        res.json(rankings);
    } catch (err) {
        console.error('[api] /swimmer rankings search error:', err);
        res.status(502).json({error : (err as Error).message});
    }
})

router.post('/import', express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
    const fileName = decodeURIComponent((req.headers['x-filename'] as string) || 'file.xlsx');
    const buffer = req.body as Buffer;
    if (!buffer || !buffer.length) {
        res.status(400).json({ error: 'No file body found'} );
        return;
    }
    try {
        let result: { countyName: string; times: unknown };
        if (fileName.toLowerCase().endsWith('.pdf')) {
            result = await pdfImporter.importCountyTimesFromBuffer(buffer, fileName);
        }
        else {
            const times = await excelImporter.importCountyTimesFromBuffer(buffer);
            const countyName = fileName.replace(/\.[^.]+$/, '') || 'Unknown';
            result = { countyName, times };
        }
        res.json(result);
    } catch (err) {
        console.error('[api] /import error:', err);
        res.status(422).json({error : (err as Error).message});
    }
})

router.post('/export/excel', async (req, res) => {
    const { comparisonResult, ...swimmerData } = req.body as SwimmerData & { comparisonResult?: ComparisonResult | null };
    try {
        const buffer =  excelExporter.exportToBuffer(swimmerData, comparisonResult);
        const fileName = excelExporter.getFileName(swimmerData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer); 
    } catch (err) {
        console.error('[api] //export/excel error:', err);
        res.status(500).json({error : (err as Error).message});
    }
})

export default router;
