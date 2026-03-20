import ExcelJS from 'exceljs';
import { SwimmerData, ComparisonResult } from '../../types';

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  navyBg:    'FF1F4E79', // dark navy – main headers
  blueBg:    'FF2E75B6', // medium blue – title / section headers
  lightBlue: 'FFDEEAF1', // alternating even rows
  white:     'FFFFFFFF',
  whiteFont: 'FFFFFFFF',
  navyFont:  'FF1F4E79',
  fasterBg:  'FFC6EFCE', fasterFont: 'FF375623',
  slowerBg:  'FFFFC7CE', slowerFont: 'FF9C0006',
  neutralBg: 'FFFFF2CC', neutralFont: 'FF7F6000',
  border:    'FFB8CCE4',
} as const;

type ARGB = string;

// ── Helpers ────────────────────────────────────────────────────────────────
function solidFill(argb: ARGB): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
function thinBorder(argb: ARGB = C.border): ExcelJS.Borders {
  const side: ExcelJS.Border = { style: 'thin', color: { argb } };
  return { top: side, bottom: side, left: side, right: side, diagonal: {} };
}
function mediumBottomBorder(argb: ARGB = C.border): ExcelJS.Borders {
  const thin: ExcelJS.Border = { style: 'thin', color: { argb } };
  const medium: ExcelJS.Border = { style: 'medium', color: { argb: C.white } };
  return { top: thin, bottom: medium, left: thin, right: thin, diagonal: {} };
}

function styleHeaderCell(cell: ExcelJS.Cell, bgArgb: ARGB = C.navyBg) {
  cell.fill = solidFill(bgArgb);
  cell.font = { bold: true, color: { argb: C.whiteFont }, size: 11, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  cell.border = mediumBottomBorder();
}

function styleTitleCell(cell: ExcelJS.Cell) {
  cell.fill = solidFill(C.blueBg);
  cell.font = { bold: true, color: { argb: C.whiteFont }, size: 13, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function styleDataCell(
  cell: ExcelJS.Cell,
  isEven: boolean,
  overrideBg?: ARGB,
  overrideFont?: ARGB
) {
  cell.fill = solidFill(overrideBg ?? (isEven ? C.lightBlue : C.white));
  cell.font = { size: 10, name: 'Calibri', color: { argb: overrideFont ?? C.navyFont } };
  cell.alignment = { vertical: 'middle', wrapText: false };
  cell.border = thinBorder();
}

function addTitleRow(
  ws: ExcelJS.Worksheet,
  text: string,
  totalCols: number
): ExcelJS.Row {
  const row = ws.addRow([text]);
  row.height = 28;
  ws.mergeCells(row.number, 1, row.number, totalCols);
  styleTitleCell(row.getCell(1));
  return row;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main class ─────────────────────────────────────────────────────────────
export class ExcelExporter {
  async export(swimmerData: SwimmerData, comparisonResult?: ComparisonResult | null): Promise<string> {
    try {
      const workbook = this.createWorkbook(swimmerData, comparisonResult);
      const fileName = this.generateFileName(swimmerData);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Excel file downloaded:', fileName);
      return fileName;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error(`Failed to export to Excel: ${(error as Error).message}`);
    }
  }

  // ── Workbook ──────────────────────────────────────────────────────────────
  private createWorkbook(swimmerData: SwimmerData, comparisonResult?: ComparisonResult | null): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Swimming Results Analyzer';
    wb.created = new Date();
    wb.properties.date1904 = false;

    this.addPersonalBestsSheet(wb, swimmerData);

    if (comparisonResult && comparisonResult.comparisons.length > 0) {
      this.addCountyComparisonSheet(wb, swimmerData, comparisonResult);
    }

    if (swimmerData.rankings && Object.keys(swimmerData.rankings).length > 0) {
      this.addRankingsSheet(wb, swimmerData);
    }

    return wb;
  }

  // ── Personal Bests sheet ──────────────────────────────────────────────────
  private addPersonalBestsSheet(wb: ExcelJS.Workbook, swimmerData: SwimmerData): void {
    const ws = wb.addWorksheet('Personal Bests', { properties: { tabColor: { argb: C.navyBg } } });

    ws.columns = [
      { key: 'event',  width: 30 },
      { key: 'course', width: 10 },
      { key: 'time',   width: 12 },
      { key: 'date',   width: 15 },
      { key: 'venue',  width: 42 },
    ];

    const totalCols = 5;
    const exportedOn = formatDate(new Date());

    addTitleRow(ws, `${swimmerData.name}  ·  Personal Bests  ·  ${exportedOn}`, totalCols);

    const headers = ['Event', 'Course', 'Time', 'Date', 'Venue'];
    const hRow = ws.addRow(headers);
    hRow.height = 20;
    hRow.eachCell(cell => styleHeaderCell(cell));

    ws.views = [{ state: 'frozen', ySplit: 2 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } };

    swimmerData.times.forEach((t, i) => {
      const row = ws.addRow([t.event, t.course, t.time, t.date, t.venue]);
      row.height = 18;
      const isEven = i % 2 === 0;
      row.eachCell((cell, col) => {
        const center = col >= 2 && col <= 4;
        styleDataCell(cell, isEven);
        if (center) cell.alignment = { ...cell.alignment, horizontal: 'center' };
      });
    });
  }

  // ── County Comparison sheet ───────────────────────────────────────────────
  private addCountyComparisonSheet(wb: ExcelJS.Workbook, swimmerData: SwimmerData, result: ComparisonResult): void {
    const ws = wb.addWorksheet('County Comparison', { properties: { tabColor: { argb: 'FF375623' } } });

    ws.columns = [
      { key: 'event',       width: 28 },
      { key: 'course',      width: 10 },
      { key: 'swimmerTime', width: 14 },
      { key: 'countyTime',  width: 13 },
      { key: 'ageCategory', width: 14 },
      { key: 'difference',  width: 13 },
      { key: 'status',      width: 12 },
      { key: 'date',        width: 14 },
      { key: 'venue',       width: 38 },
    ];

    const totalCols = 9;
    const exportedOn = formatDate(new Date());

    addTitleRow(ws, `${swimmerData.name}  ·  County Comparison  ·  ${exportedOn}`, totalCols);

    const headers = ['Event', 'Course', 'Swimmer Time', 'County Time', 'Age Category', 'Difference', 'Status', 'Date', 'Venue'];
    const hRow = ws.addRow(headers);
    hRow.height = 20;
    hRow.eachCell(cell => styleHeaderCell(cell));

    ws.views = [{ state: 'frozen', ySplit: 2 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } };

    result.comparisons.forEach((comp, i) => {
      const statusText = comp.isFaster === null ? '—' : comp.isFaster ? '✓ Faster' : '✗ Slower';
      const row = ws.addRow([
        comp.event, comp.course, comp.swimmerTime, comp.standardTime,
        comp.ageCategory ?? '', comp.difference, statusText, comp.date, comp.venue,
      ]);
      row.height = 18;
      const isEven = i % 2 === 0;

      row.eachCell((cell, col) => {
        const centered = col >= 2 && col <= 7;
        if (col === 7) {
          const bg   = comp.isFaster === null ? C.neutralBg  : comp.isFaster ? C.fasterBg  : C.slowerBg;
          const font = comp.isFaster === null ? C.neutralFont : comp.isFaster ? C.fasterFont : C.slowerFont;
          styleDataCell(cell, isEven, bg, font);
          cell.font = { ...cell.font, bold: true };
        } else {
          styleDataCell(cell, isEven);
        }
        if (centered) cell.alignment = { ...cell.alignment, horizontal: 'center' };
      });
    });
  }

  // ── Rankings sheet ────────────────────────────────────────────────────────
  private addRankingsSheet(wb: ExcelJS.Workbook, swimmerData: SwimmerData): void {
    const ws = wb.addWorksheet('Rankings', { properties: { tabColor: { argb: 'FF7030A0' } } });

    ws.columns = [
      { key: 'event',   width: 28 },
      { key: 'course',  width: 10 },
      { key: 'kcRank',  width: 12 },
      { key: 'kcTotal', width: 10 },
      { key: 'kcAge',   width: 12 },
      { key: 'kcTime',  width: 12 },
      { key: 'kcFina',  width: 12 },
      { key: 'natRank',  width: 12 },
      { key: 'natTotal', width: 10 },
      { key: 'natAge',   width: 12 },
      { key: 'natTime',  width: 12 },
      { key: 'natFina',  width: 12 },
    ];

    const totalCols = 12;
    const exportedOn = formatDate(new Date());

    addTitleRow(ws, `${swimmerData.name}  ·  Rankings  ·  ${exportedOn}`, totalCols);

    const grpRow = ws.addRow(Array(totalCols).fill(''));
    grpRow.height = 18;
    (['Event', 'Course'] as const).forEach((label, idx) => {
      const cell = grpRow.getCell(idx + 1);
      cell.value = label;
      styleHeaderCell(cell);
    });
    ws.mergeCells(grpRow.number, 3, grpRow.number, 7);
    const kcCell = grpRow.getCell(3);
    kcCell.value = 'Kent County';
    styleHeaderCell(kcCell, 'FF1F6E43');
    ws.mergeCells(grpRow.number, 8, grpRow.number, 12);
    const natCell = grpRow.getCell(8);
    natCell.value = 'National';
    styleHeaderCell(natCell, 'FF7030A0');

    const subHeaders = [
      '', '',
      'Rank', 'Total', 'Age Group', 'Time', 'FINA Pts',
      'Rank', 'Total', 'Age Group', 'Time', 'FINA Pts',
    ];
    const shRow = ws.addRow(subHeaders);
    shRow.height = 20;
    shRow.eachCell((cell, col) => {
      if (col === 1 || col === 2) {
        styleHeaderCell(cell);
      } else {
        styleHeaderCell(cell, col <= 7 ? 'FF375623' : 'FF5B2688');
      }
    });

    ws.views = [{ state: 'frozen', ySplit: 3 }];

    const rankings = swimmerData.rankings!;
    Object.entries(rankings).forEach(([eventKey, data], i) => {
      const lastUnderscore = eventKey.lastIndexOf('_');
      const event  = eventKey.substring(0, lastUnderscore);
      const course = eventKey.substring(lastUnderscore + 1);

      const kcEntry = data.kentCounty?.entry;
      const natEntry = data.national?.entry;

      const row = ws.addRow([
        event, course,
        kcEntry ? `#${kcEntry.position}` : '',
        data.kentCounty?.total ?? '',
        data.kentCounty?.ageGroup ?? '',
        kcEntry?.time ?? '',
        kcEntry?.fina ?? '',
        natEntry ? `#${natEntry.position}` : '',
        data.national?.total ?? '',
        data.national?.ageGroup ?? '',
        natEntry?.time ?? '',
        natEntry?.fina ?? '',
      ]);
      row.height = 18;
      const isEven = i % 2 === 0;

      row.eachCell((cell, col) => {
        styleDataCell(cell, isEven);
        if (col >= 3) cell.alignment = { ...cell.alignment, horizontal: 'center' };
        if ((col === 3 || col === 8) && cell.value) {
          cell.font = { ...cell.font, bold: true };
        }
      });
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private generateFileName(swimmerData: SwimmerData): string {
    return `${swimmerData.name.replace(/\s+/g, '_')}_${swimmerData.tiref}_${Date.now()}.xlsx`;
  }
}
