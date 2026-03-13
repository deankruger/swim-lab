import ExcelJS from 'exceljs';
import { SwimmerData, ComparisonResult } from '../../types';

export class ExcelExporter {
    async export(swimmerData: SwimmerData, comparisonResult?: ComparisonResult | null): Promise<string> {
        throw new Error('Not implemented');
    }
}