import * as XLSX from 'xlsx'
import { CountyTimes } from '../../types'
import { TimeConverter } from '../utils/TimeConverter'

export class ExcelImporter{
    constructor (private timeConverter: TimeConverter){ }

    async importCountyTimesFromBase64(base64: string): Promise<CountyTimes>{
        throw new Error('Not implemented');
    }

    async importCountyTimesFromBuffer(buffer: Uint8Array): Promise<CountyTimes>{
        throw new Error('Not implemented');
    }
}