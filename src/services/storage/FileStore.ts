export class FileStore<T> {
    constructor(private key: string){ }

    async ensureFile(initialData: T): Promise<void>{
        if (localStorage.getItem(this.key) === null){
            await this.write(initialData);
        }
    }

    async read(): Promise<T> {
        const data = localStorage.getItem(this.key);
        if (data === null){
            throw new Error(`No data found for key: ${this.key}`);
        }
        return JSON.parse(data);
    }

    async write(data: T): Promise<void> {
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    getPath(): string{
        return this.key;
    }

    static createInUserData<T>(key: string): FileStore<T>{
        return new FileStore<T>(key);
    }
    
}
