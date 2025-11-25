import jsPDF from "jspdf";
import { formatUzbekistanDateTime } from "./utils";

/**
 * Creates a new jsPDF document configured for Cyrillic or Latin text
 * For now, uses helvetica for both until custom font loading is implemented
 * @param orientation - 'portrait' or 'landscape' (default: 'portrait')
 * @param script - 'cyrillic' or 'latin' (default: 'latin')
 * @returns Configured jsPDF instance with appropriate font
 */
export const setupPdfDoc = (
  orientation: 'portrait' | 'landscape' = 'portrait',
  script: 'cyrillic' | 'latin' = 'latin'
) => {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Note: For Cyrillic support, we would need to load a custom font
  // Currently using helvetica as fallback which has limited Cyrillic support
  // TODO: Implement async font loading with loadRobotoFont() from fonts/roboto-regular.ts
  doc.setFont("helvetica", "normal");

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
  additionalInfo?: string
): number => {
  const dateTime = formatUzbekistanDateTime();
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  doc.setFontSize(9);
  doc.text(`Eksport qilgan: ${userEmail || "Noma'lum"}`, 14, 22);
  doc.text(`Sana va vaqt: ${dateTime}`, 14, 27);
  
  if (additionalInfo) {
    doc.text(additionalInfo, 14, 32);
    return 38; // startY for table
  }
  return 33; // startY for table
};
