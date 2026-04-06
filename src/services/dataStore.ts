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
}

export default DataStore;
