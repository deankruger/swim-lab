import * as webpush from 'web-push';
import { createHash } from 'crypto';
import { getPushSubscriptionsContainer, isCosmosConfigured } from '../cosmosClient';

type PushPayload = object;

interface StoredPushSubscription {
    id: string;
    userOid: string;
    subscription: any;
}

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

export class PushNotificationService {
    private readonly vapidPublic: string;
    private readonly vapidPrivate: string;

    constructor() {
        const { publicKey, privateKey } = this.resolveVapidKeys();
        this.vapidPublic = publicKey;
        this.vapidPrivate = privateKey;
        webpush.setVapidDetails(process.env.PUSH_SUBJECT || 'mailto:swim.lab.info@gmail.com', this.vapidPublic, this.vapidPrivate);
    }

    public getVapidPublicKey(): string {
        return this.vapidPublic;
    }

    public async subscribe(userOid: string, subscription: any): Promise<void> {
        if (!isCosmosConfigured()) {
            console.warn('[push] Cosmos DB not configured; subscription persistence is disabled.');
            return;
        }

        const subscriptionId = createHash('sha256').update(subscription.endpoint).digest('hex');
        const doc: StoredPushSubscription = {
            id: subscriptionId,
            userOid,
            subscription,
        };

        await getPushSubscriptionsContainer().items.upsert<StoredPushSubscription>(doc);
    }

    public async sendTestNotification(targetUserOid: string | undefined, payload: PushPayload): Promise<Array<{ endpoint: string; status: number; error?: string }>> {
        const subscriptions = await this.getSubscriptions(targetUserOid);
        return this.sendPayloadToSubscriptions(subscriptions, payload);
    }

    public async sendNotificationToUser(userOid: string, payload: PushPayload): Promise<void> {
        const subscriptions = await this.getSubscriptions(userOid);
        if (subscriptions.length === 0) {
            console.warn(`[push] no subscriptions found for user ${userOid}`);
            return;
        }

        await this.sendPayloadToSubscriptions(subscriptions, payload);
    }

    private async getSubscriptions(userOid?: string): Promise<StoredPushSubscription[]> {
        if (!isCosmosConfigured()) {
            console.warn('[push] Cosmos DB not configured; push subscription lookup will return empty results.');
            return [];
        }

        const query = userOid
            ? {
                query: 'SELECT * FROM c WHERE c.userOid = @userOid',
                parameters: [{ name: '@userOid', value: userOid }],
            }
            : {
                query: 'SELECT * FROM c',
                parameters: [],
            };

        const { resources } = await getPushSubscriptionsContainer().items.query<StoredPushSubscription>(query).fetchAll();
        return resources;
    }

    private async sendPayloadToSubscriptions(subscriptions: StoredPushSubscription[], payload: PushPayload): Promise<Array<{ endpoint: string; status: number; error?: string }>> {
        const results: Array<{ endpoint: string; status: number; error?: string }> = [];

        for (const entry of subscriptions.slice()) {
            try {
                await webpush.sendNotification(entry.subscription, JSON.stringify(payload));
                results.push({ endpoint: entry.subscription.endpoint, status: 201 });
            } catch (err: any) {
                const status = err && err.statusCode ? err.statusCode : 500;
                results.push({ endpoint: entry.subscription.endpoint, status, error: err?.message });
                if (status === 410 || status === 404) {
                    await this.removeSubscription(entry.id, entry.userOid, entry.subscription.endpoint);
                }
            }
        }

        return results;
    }

    private async removeSubscription(id: string, userOid: string, endpoint: string): Promise<void> {
        if (isCosmosConfigured()) {
            try {
                await getPushSubscriptionsContainer().item(id, userOid).delete();
            } catch (err) {
                console.warn(`[push] failed to delete invalid subscription ${endpoint} from Cosmos`, err);
            }
            return;
        }

        console.warn(`[push] removeSubscription fallback for ${endpoint}`);
    }

    private resolveVapidKeys(): { publicKey: string; privateKey: string } {
        if (vapidPublicKey && vapidPrivateKey) {
            return { publicKey: vapidPublicKey, privateKey: vapidPrivateKey };
        }

        try {
            const keys = webpush.generateVAPIDKeys();
            console.warn('[push] Generated ephemeral VAPID keys. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env for persistence.');
            return { publicKey: keys.publicKey, privateKey: keys.privateKey };
        } catch (err) {
            console.error('[push] Failed to generate VAPID keys', err);
            return { publicKey: '', privateKey: '' };
        }
    }
}

const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
