import { EventType, PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

export async function initializeMsal(): Promise<void> {
    await msalInstance.initialize();

    const cached = msalInstance.getAllAccounts();
    if (cached.length > 0) {
        msalInstance.setActiveAccount(cached[0]);
        return;
    }

    // No cached account. MSAL refresh tokens are capped at 24h for SPAs, and iOS PWAs
    // often get suspended past that. Try silent SSO via the External ID session cookie
    // (set on <tenant>.ciamlogin.com — lives much longer if KMSI is enabled on the user flow).
    // Uses a hidden iframe, no redirect, no UI. Failure is normal (genuinely signed out, or
    // ITP/browser blocks the iframe) — fall through and let the LoginGate handle it.
    try {
        const result = await msalInstance.ssoSilent(loginRequest);
        if (result.account) {
            msalInstance.setActiveAccount(result.account);
        }
    } catch {
        // Silent SSO unavailable — LoginGate or GuestBanner takes over.
    }
}

msalInstance.addEventCallback((event) => {
    if (
        (event.eventType === EventType.LOGIN_SUCCESS ||
            event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
        event.payload &&
        "account" in event.payload &&
        event.payload.account
    ) {
        msalInstance.setActiveAccount(event.payload.account);
    }
});
