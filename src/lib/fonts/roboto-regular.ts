// Roboto Regular font loader for jsPDF
// This font supports Cyrillic characters for PDF generation

let cachedFont: string | null = null;

/**
 * Loads Roboto font and converts to base64 for jsPDF
 * Uses runtime fetching from CDN to support Cyrillic characters
 */
export const loadRobotoFont = async (): Promise<string> => {
  if (cachedFont) {
    return cachedFont;
  }

  try {
    // Fetch font from same-origin public/fonts to avoid CORS issues
    const response = await fetch('/fonts/Roboto-Regular.ttf');
    
    
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status}`);
    }
    
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
