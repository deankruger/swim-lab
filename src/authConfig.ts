import { Configuration, LogLevel } from "@azure/msal-browser";

const EXTERNAL_ID_TENANT_SUBDOMAIN = "replace with tenant subdomain";
const EXTERNAL_ID_TENANT_ID = "replace with tenant ID";
const EXTERNAL_ID_CLIENT_ID = "replace with client ID";

const ciamAuthorityHost = `${EXTERNAL_ID_TENANT_SUBDOMAIN}.ciamlogin.com`;

export const msalConfig: Configuration = {
    auth: {
        clientId: "2c93d326-0c47-4357-93fa-11063a6cb39a",
        authority: `https://${ciamAuthorityHost}/${EXTERNAL_ID_TENANT_ID}`,
        knownAuthorities: [ciamAuthorityHost],
        redirectUri: "/",
     },
    cache: {
        cacheLocation: "localStorage"
    },
    system: {
        loggerOptions: {
            logLevel: LogLevel.Warning,
        },
    },
};

export const loginRequest = {
    scopes: ["openid", "profile", "offline_access"],
};
export const apiRequest = {
    scopes: [`api://${EXTERNAL_ID_CLIENT_ID}/access_as_user`],
}
