import { SwimmerData, CountyTimesStore } from '../types';
import { FileStore } from './storage/FileStore';
import { SwimmerRepository } from './repositories/SwimmerRepository';

interface StoredData {
    swimmers: SwimmerData[];
}

class DataStore {
    private swimmerRepository: SwimmerRepository;
    
    constructor() {
        const fileStore = FileStore.createInUserData<StoredData>('swimmers.json');
        this.swimmerRepository = new SwimmerRepository(fileStore);
        this.swimmerRepository.initialize().catch(err => {
            console.error('Failed to initialize swimmer repository:', err);
        });
    }

    async saveSwimmer(swimmerData: SwimmerData): Promise<SwimmerData> {
        return this.swimmerRepository.save(swimmerData);
    }

    async getAllSwimmers(): Promise<SwimmerData[]> {
        return this.swimmerRepository.findAll();
    }

    async getSwimmer(tiref: string): Promise<SwimmerData | null> {
        return this.swimmerRepository.findByTiref(tiref);
    }

    async deleteSwimmer(tiref: string): Promise<boolean> {
        return this.swimmerRepository.deleteByTiref(tiref);
    }

    async saveCountyTimesStore(store: CountyTimesStore): Promise<void> {
        const fileStore = FileStore.createInUserData<CountyTimesStore>('county-times.json');
        await fileStore.write(store);
    }

    async loadCountyTimesStore(): Promise<CountyTimesStore> {
        try {
            const fileStore = FileStore.createInUserData<CountyTimesStore>('county-times.json');
            return await fileStore.read();
        } catch {
            return {};
        }
    }

    async saveActiveStandards(active: string[]): Promise<void> {
        const fileStore = FileStore.createInUserData<string[]>('active-standards.json');
        await fileStore.write(active);
    }

    async loadActiveStandards(): Promise<string[]> {
        try {
            const fileStore = FileStore.createInUserData<string[]>('active-standards.json');
            return await fileStore.read();
        } catch {
            return [];
        }
    }

    async saveSelectedStrokes(strokes: string[]): Promise<void> {
        const fileStore = FileStore.createInUserData<string[]>('selected-strokes.json');
        await fileStore.write(strokes);
    }

    async loadSelectedStrokes(): Promise<string[]> {
        try {
            const fileStore = FileStore.createInUserData<string[]>('selected-strokes.json');
            return await fileStore.read();
        } catch {
            return [];
        }
    }

    async saveSelectedDistances(distances: string[]): Promise<void> {
        const fileStore = FileStore.createInUserData<string[]>('selected-distances.json');
        await fileStore.write(distances);
    }

    async loadSelectedDistances(): Promise<string[]> {
        try {
            const fileStore = FileStore.createInUserData<string[]>('selected-distances.json');
            return await fileStore.read();
        } catch {
            return [];
        }
    }
    
    async replaceAllSwimmers(swimmers: SwimmerData[]): Promise<void> {
        await this.swimmerRepository.replaceAll(swimmers);
    }

    async clear(): Promise<void> {
        await this.swimmerRepository.clear();
        await FileStore.createInUserData('county-times.json').clear();
        await FileStore.createInUserData('active-standards.json').clear();
    }
}

export default DataStore;
