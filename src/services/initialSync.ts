import DataStore from "./dataStore";
import { authedFetch } from "../api/authedFetch";
import { CountyTimesStore, SwimmerData } from "../types";

const OWNER_KEY = "swim-lab:owner-oid";

interface UserDataResponse {
    countyTimesStore: CountyTimesStore;
    activeStandards: string[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await authedFetch(url, init);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json() as Promise<T>;
}

export async function syncOnLogin(currentOid: string, dataStore: DataStore): Promise<void> {
    const previousOwner = localStorage.getItem(OWNER_KEY);

    if (previousOwner && previousOwner !== currentOid) {
        await dataStore.clear();
    }

    const localSwimmers = await dataStore.getAllSwimmers().catch(() => [] as SwimmerData[]);
    const localStore = await dataStore.loadCountyTimesStore().catch(() => ({} as CountyTimesStore));
    const localStandards = await dataStore.loadActiveStandards().catch(() => [] as string[]);

    const serverSwimmers = await fetchJson<SwimmerData[]>("/api/user/swimmers");
    const serverData = await fetchJson<UserDataResponse>("/api/user/data");

    if (serverSwimmers.length === 0 && localSwimmers.length > 0) {
        for (const s of localSwimmers) {
            await fetchJson<SwimmerData>(`/api/user/swimmers/${encodeURIComponent(s.tiref)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(s),
            });
        }
    } else {
        await dataStore.replaceAllSwimmers(serverSwimmers);
    }

    const serverHasData =
        Object.keys(serverData.countyTimesStore).length > 0 || serverData.activeStandards.length > 0;
    const localHasData = Object.keys(localStore).length > 0 || localStandards.length > 0;

    if (!serverHasData && localHasData) {
        await fetchJson<UserDataResponse>("/api/user/data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countyTimesStore: localStore, activeStandards: localStandards }),
        });
    } else {
        await dataStore.saveCountyTimesStore(serverData.countyTimesStore);
        await dataStore.saveActiveStandards(serverData.activeStandards);
    }

    localStorage.setItem(OWNER_KEY, currentOid);
}

export async function clearLocalData(dataStore: DataStore): Promise<void> {
    await dataStore.clear();
    localStorage.removeItem(OWNER_KEY);
}
