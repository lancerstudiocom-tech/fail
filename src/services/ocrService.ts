/**
 * OCR Service to interface with local PaddleOCR-based API
 */

export interface OCRResult {
  name: string;
  phone: string;
  receiptNumber: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  courses: { name: string; amount: number }[];
  rawText: string;
}

const API_URL = 'http://localhost:3001/api/ocr';

/**
 * Clean up strings to numbers (e.g. "2,500.00" -> 2500)
 */
function cleanNumber(val: string | number | null): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  
  // Remove commas, currency symbols, and spaces
  const cleaned = val.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Robust parsing logic for tailoring receipts
 */
export function parseOCRText(lines: string[]): OCRResult {
  const result: OCRResult = {
    name: '',
    phone: '',
    receiptNumber: '',
    date: '',
    totalAmount: 0,
    paidAmount: 0,
    balance: 0,
    courses: [],
    rawText: lines.join('\n')
  };

  const courseKeywords = ['tailoring', 'blouse', 'embroidery', 'aari', 'stitching', 'chudidar', 'frock', 'salwar', 'shirt', 'pant'];
  const totalKeywords = ['total', 'fee', 'grand', 'amount', 'sum'];
  const paidKeywords = ['paid', 'advance', 'received', 'deposit', 'credit'];
  const balanceKeywords = ['balance', 'due', 'pending', 'remaining'];

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // AI Structured Parsing (Key: Value) - Very efficient for Groq/Llama
    if (line.includes(':')) {
      const parts = line.split(':');
      const key = parts[0].toLowerCase();
      const value = parts.slice(1).join(':').trim();

      if (key.includes('name')) {
        result.name = value.replace(/^(ms\/mrs\.|ms\/mrs|ms\.|mrs\.|mr\.|ms|mrs)/i, '').trim();
        return;
      }
      if (key.includes('amount') || key.includes('total')) {
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          result.totalAmount = num;
          return;
        }
      }
      if (key.includes('items') || key.includes('service') || key.includes('particulars')) {
        const items = value.split(',').map(i => i.trim());
        items.forEach(itemStr => {
          if (!itemStr) return;
          
          // Handle "Item: Price" or "Item Price" or just "Item"
          let name = itemStr;
          let amount = 0;
          
          if (itemStr.includes(':')) {
            const [n, p] = itemStr.split(':');
            name = n.trim();
            amount = parseFloat(p.replace(/[^0-9.]/g, '')) || 0;
          } else {
            // Try to find a number at the end
            const matches = itemStr.match(/(.+)\s+(\d+)/);
            if (matches) {
              name = matches[1].trim();
              amount = parseFloat(matches[2]) || 0;
            }
          }

          if (name && !result.courses.find(c => c.name.toLowerCase() === name.toLowerCase())) {
            result.courses.push({ name: name.charAt(0).toUpperCase() + name.slice(1), amount });
          }
        });
        return;
      }
      if (key.includes('sno') || key.includes('receipt') || key.includes('number')) {
        result.receiptNumber = value.replace(/[^0-9]/g, '');
        return;
      }
      if (key.includes('date')) {
        result.date = value;
        return;
      }
    }

    // 1. Name Parsing
    if (!result.name) {
      if (lowerLine.includes('name:')) {
        result.name = line.split(/name:/i)[1]?.trim();
      } else if (lowerLine.includes('ms/mrs.') || lowerLine.includes('ms/mrs') || lowerLine.startsWith('ms.') || lowerLine.startsWith('mrs.') || lowerLine.startsWith('mr.')) {
        result.name = line.replace(/^(ms\/mrs\.|ms\/mrs|ms\.|mrs\.|mr\.)/i, '').trim();
      } else if (lowerLine.startsWith('ms ') || lowerLine.startsWith('mrs ')) {
        result.name = line.replace(/^(ms|mrs)/i, '').trim();
      }
      
      if (result.name) {
        result.name = result.name.replace(/^(ms\/mrs\.|ms\/mrs|ms\.|mrs\.|mr\.|ms|mrs)/i, '')
                                 .replace(/[_.]/g, ' ') // Strip underscores and multiple dots
                                 .trim();
      }
    }

    // 2. Phone Parsing
    if (!result.phone) {
      const phoneMatch = line.match(/\d{10}/);
      if (phoneMatch) {
        result.phone = phoneMatch[0];
      }
    }

    // 3. Date Parsing
    if (!result.date) {
      const dateMatch = line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
      if (dateMatch) {
        result.date = dateMatch[0];
      }
    }

    // 4. Receipt Number
    if (!result.receiptNumber && (lowerLine.includes('receipt') || lowerLine.includes('bill no'))) {
      const numMatch = line.match(/\d+/);
      if (numMatch) result.receiptNumber = numMatch[0];
    }

    // 5. Course Detection
    courseKeywords.forEach(kw => {
      if (lowerLine.includes(kw)) {
        // Try to find an amount in the same or next line
        let amount = 0;
        const amountMatch = line.match(/\d+/g);
        if (amountMatch && amountMatch.length > 0) {
          // Take the largest number as amount if multiple exist, or just the last one
          amount = cleanNumber(amountMatch[amountMatch.length - 1]);
        }
        
        if (!result.courses.find(c => c.name.toLowerCase() === kw)) {
          result.courses.push({ name: kw.charAt(0).toUpperCase() + kw.slice(1), amount });
        }
      }
    });

    // 6. Financials
    totalKeywords.forEach(kw => {
      if (lowerLine.includes(kw) && !lowerLine.includes('paid') && !lowerLine.includes('balance')) {
        const num = cleanNumber(line);
        if (num > result.totalAmount) result.totalAmount = num;
      }
    });

    paidKeywords.forEach(kw => {
      if (lowerLine.includes(kw)) {
        const num = cleanNumber(line);
        if (num > 0) result.paidAmount = num;
      }
    });

    balanceKeywords.forEach(kw => {
      if (lowerLine.includes(kw)) {
        const num = cleanNumber(line);
        if (num > 0) result.balance = num;
      }
    });
  });

  // Fallback Calculations
  if (result.totalAmount === 0 && result.courses.length > 0) {
    result.totalAmount = result.courses.reduce((acc, c) => acc + c.amount, 0);
  }
  
  if (result.balance === 0 && result.totalAmount > 0) {
    result.balance = result.totalAmount - result.paidAmount;
  }

  return result;
}

import { scanWithTesseract } from './tesseractOCR';
import { scanWithGroq } from './groqService';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

export async function scanReceiptLocal(base64Image: string): Promise<OCRResult | null> {
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY is missing! OCR will fail. Please check your .env file.');
  }

  // 1. Try High-Speed Groq Llama-Vision (Primary)
  try {
    console.log('Attempting Groq Llama-Vision Scan (Key present: ' + (GROQ_API_KEY ? 'Yes' : 'No') + ')...');
    const groqResult = await scanWithGroq(base64Image, GROQ_API_KEY);
    
    if (groqResult) {
      console.log('Groq Vision Success!');
      
      // If we have structured data, use it directly
      if (groqResult.structured && groqResult.data) {
        return {
          ...groqResult.data,
          rawText: groqResult.rawText
        } as OCRResult;
      }
      
      // Fallback to line-based parsing if structured data is missing
      if (groqResult.lines) {
        return parseOCRText(groqResult.lines);
      }
    }
  } catch (err) {
    console.warn('Groq Scan Failed, trying tesseract fallback...', err);
  }

  // 2. Try Browser-Based Tesseract (Last Resort)
  console.log('Using Tesseract.js fallback...');
  try {
    const result = await scanWithTesseract(base64Image);
    if (result && result.lines) {
      return parseOCRText(result.lines);
    }
  } catch (err) {
    console.error('Tesseract Scan Failed:', err);
  }
  
  return null;
}

