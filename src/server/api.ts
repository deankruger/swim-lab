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
import pushNotificationService from './services/PushNotificationService';
import { userOidMiddleware } from './middleware/userOid';

import { SwimmerData, ComparisonResult } from '../types';

const router = express.Router();

// Ensure JSON body parsing for push endpoints
router.use(express.json());

router.get('/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: pushNotificationService.getVapidPublicKey() });
});

router.post('/push/subscribe', userOidMiddleware, (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) {
        res.status(400).json({ error: 'Invalid subscription' });
        return;
    }
    pushNotificationService.subscribe(req.userOid!, sub);
    res.json({ success: true });
});

router.post('/push/send-test', userOidMiddleware, async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const targetUserOid = typeof body.targetUserOid === 'string' && body.targetUserOid.trim() ? body.targetUserOid.trim() : undefined;
    const { targetUserOid: _, payload, ...payloadProps } = body;
    const payloadData = payload && typeof payload === 'object' && payload !== null
        ? payload
        : Object.keys(payloadProps).length > 0
            ? payloadProps
            : { title: 'Swim Lab', body: 'Test notification', url: '/' };

    const results = await pushNotificationService.sendTestNotification(targetUserOid, payloadData);
    res.json({ results });
});

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
        let results: Array<{ countyName: string; times: unknown }>;
        if (fileName.toLowerCase().endsWith('.pdf')) {
            results = await pdfImporter.importCountyTimesFromBuffer(buffer, fileName);
        }
        else {
            const times = await excelImporter.importCountyTimesFromBuffer(buffer);
            const countyName = fileName.replace(/\.[^.]+$/, '') || 'Unknown';
            results = [{ countyName, times }];
        }
        res.json(results);
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

router.post('/contact', async (req: any, res: any) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!email || !message) {
      return res.status(400).json({ error: 'Email and message are required' });
    }

    // Configure nodemailer (using Gmail SMTP)
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'swim.lab.info@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'kgkiqeotezzypjke', // Use Gmail app-specific password
      },
    });

    // Send email
    await transporter.sendMail({
      from: 'swim.lab.info@gmail.com',
      to: 'swim.lab.info@gmail.com',
      replyTo: email,
      subject: `[Swim Lab Contact] ${subject}`,
      text: `From: ${name} (${email})\n\n${message}`,
      html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
})

export default router;
