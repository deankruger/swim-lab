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

const EXTERNAL_ID_TENANT_SUBDOMAIN = "swimlabapp";
const EXTERNAL_ID_TENANT_ID = "43f793bb-9187-4430-af67-33ec4866b466";
const EXTERNAL_ID_CLIENT_ID = "3c302088-f290-4168-8ea9-5376cf1d2930";

const ciamAuthorityHost = `${EXTERNAL_ID_TENANT_SUBDOMAIN}.ciamlogin.com`;

export const msalConfig: Configuration = {
    auth: {
        clientId: EXTERNAL_ID_CLIENT_ID,
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
    scopes: ["openid", "profile", "offline_access", `api://${EXTERNAL_ID_CLIENT_ID}/access_as_user`],
};
export const apiRequest = {
    scopes: [`api://${EXTERNAL_ID_CLIENT_ID}/access_as_user`, "offline_access"],
}
