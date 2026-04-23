/**
 * Groq Vision Service - Direct API call (no proxy needed)
 * Uses Llama 4 Scout vision model to extract receipt/order details
 */

const EXTRACTION_PROMPT = `You are an expert receipt/document analyzer for a tailoring institute and custom tailoring shop.

Analyze this image carefully and extract ALL of the following details:

1. **Customer/Student Name** — Look for names after Ms/Mrs/Mr, or any prominent name field
2. **Phone Number** — 10-digit mobile number
3. **Receipt/Bill Number** — S.No, Receipt No, Bill No
4. **Date** — Any date mentioned
5. **Course or Order Details** — Look for:
   - Courses: Tailoring, Aari, Embroidery, Stitching, Blouse, Fashion Design, etc.
   - Customer Orders: Blouse, Churidar, Saree, Frock, Salwar, Shirt, Pant, etc.
   List each item with its individual price/amount.
6. **Total Amount** — Grand Total, Total Fee, Course Fee, Total Bill
7. **Amount Paid** — Paid, Advance, Deposit, Received
8. **Balance** — Balance, Due, Pending, Remaining
9. **Payment Method** — Cash, UPI, Card, Online, etc.

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "name": "string or null",
  "phone": "string or null",
  "receiptNumber": "string or null",
  "date": "string or null",
  "paymentMethod": "string or null",
  "totalAmount": number or 0,
  "paidAmount": number or 0,
  "balance": number or 0,
  "courses": [
    { "name": "string", "amount": number }
  ]
}

Rules:
- All amounts must be clean numbers (no commas, no currency symbols)
- If balance is not mentioned but total and paid are, calculate: balance = totalAmount - paidAmount
- If only one amount is visible, set it as totalAmount
- Return null for fields you cannot find
- courses array should contain ALL items/courses found with individual amounts`;

export async function scanWithGroq(base64Image: string, apiKey: string) {
  try {
    console.log('Calling Groq Vision API directly...');

    const imageUrl = base64Image.startsWith('data:image')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1024
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq API Error:', err);
      const errorMsg = err.error?.message || err.message || JSON.stringify(err);
      console.warn('Groq Error Detail:', errorMsg);
      return null;
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    console.log('Groq Vision Raw Result:', text);

    if (!text) return null;

    // Try to parse as structured JSON first
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          status: 'success',
          structured: true,
          data: {
            name: data.name || "",
            phone: data.phone || "",
            receiptNumber: data.receiptNumber || "",
            date: data.date || "",
            paymentMethod: data.paymentMethod || "",
            totalAmount: Number(data.totalAmount || 0),
            paidAmount: Number(data.paidAmount || 0),
            balance: Number(data.balance || 0),
            courses: (data.courses || []).map((c: any) => ({
              name: c.name || "",
              amount: Number(c.amount || 0)
            }))
          },
          lines: text.split('\n'),
          rawText: text
        };
      }
    } catch (parseErr) {
      console.warn('Groq JSON parse failed, falling back to line-based parsing:', parseErr);
    }

    // Fallback: return as lines for the existing parser
    const lines = text.split('\n');
    return {
      status: 'success',
      structured: false,
      lines: lines,
      rawText: text
    };
  } catch (error: any) {
    console.error('Groq API Failure:', error);
    return null;
  }
}
