import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { apiRequest } from "../authConfig";
import { msalInstance } from "../msalInstance";

export async function authedFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
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
