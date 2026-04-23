import { parseOCRText } from './src/services/ocrService.ts';

const sampleLines = [
  "SUMI DESIGNS",
  "Tailoring & Embroidery",
  "Name: Ms. Anitha Raj",
  "Phone: 9876543210",
  "Receipt No: 452",
  "Date: 23/04/2026",
  "--------------------",
  "Blouse Stitching: 800",
  "Aari Work: 1500",
  "--------------------",
  "Total Amount: 2300",
  "Paid: 1000",
  "Balance: 1300",
  "Thank you!"
];

console.log("Testing OCR Parser...");
const result = parseOCRText(sampleLines);
console.log(JSON.stringify(result, null, 2));

if (result.name === "Anitha Raj" && result.totalAmount === 2300 && result.paidAmount === 1000) {
  console.log("✅ Parser Test Passed!");
} else {
  console.log("❌ Parser Test Failed!");
}
