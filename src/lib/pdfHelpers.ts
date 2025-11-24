import jsPDF from "jspdf";

/**
 * Creates a new jsPDF document configured for Cyrillic text
 * Uses default fonts with Unicode support
 * @param orientation - 'portrait' or 'landscape' (default: 'portrait')
 * @returns Configured jsPDF instance
 */
export const setupPdfDoc = (orientation: 'portrait' | 'landscape' = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Use default helvetica font which has broader Unicode support
  doc.setFont("helvetica", "normal");

  return doc;
};
