import jsPDF from "jspdf";
import { DejaVuSans } from "@/assets/fonts/DejaVuSans-normal";

/**
 * Creates a new jsPDF document with DejaVuSans font for Cyrillic support
 * @param orientation - 'portrait' or 'landscape' (default: 'portrait')
 * @returns Configured jsPDF instance
 */
export const setupPdfDoc = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Register DejaVuSans font for Cyrillic support
  doc.addFileToVFS("DejaVuSans.ttf", DejaVuSans);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.setFont("DejaVuSans", "normal");

  return doc;
};
