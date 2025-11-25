import jsPDF from "jspdf";
import { formatUzbekistanDateTime } from "./utils";
import { loadRobotoFont } from "./fonts/roboto-regular";

/**
 * Creates a new jsPDF document configured for Cyrillic or Latin text
 * Loads Roboto font for Cyrillic support at runtime
 * @param orientation - 'portrait' or 'landscape' (default: 'portrait')
 * @param script - 'cyrillic' or 'latin' (default: 'latin')
 * @returns Promise<Configured jsPDF instance with appropriate font>
 */
export const setupPdfDoc = async (
  orientation: 'portrait' | 'landscape' = 'portrait',
  script: 'cyrillic' | 'latin' = 'latin'
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  if (script === 'cyrillic') {
    try {
      // Load Roboto font for Cyrillic support
      const robotoBase64 = await loadRobotoFont();
      doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto', 'normal');
    } catch (error) {
      console.error('Failed to load Roboto font, falling back to helvetica:', error);
      doc.setFont("helvetica", "normal");
    }
  } else {
    // Use default helvetica font for Latin
    doc.setFont("helvetica", "normal");
  }

  return doc;
};

/**
 * Add header to PDF with user and export information
 * @param doc - jsPDF document instance
 * @param title - Title of the document
 * @param userEmail - Email of the user exporting the document
 * @param additionalInfo - Optional additional information to display
 * @returns Y position where table should start
 */
export const addPdfHeader = (
  doc: jsPDF, 
  title: string, 
  userEmail?: string,
  additionalInfo?: string,
  exportedByLabel: string = "Eksport qilgan:",
  dateTimeLabel: string = "Sana va vaqt:"
): number => {
  const dateTime = formatUzbekistanDateTime();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  doc.setFontSize(9);
  doc.text(`${exportedByLabel} ${userEmail || "Noma'lum"}`, 14, 22);
  doc.text(`${dateTimeLabel} ${dateTime}`, 14, 27);
  
  if (additionalInfo) {
    doc.text(additionalInfo, 14, 32);
    return 38; // startY for table
  }
  return 33; // startY for table
};
