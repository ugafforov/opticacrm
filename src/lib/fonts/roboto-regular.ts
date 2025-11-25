// Roboto Regular font loader for jsPDF
// This font supports Cyrillic characters for PDF generation

let cachedFont: string | null = null;

/**
 * Loads Roboto font and converts to base64 for jsPDF
 * Uses runtime fetching to avoid build issues
 */
export const loadRobotoFont = async (): Promise<string> => {
  if (cachedFont) {
    return cachedFont;
  }

  try {
    // Fetch font from Google Fonts CDN
    const response = await fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu72xKOzY.woff2');
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 data (remove data:application/octet-stream;base64, prefix)
        cachedFont = result.split(',')[1];
        resolve(cachedFont!);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load Roboto font:', error);
    throw error;
  }
};

export default loadRobotoFont;
