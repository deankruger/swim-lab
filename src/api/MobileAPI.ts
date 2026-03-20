import DataStore from '../services/dataStore';
import { StandardsComparator } from '../services/comparators/StandardsComparator';
import { TimeConverter } from '../services/utils/TimeConverter';
import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult, SwimmerRankings, SwimmerSearchResult } from '../types';

const dataStore = new DataStore();
const standardsComparator = new StandardsComparator(new TimeConverter());

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
    console.log(`[apiFetch] At runtime : API_BASE=${API_BASE} NODE_ENV=${process.env.NODE_ENV} `);
    
    var url =
        process.env.NODE_ENV === "production"
            ? `${API_BASE}${input}`
            : input; // ⭐ keep relative paths in dev

    //hack
    url =
        process.env.NODE_ENV === "production"
            ? `https://swim-lab.azurewebsites.net${input}`
            : input; // ⭐ keep relative paths in dev    

    const res = await fetch(url, init);

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
}



export const mobileAPI = {
    searchSwimmer(name: string): Promise<SwimmerSearchResult[]> {
        return apiFetch<SwimmerSearchResult[]>(`/api/search?surname=${encodeURIComponent(name)}`);
    },

    getSwimmerTimes(tiref: string): Promise<SwimmerData> {
        return apiFetch<SwimmerData>(`/api/swimmer/${encodeURIComponent(tiref)}`);
    },

    saveSwimmer(swimmerData: SwimmerData): Promise<SwimmerData> {
        return dataStore.saveSwimmer(swimmerData);
    },

    getSavedSwimmers(): Promise<SwimmerData[]> {
        return dataStore.getAllSwimmers();
    },

    deleteSwimmer(tiref: string): Promise<boolean> {
        return dataStore.deleteSwimmer(tiref);
    },
    
    async exportToExcel(swimmerData: SwimmerData, comparisonResult?: ComparisonResult | null): Promise<string> {
        const res = await fetch('/api/export/excel', {
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

    pickCountyTimesFile(): Promise<Array<{ countyName: string, times: CountyTimes }> | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls,pdf';
            input.multiple = true;
            input.onchange = async () => {
                if (!input.files || !input.files.length) {
                    resolve(null);
                    return;
                }
                const loaded :Array<{ countyName: string, times: CountyTimes }> = [];
                for (const file of Array.from(input.files)) {
                    try {
                        const res = await fetch('/api/import', {
                            method: 'POST',
                            headers: { 'x-filename': encodeURIComponent(file.name) },
                            body: file,
                        });
                        if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
                        const entry = await res.json() as { countyName: string; times: CountyTimes };
                        loaded.push(entry);
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                    }                    
                };
                resolve(loaded.length ? loaded : null);
            };
            input.oncancel = () => resolve(null);
            input.click();
        });
    },

    saveCountyTimesStore(store: CountyTimesStore): Promise<void> {
        return dataStore.saveCountyTimesStore(store);
    },

    loadCountyTimesStore(): Promise<CountyTimesStore> {
        return dataStore.loadCountyTimesStore();
    },

    getSwimmerRankings(swimmerData: SwimmerData, level: 'C' | 'N', forecast?: boolean, countyCode?: string): Promise<SwimmerRankings> {
        return apiFetch<SwimmerRankings>('/api/rankings/',{
            method: 'POST',
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify({ ...swimmerData, level, forecast, countyCode })
        });
    }
}
