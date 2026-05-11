import { Container, CosmosClient, Database } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.COSMOS_ENDPOINT;
const databaseId = process.env.COSMOS_DATABASE || "swim-lab";

let client: CosmosClient | null = null;
let database: Database | null = null;

if (endpoint) {
    client = new CosmosClient({
        endpoint,
        aadCredentials: new DefaultAzureCredential(),
    });
    database = client.database(databaseId);
} else {
    console.warn("[cosmos] COSMOS_ENDPOINT not set; user data endpoints will return 503");
}

export function isCosmosConfigured(): boolean {
    return database !== null;
}

export function getSwimmersContainer(): Container {
    if (!database) throw new Error("Cosmos DB is not configured");
    return database.container("swimmers");
}

export function getUserDataContainer(): Container {
    if (!database) throw new Error("Cosmos DB is not configured");
    return database.container("userData");
}
