import { SwimmerData, CountyTimes, CountyTimesStore, ComparisonResult } from '../types';
import { FileStore } from './storage/FileStore';
import { SwimmerRepository } from './repositories/SwimmerRepository';
import { ExcelImporter } from './excel/ExcelImporter';
import { ExcelExporter } from './excel/ExcelExporter';
import { PdfImporter } from './pdf/PdfImporter';
import { TimeConverter } from './utils/TimeConverter';

interface StoredData {
    swimmers: SwimmerData[];
}

class DataStore {
    private swimmerRepository: SwimmerRepository;
    private excelExporter: ExcelExporter;
    private excelImporter: ExcelImporter;
    private pdfImporter: PdfImporter;

    constructor() {
        //Init file storefor swimmers
        const fileStore = FileStore.createInUserData<StoredData>('swimmers.json');

        //Init Services
        this.swimmerRepository = new SwimmerRepository(fileStore);
        this.excelExporter = new ExcelExporter();
        const timeConverter = new TimeConverter();
        this.excelImporter = new ExcelImporter(timeConverter);
        this.pdfImporter = new PdfImporter();

        //Init repository
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

    /**
     *Exporting
     */
    async exportToExcel(swimmerData: SwimmerData, comparisonResult: ComparisonResult | null): Promise<string> {
        return this.excelExporter.export(swimmerData, comparisonResult);
    }

    async importCountyTimesFromBase64(base64: string): Promise<CountyTimes> {
        return await this.excelImporter.importCountyTimesFromBase64(base64);
    }

    async importCountyTimesFromBuffer(buffer: Uint8Array): Promise<CountyTimes> {
        return await this.excelImporter.importCountyTimesFromBuffer(buffer);
    }

    async importFromBase64(base64: string, fileName: string): Promise<{ countyName: string, times: CountyTimes }> {
        if (fileName.toLowerCase().endsWith('.pdf')) {
            return await this.pdfImporter.importCountyTimesFromBase64(base64, fileName);
        }
        const times = await this.excelImporter.importCountyTimesFromBase64(base64);
        const countyName = fileName.replace(/\.[^/.]+$/, '') || 'Unknown'; // Remove file extension
        return { countyName, times };
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
}

export default DataStore;