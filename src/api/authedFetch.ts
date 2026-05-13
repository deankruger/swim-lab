import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiRequest } from "../authConfig";
import { msalInstance } from "../msalInstance";

export class OfflineError extends Error {
    constructor() {
        super("Offline - this action requires a connection");
        this.name = "OfflineError";
    }
}

export async function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    // Short-circuit when the browser reports we're offline so callers can fall back
    // to local cache immediately. Without this, MSAL's acquireTokenSilent may hit
    // the network, fail with InteractionRequiredAuthError, and fall into the redirect
    // branch below — which returns a promise that never resolves and freezes the
    // caller's catch-and-fallback path.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new OfflineError();
    }
    
    const account = msalInstance.getActiveAccount();
    if (!account) {
        return fetch(input, init);
    }

    let accessToken: string;
    try {
        const result = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
        accessToken = result.accessToken;
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({ ...apiRequest, account });
            return new Promise<Response>(() => undefined);
        }
        throw err;
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(input, { ...init, headers });
}
