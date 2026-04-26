export async function parseBillWithGroq(text: string) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API Key missing");

  const prompt = `
    You are a specialized OCR parser for "SUMI TAILORING INSTITUTE" receipts.
    
    ### EXTRACTION RULES:
    1. "name": Find the handwritten text immediately following "Ms/Mrs:". 
       - This is often faint or cursive. 
       - IMPORTANT: IGNORE addresses. If you see "Rajakilpakkam", "Madambakkam", "Chennai", "VGP", or "Srinivasa Nagar", these are ADDRESSES. NEVER use them as the customer name.
       - If you see "Kanaga", "Sathyabama", "Meera", etc., these are NAMES.
    2. "phone": ONLY extract if you see a HANDWRITTEN 10-digit number. 
       - IMPORTANT: IGNORE the printed number "+91 6374734176" (that is the shop's number).
    3. "totalBill": The numeric value in the bottom-right "Total" box. 
       - Look for handwritten numbers like 6000 or 2500.
    4. "measurements": Ignore unless explicitly listed with labels like UC, MC, etc.

    ### SAMPLE EXAMPLES FOR TRAINING:
    Sample 1 Text: "...Ms/Mrs. Kanaga Particulars Megandhi Rs. 6,000 Total 6,000..."
    Result: {"name": "Kanaga", "phone": "", "totalBill": 6000}

    Sample 2 Text: "...Ms/Mrs. Sathyabama Particulars Saree prepleating 1,000 Aari 1,500 Total 2,500..."
    Result: {"name": "Sathyabama", "phone": "", "totalBill": 2500}

    ### TASK:
    Analyze the following OCR text and return ONLY a JSON object.
    {
      "name": "string",
      "phone": "string",
      "totalBill": number,
      "measurements": { ... }
    }
    
    If name is not explicitly labeled, infer it from the most likely person's name in the text.
    
    OCR TEXT:
    ${text}
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Groq request failed");
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error("Groq Parsing Error:", error);
    throw error;
  }
}
