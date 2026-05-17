import * as webpush from 'web-push';

type PushPayload = object;

interface StoredPushSubscription {
    userOid: string;
    subscription: any;
}

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

export class PushNotificationService {
    private pushSubscriptions: StoredPushSubscription[] = [];
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

    public subscribe(userOid: string, subscription: any): void {
        const exists = this.pushSubscriptions.find((entry) => entry.userOid === userOid && entry.subscription.endpoint === subscription.endpoint);
        if (!exists) {
            this.pushSubscriptions.push({ userOid, subscription });
        }
    }

    public async sendTestNotification(targetUserOid: string | undefined, payload: PushPayload): Promise<Array<{ endpoint: string; status: number; error?: string }>> {
        const subscriptions = targetUserOid
            ? this.pushSubscriptions.filter((entry) => entry.userOid === targetUserOid)
            : this.pushSubscriptions;

        return this.sendPayloadToSubscriptions(subscriptions, payload);
    }

    public async sendNotificationToUser(userOid: string, payload: PushPayload): Promise<void> {
        const subscriptions = this.pushSubscriptions.filter((entry) => entry.userOid === userOid);
        if (subscriptions.length === 0) {
            console.warn(`[push] no subscriptions found for user ${userOid}`);
            return;
        }

        await this.sendPayloadToSubscriptions(subscriptions, payload);
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
                    this.removeSubscription(entry.subscription.endpoint);
                }
            }
        }

        return results;
    }

    private removeSubscription(endpoint: string): void {
        const idx = this.pushSubscriptions.findIndex((s) => s.subscription.endpoint === endpoint);
        if (idx >= 0) {
            this.pushSubscriptions.splice(idx, 1);
        }
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
