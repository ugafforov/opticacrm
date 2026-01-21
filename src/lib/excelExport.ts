import ExcelJS from 'exceljs';

interface ExportConfig {
  fileName: string;
  sheetName: string;
  metadataSheetName: string;
  data: Record<string, any>[];
  metadata: Record<string, any>[];
}

/**
 * Exports data to an Excel file using ExcelJS
 * Replaces the vulnerable xlsx (SheetJS) package
 */
export const exportDataToExcel = async ({
  fileName,
  sheetName,
  metadataSheetName,
  data,
  metadata,
}: ExportConfig): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  
  // Create data worksheet
  const dataSheet = workbook.addWorksheet(sheetName);
  
  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0]);
    dataSheet.addRow(headers);
    
    // Style header row
    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data rows
    data.forEach((row) => {
      dataSheet.addRow(Object.values(row));
    });
    
    // Auto-fit columns
    dataSheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  }
  
  // Create metadata worksheet
  const metaSheet = workbook.addWorksheet(metadataSheetName);
  
  if (metadata.length > 0) {
    const metaHeaders = Object.keys(metadata[0]);
    metaSheet.addRow(metaHeaders);
    
    const metaHeaderRow = metaSheet.getRow(1);
    metaHeaderRow.font = { bold: true };
    
    metadata.forEach((row) => {
      metaSheet.addRow(Object.values(row));
    });
    
    metaSheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  }
  
  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
