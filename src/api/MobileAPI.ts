import DataStore from '../services/dataStore';
import { StandardsComparator } from '../services/comparators/StandardsComparator';
import { TimeConverter } from '../services/utils/TimeConverter';
import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult, SwimmerRankings, SwimmerSearchResult } from '../types';
import { authedFetch } from './authedFetch';

const dataStore = new DataStore();
const standardsComparator = new StandardsComparator(new TimeConverter());

function prefixedUrl(input: string): string {
    return process.env.NODE_ENV === 'production'
        ? `https://swim-lab.azurewebsites.net${input}`
        : input;
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
    const res = await authedFetch(prefixedUrl(input), init);
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

interface UserDataResponse {
    countyTimesStore: CountyTimesStore;
    activeStandards: string[];
}

async function fetchUserData(): Promise<UserDataResponse> {
    return apiFetch<UserDataResponse>('/api/user/data');
}

async function putUserData(body: Partial<UserDataResponse>): Promise<UserDataResponse> {
    return apiFetch<UserDataResponse>('/api/user/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export const mobileAPI = {
    searchSwimmer(name: string): Promise<SwimmerSearchResult[]> {
        return apiFetch<SwimmerSearchResult[]>(`/api/search?surname=${encodeURIComponent(name)}`);
    },

    getSwimmerTimes(tiref: string): Promise<SwimmerData> {
        return apiFetch<SwimmerData>(`/api/swimmer/${encodeURIComponent(tiref)}`);
    },

    async saveSwimmer(swimmerData: SwimmerData): Promise<SwimmerData> {
        try {
            const saved = await apiFetch<SwimmerData>(
                `/api/user/swimmers/${encodeURIComponent(swimmerData.tiref)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(swimmerData),
                }
            );
            await dataStore.saveSwimmer(saved);
            return saved;
        } catch (err) {
            console.warn('saveSwimmer: backend unavailable, writing local only', err);
            return dataStore.saveSwimmer(swimmerData);
        }
    },

    async getSavedSwimmers(): Promise<SwimmerData[]> {
        try {
            const swimmers = await apiFetch<SwimmerData[]>('/api/user/swimmers');
            await dataStore.replaceAllSwimmers(swimmers);
            return swimmers;
        } catch (err) {
            console.warn('getSavedSwimmers: falling back to local cache', err);
            return dataStore.getAllSwimmers();
        }
    },

    async deleteSwimmer(tiref: string): Promise<boolean> {
        try {
            const result = await apiFetch<{ deleted: boolean }>(
                `/api/user/swimmers/${encodeURIComponent(tiref)}`,
                { method: 'DELETE' }
            );
            await dataStore.deleteSwimmer(tiref);
            return result.deleted;
        } catch (err) {
            console.warn('deleteSwimmer: backend unavailable, deleting local only', err);
            return dataStore.deleteSwimmer(tiref);
        }
    },

    async exportToExcel(swimmerData: SwimmerData, comparisonResult?: ComparisonResult | null): Promise<string> {
        const res = await authedFetch('/api/export/excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...swimmerData, comparisonResult }),
        });
        if (!res.ok) throw new Error(`Export failed: ${await res.text()}`);
        const fileName = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'export.xlsx';
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return fileName;
    },

    compareWithCountyTimes(swimmerData: SwimmerData, countyTimes: CountyTimes): Promise<ComparisonResult> {
        return Promise.resolve(standardsComparator.compareWithStandards(swimmerData, countyTimes));
    },

    pickCountyTimesFile(): Promise<Array<{ countyName: string; times: CountyTimes }> | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,.xlsx,.xls';
            input.multiple = true;
            input.onchange = async () => {
                if (!input.files || !input.files.length) {
                    resolve(null);
                    return;
                }
                const loaded: Array<{ countyName: string; times: CountyTimes }> = [];
                for (const file of Array.from(input.files)) {
                    try {
                        const res = await authedFetch('/api/import', {
                            method: 'POST',
                            headers: { 'x-filename': encodeURIComponent(file.name) },
                            body: file,
                        });
                        if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
                        const entries = await res.json() as Array<{ countyName: string; times: CountyTimes }>;
                        loaded.push(...entries);
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                    }
                }
                resolve(loaded.length ? loaded : null);
            };
            input.oncancel = () => resolve(null);
            input.click();
        });
    },

    async saveCountyTimesStore(store: CountyTimesStore): Promise<void> {
        try {
            await putUserData({ countyTimesStore: store });
            await dataStore.saveCountyTimesStore(store);
        } catch (err) {
            console.warn('saveCountyTimesStore: backend unavailable, writing local only', err);
            await dataStore.saveCountyTimesStore(store);
        }
    },

    async loadCountyTimesStore(): Promise<CountyTimesStore> {
        try {
            const data = await fetchUserData();
            await dataStore.saveCountyTimesStore(data.countyTimesStore);
            return data.countyTimesStore;
        } catch (err) {
            console.warn('loadCountyTimesStore: falling back to local cache', err);
            return dataStore.loadCountyTimesStore();
        }
    },

    getSwimmerRankings(swimmerData: SwimmerData, level?: 'C' | 'N', forecast?: boolean, countyCode?: string): Promise<SwimmerRankings> {
        return apiFetch<SwimmerRankings>('/api/rankings/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...swimmerData, level, forecast, countyCode })
        });
    },

    async saveActiveStandards(active: string[]): Promise<void> {
        try {
            await putUserData({ activeStandards: active });
            await dataStore.saveActiveStandards(active);
        } catch (err) {
            console.warn('saveActiveStandards: backend unavailable, writing local only', err);
            await dataStore.saveActiveStandards(active);
        }
    },

    async loadActiveStandards(): Promise<string[]> {
        try {
            const data = await fetchUserData();
            await dataStore.saveActiveStandards(data.activeStandards);
            return data.activeStandards;
        } catch (err) {
            console.warn('loadActiveStandards: falling back to local cache', err);
            return dataStore.loadActiveStandards();
        }
    },
};

export const _internalDataStore = dataStore;
