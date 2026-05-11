import { EventType, PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

export async function initializeMsal() : Promise<void> {
    await msalInstance.initialize();
    const cached = msalInstance.getAllAccounts();
    if (cached.length > 0) {
        msalInstance.setActiveAccount(cached[0]);
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
