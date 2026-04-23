import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

/**
 * Boosts contrast of an image base64 string using canvas
 */
async function boostContrast(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Apply contrast boost (approximate)
      // We can use filter if supported, or manual pixel manipulation
      ctx.filter = 'contrast(150%) brightness(110%)';
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Resizes an image to a maximum of 1080p while maintaining aspect ratio
 */
async function resizeImage(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Local Pixel-Detection Script to identify Red (Student) or Blue (Customer) lines instantly.
 * Analyzes the pixel data for dominant red or blue signatures.
 */
export function detectColorLine(pixelData: Uint8ClampedArray): 'student' | 'customer' | 'unknown' {
  let redCount = 0;
  let blueCount = 0;
  
  // Sample pixels (every 10th pixel to save time)
  for (let i = 0; i < pixelData.length; i += 40) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];
    
    // Detect Red (Student)
    if (r > 150 && g < 100 && b < 100) {
      redCount++;
    }
    // Detect Blue (Customer)
    else if (b > 150 && r < 100 && g < 100) {
      blueCount++;
    }
  }
  
  if (redCount > blueCount && redCount > 50) return 'student';
  if (blueCount > redCount && blueCount > 50) return 'customer';
  
  return 'unknown'; 
}

export async function scanReceipt(base64Image: string, type: 'student' | 'customer' | 'unknown' = 'unknown') {
  // Pre-filter: Downscale to 1080p for faster processing
  const resizedImage = await resizeImage(base64Image);
  
  // Boost contrast for better OCR accuracy
  const boostedImage = await boostContrast(resizedImage);

  const prompt = type === 'customer' 
    ? `
    Extract ONLY the following details from this customer measurement/bill sheet:
    - Name (Full Name)
    - Phone (10 digits)
    
    Return ONLY a JSON object: 
    { 
      "name": string, 
      "phone": string
    }
    If a field is not found, return null for it.
    `
    : `
    Extract the following details from this tailoring student admission/fee receipt or bill:
    
    1. Name (Full Name)
    2. Phone (Look for mobile numbers, 10 digits)
    3. Receipt Number (if mentioned)
    4. Date (if mentioned)
    
    5. Course/Service Detail: Look for keywords like 'Aari', 'Embroidery', 'Stitching', 'Tailoring', 'Blouse', 'Fashion', 'Apparel', 'Garment'.
       List each course mentioned with its individual amount.
    
    6. Financials: 
       - Total Amount (Look for 'Total', 'Course Fee', 'Grand Total', or 'Sum')
       - Paid Amount (Look for 'Paid', 'Deposit', 'Advance', 'Received')
       - Balance Amount (Look for 'Balance', 'Due', 'Pending', 'Remaining')
    
    Return ONLY a JSON object: 
    { 
      "name": string, 
      "phone": string,
      "receiptNumber": string,
      "date": string,
      "paymentMethod": string,
      "totalAmount": number,
      "paidAmount": number,
      "balance": number,
      "courses": [
        { "name": string, "amount": number }
      ]
    }
    Ensure all amounts are clean numbers. If a field is not found, return null for it.
    `;

  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: boostedImage,
            },
          },
        ],
      },
    ],
  });

  const text = response.text;
  try {
    // Extract JSON from markdown if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const data = JSON.parse(jsonMatch[0]);
    
    // Normalize fields
    if (type === 'customer') {
      return {
        name: data.name || "",
        phone: data.phone || "",
        receiptNumber: "",
        date: "",
        paymentMethod: "",
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        courses: []
      };
    }

    return {
      name: data.name || "",
      phone: data.phone || "",
      receiptNumber: data.receiptNumber || "",
      date: data.date || "",
      paymentMethod: data.paymentMethod || "",
      totalAmount: Number(data.totalAmount || data.amount || 0),
      paidAmount: Number(data.paidAmount || 0),
      balance: Number(data.balance || 0),
      courses: (data.courses || []).map((c: any) => ({
        name: c.name || "",
        amount: Number(c.amount || 0)
      }))
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
}
