import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "your-client-id",
        authority: "https://login.microsoftonline.com/your-tenant-id",
        redirectUri: "/", // or your deployed URL
     },
    cache: {
        cacheLocation: "localStorage",
        // storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            logLevel: LogLevel.Warning,
        },
    },
};

export const loginRequest = {
    scopes: ["User.Read"], // or your API scopes.
};