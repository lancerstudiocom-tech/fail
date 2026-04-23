import { createWorker } from 'tesseract.js';

/**
 * Boosts contrast and brightness for better OCR
 */
async function preprocessForOCR(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Use CSS filter for high-speed preprocessing
      ctx.filter = 'contrast(180%) brightness(110%) grayscale(100%)';
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export async function scanWithTesseract(base64Image: string) {
  try {
    console.log('--- OCR Diagnostics (Raw Mode) ---');
    
    console.log('Initializing Tesseract worker...');
    const worker = await createWorker('eng', 1, {
      logger: m => console.log('Tesseract Progress:', m.status, Math.round(m.progress * 100) + '%')
    });
    
    console.log('Recognizing text...');
    const { data: { text, lines = [] } } = await worker.recognize(base64Image);
    
    console.log('Terminating worker...');
    await worker.terminate();
    
    console.log('OCR Raw Text Found:', text);
    
    return {
      status: 'success',
      lines: (lines || []).map((l: any) => l.text.trim()).filter((t: string) => t.length > 0),
      rawText: text || ""
    };
  } catch (error: any) {
    console.error('OCR Critical Failure:', error);
    alert('Tesseract Error: ' + (error.message || JSON.stringify(error)));
    return null;
  }
}
