import { HttpClient } from '../../services/http/HttpClient';
import { SwimmerSearchParser } from '../../services/parsers/SwimmerSearchParser';
import { SwimmerTimesParser } from '../../services/parsers/SwimmerTimesParser';
import { SwimmerScraper } from '../../services/scrapers/SwimmerScraper';
import { TimeConverter } from '../../services/utils/TimeConverter';
import { getSwimmersContainer, isCosmosConfigured } from '../cosmosClient';
import { SwimmerData } from '../../types';
import pushNotificationService from './PushNotificationService';

interface SwimmerDoc extends SwimmerData {
    id: string;
    userOid: string;
    lastUpdated: string;
}

const defaultIntervalMs = 6 * (60 * 60000); // 6 hours

export class SwimmerNotificationService {
    private readonly timeConverter = new TimeConverter();
    private readonly httpClient = new HttpClient(true);
    private readonly scraper = new SwimmerScraper(
        this.httpClient,
        new SwimmerSearchParser(),
        new SwimmerTimesParser(this.timeConverter)
    );
    private notificationCheckerTimer: NodeJS.Timeout | null = null;
    private readonly checkIntervalMs: number;

    constructor() {
        this.checkIntervalMs = this.resolveIntervalMs();
    }

    public start(): void {
        if (this.notificationCheckerTimer) {
            return;
        }

        console.log(`[notify] Starting swimmer notification checker, interval=${this.checkIntervalMs}ms`);
        this.notificationCheckerTimer = setInterval(() => {
            void this.checkForSwimmerTimeUpdates();
        }, this.checkIntervalMs);
        void this.checkForSwimmerTimeUpdates();
    }

    public async checkForSwimmerTimeUpdates(): Promise<void> {
        if (!isCosmosConfigured()) {
            console.warn('[notify] Cosmos DB not configured, skipping swimmer notification check.');
            return;
        }

        try {
            const { resources } = await getSwimmersContainer().items.query<SwimmerDoc>({
                query: 'SELECT * FROM c WHERE c.notificationsEnabled = true',
                parameters: [],
            }).fetchAll();

            if (!resources.length) {
                return;
            }

            const docsByTiref = new Map<string, SwimmerDoc[]>();
            for (const doc of resources) {
                const list = docsByTiref.get(doc.tiref) ?? [];
                list.push(doc);
                docsByTiref.set(doc.tiref, list);
            }

            const userUpdates = new Map<string, Array<{ tiref: string; name: string }>>();

            await Promise.all(Array.from(docsByTiref.entries()).map(async ([tiref, docs]) => {
                try {
                    const current = await this.scraper.getSwimmerTimes(tiref);
                    const storedKeys = new Set<string>();
                    docs.forEach((doc) => doc.times.forEach((t) => storedKeys.add(this.swimTimeKey(t))));
                    const addedTimes = current.times.filter((time) => !storedKeys.has(this.swimTimeKey(time)));
                    if (!addedTimes.length) {
                        return;
                    }

                    const now = new Date().toISOString();
                    const baseName = current.name || docs[0].name || `Tiref ${tiref}`;

                    await Promise.all(docs.map(async (doc) => {
                        const updatedDoc: SwimmerDoc = {
                            ...doc,
                            ...current,
                            id: doc.id,
                            userOid: doc.userOid,
                            notificationsEnabled: doc.notificationsEnabled ?? true,
                            lastUpdated: now,
                        };
                        await getSwimmersContainer().items.upsert<SwimmerDoc>(updatedDoc);
                    }));

                    docs.forEach((doc) => {
                        const list = userUpdates.get(doc.userOid) ?? [];
                        list.push({ tiref, name: baseName });
                        userUpdates.set(doc.userOid, list);
                    });
                } catch (err) {
                    console.error(`[notify] failed to refresh swimmer ${tiref}:`, err);
                }
            }));

            await Promise.all(Array.from(userUpdates.entries()).map(async ([userOid, swimmers]) => {
                const title = swimmers.length === 1 ? 'Swim Lab update' : 'Swim Lab updates';
                const swimmerNames = swimmers.map((s) => s.name).join(', ');
                const body = swimmers.length === 1
                    ? `New personal best times published for ${swimmerNames}!`
                    : `New personal best times published for ${swimmers.length} saved swimmers: ${swimmerNames}!`;
                await pushNotificationService.sendNotificationToUser(userOid, { title, body, url: '/' });
            }));
        } catch (err) {
            console.error('[notify] swimmer notification check failed:', err);
        }
    }

    private swimTimeKey(time: SwimmerData['times'][number]): string {
        return `${time.event}:::${time.course}:::${time.time}:::${time.date}:::${time.venue}`;
    }

    private resolveIntervalMs(): number {
        const envMs = Number(process.env.NOTIFICATIONS_CHECK_INTERVAL_MS);
        if (Number.isFinite(envMs) && envMs > 0) return envMs;
        const envMinutes = Number(process.env.NOTIFICATIONS_CHECK_INTERVAL_MINUTES);
        if (Number.isFinite(envMinutes) && envMinutes > 0) return envMinutes * 60000;
        return defaultIntervalMs;
    }
}

const swimmerNotificationService = new SwimmerNotificationService();

export default swimmerNotificationService;

export function startSwimmerNotificationChecker(): void {
    swimmerNotificationService.start();
}
