import * as pdfjsLib from 'pdfjs-dist';

// Set worker source to a CDN to avoid local build configuration issues
// Using specific version 4.4.168 to match import map
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  // Create an array of page numbers
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  // Render pages in parallel using Promise.all
  const imagePromises = pageNumbers.map(async (pageNum) => {
    const page = await pdf.getPage(pageNum);
    // Increased scale to 2.0 for better OCR accuracy on small text/numbers
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) return null;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    // Convert to base64 string using PNG (lossless) for maximum clarity
    // This helps significantly with number extraction compared to JPEG
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    return base64;
  });

  const images = await Promise.all(imagePromises);
  
  // Filter out any potential nulls (though unlikely)
  return images.filter((img): img is string => img !== null);
};