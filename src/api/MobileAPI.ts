import SwimmerService from '../services/swimmerService';
import DataStore from '../services/dataStore';
import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult, SwimmerRankings, SwimmerSearchResult } from '../types';

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); //Strip data URL prefix
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

const swimmerService = new SwimmerService();
const dataStore = new DataStore();

export const mobileAPI = {
    searchSwimmer(name: string): Promise<SwimmerSearchResult[]> {
        return swimmerService.searchSwimmer(name);
    },

    getSwimmerTimes(tiref: string): Promise<SwimmerData> {
        return swimmerService.getSwimmerTimes(tiref);
    },

    saveSwimmer(swimmerData: SwimmerData): Promise<SwimmerData> {
        return dataStore.saveSwimmer(swimmerData);
    },

    getSavedSwimmers(): Promise<SwimmerData[]> {
        return dataStore.getAllSwimmers();
    },

    deleteSwimmers(tiref: string): Promise<SwimmerData[]> {
        return dataStore.deleteSwimmer(tiref);
    },

    exportToExcel(swimmerData: SwimmerData, comparisonResult?: CountyTimes): Promise<ComparisonResult> {
        return dataStore.exportToExcel(swimmerData, comparisonResult);
    },

    compareCountyTimes(swimmerData: SwimmerData, countyTimes: CountyTimes): Promise<ComparisonResult> {
        return Promise.resolve(swimmerService.compareWithStandards(swimmerData, countyTimes));
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
                        const base64 = await fileToBase64(file);
                        const entry = await dataStore.importFromBase64(base64, file.name);                        
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
        return swimmerService.getSwimmerRankings(swimmerData, level, forecast, countyCode);
    }
}
