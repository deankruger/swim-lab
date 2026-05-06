import { Configuration, LogLevel } from "@azure/msal-browser";


//
// TODO: External ID migration - replace the following constants with values from your External ID tenant  
// 1. EXTERNAL_ID_TENANT_SUBDOMAIN: The subdomain of your External ID tenant (e.g., "contoso" if your tenant domain is "contoso.ciamlogin.com")
//    e.g. swimlab if your tenant domain is swimlab.onmicrosoft.com
// 2. EXTERNAL_ID_TENANT_ID: The tenant ID of your External ID tenant (e.g., "12345678-abcd-1234-abcd-12345678abcd")
//    the GUID shown on the External ID tenant overview blade
// 3. EXTERNAL_ID_CLIENT_ID: The client ID of your application registered in External ID (e.g., "abcd1234-abcd-1234-abcd-1234abcd5678") 
//    swim-lab app registration created inside the External ID Tenant.
//

const EXTERNAL_ID_TENANT_SUBDOMAIN = "replace with tenant subdomain";
const EXTERNAL_ID_TENANT_ID = "00000000-0000-0000-0000-000000000000";
const EXTERNAL_ID_CLIENT_ID = "00000000-0000-0000-0000-000000000000";

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
