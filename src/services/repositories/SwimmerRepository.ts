import { SwimmerData } from '../../types'
import { FileStore } from '../storage/FileStore'

interface StoredData{
    swimmers: SwimmerData[];
}

export class SwimmerRepository{
    constructor(private fileStore: FileStore<StoredData>){ }

    async initialize(): Promise<void>{
        await this.fileStore.ensureFile({swimmers: []});
    }

    async save(swimmerData: SwimmerData): Promise<SwimmerData>{
        try{
            const data = await this.fileStore.read();
            const existingIndex = data.swimmers.findIndex(s => s.tiref === swimmerData.tiref)
            
            const swimmer: SwimmerData = {
                ...swimmerData,
                lastUpdated: new Date().toISOString()
            } as SwimmerData & { lastUpdated: string }

            if (existingIndex >= 0){
                data.swimmers[existingIndex] = swimmer;
            }else {
                data.swimmers.push(swimmer);
            }

            console.log('Datastore: writing to file', this.fileStore.getPath())
            await this.fileStore.write(data);
            console.log('Datastore: file written successfully')

            return swimmer;
        }catch(error){
            console.error('Datastore: Error saving swimmer', error)
            throw error;
        }
    }

    async findAll() : Promise<SwimmerData[]>{
        try{
            const data = await this.fileStore.read();
            const swimmers = data.swimmers || [];
            for (const swimmer of swimmers){
                const legacy = swimmer as SwimmerData & { group?: string}
                if (legacy.group && !swimmer.tags)
                {
                    swimmer.tags = [legacy.group];
                    delete legacy.group;
                }
            }
            return swimmers;
        }catch(error){
            console.error('Datastore: error getting swimmers:', error)
            throw error;
        }
    }

    async findByTiref(tiref: string): Promise<SwimmerData | null>{
        try {
            const data = await this.fileStore.read();
            return data.swimmers.find(s => s.tiref === tiref) || null;
        } catch(error) {
           console.error('Datastore: error getting swimmers:', error)
            throw error; 
        }
    }

    async deleteByTiref(tiref: string): Promise<boolean>{
         try{
            const data = await this.fileStore.read();
            const initialLength = data.swimmers.length;
            data.swimmers = data.swimmers.filter(s => s.tiref !== tiref)

            if (data.swimmers.length < initialLength){
                await this.fileStore.write(data);
                return true;
            }

            return false;
        }catch(error){
            console.error('Datastore: error getting swimmers:', error)
            throw error;
        }
    }
}