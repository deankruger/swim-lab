import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "2c93d326-0c47-4357-93fa-11063a6cb39a",
        authority: "https://login.microsoftonline.com/0298244e-7f2d-46f7-b010-09fa360e73d0",
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