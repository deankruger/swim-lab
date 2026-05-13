import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiRequest } from "../authConfig";
import { msalInstance } from "../msalInstance";
import { isNetworkError, isOnline, reportNetworkFailure, reportNetworkSuccess } from "./connectivity";

export class OfflineError extends Error {
    constructor() {
        super("Offline - this action requires a connection");
        this.name = "OfflineError";
    }
}

class TimeoutError extends Error {
    constructor() {
        super("Operation timed out");
        this.name = "TimeoutError";
    }
}

// Cap how long acquireTokenSilent can spend on a (possibly hung) network round-trip.
// Browsers like iOS Safari sometimes claim navigator.onLine=true with no connectivity,
// which would otherwise leave the silent token request waiting forever and freeze
// every caller's catch-and-fallback path.
const TOKEN_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError()), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

export class OfflineError extends Error {
    constructor() {
        super("Offline - this action requires a connection");
        this.name = "OfflineError";
    }
}

export async function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    if (!isOnline()) {
        throw new OfflineError();
    }

    const account = msalInstance.getActiveAccount();

    if (!account) {
        try {
            const response = await fetch(input, init);
            reportNetworkSuccess();
            return response;
        } catch (err) {
            if (isNetworkError(err)) {
                reportNetworkFailure();
                throw new OfflineError();
            }
            throw err;
        }
    }

    let accessToken: string;
    try {
        const result = await withTimeout(
            msalInstance.acquireTokenSilent({ ...apiRequest, account }),
            TOKEN_TIMEOUT_MS,
        );
        accessToken = result.accessToken;
    } catch (err) {
        if (err instanceof TimeoutError || isNetworkError(err)) {
            reportNetworkFailure();
            throw new OfflineError();
        }
        if (err instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({ ...apiRequest, account });
            return new Promise<Response>(() => undefined);
        }
        throw err;
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);

    try {
        const response = await fetch(input, { ...init, headers });
        reportNetworkSuccess();
        return response;
    } catch (err) {
        if (isNetworkError(err)) {
            reportNetworkFailure();
            throw new OfflineError();
        }
        throw err;
    }
}
