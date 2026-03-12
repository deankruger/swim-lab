import { PDFParse } from 'pdf-parse'
import { CountyTimes, CountyTimeEntry } from '../../types'

export class PdfImporter{    
    async importCountyTimesFromBase64(base64: string, fileName: string): Promise<{countyName: string; times: CountyTimes}>{
        throw new Error('Not implemented');
    }
}