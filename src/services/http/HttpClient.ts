const SWIM_RESULTS_BASE = 'https://www.swimmingresults.org'
const SWIM_RESULTS_PROXY = '/swimresults'

export class HttpClient{
    constructor(private direct = false) {}

    async get(url: string): Promise<string> {
        console.log('Fetching URL:', url);
        return this.getWeb(url);
    }

    private async getWeb(url: string): Promise<string> {
        const proxiedUrl = this.direct ? url : url.replace(SWIM_RESULTS_BASE, SWIM_RESULTS_PROXY);
        console.log('Web proxy URL:', proxiedUrl);

        const response = await fetch(proxiedUrl, {
            headers: this.getHeaders()
        });

        if (!response.ok){
            throw new Error(`HTTP ${response.status}`);
        }

        return response.text();
    }

    private getHeaders(): Record<string, string> {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Referer': 'https://www.swimmingresults.org',
            'Upgrade-Inseure-Requests': '1'            
        };
    }
}