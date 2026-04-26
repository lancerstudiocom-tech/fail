export async function parseBillImageWithGroq(imageBase64: string, mimeType: string) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API Key missing");

  const prompt = `You are analyzing a receipt from "SUMI TAILORING INSTITUTE".

Look at the image carefully and extract ONLY the following:
1. "name": The HANDWRITTEN text written on the line that says "Ms/Mrs." — this is the customer name (e.g. "Kanaga", "Sathyabama"). Do NOT use the shop name or address.
2. "totalBill": The HANDWRITTEN number written in the bottom-right "Total" box (e.g. 6000, 2500). Return it as a number, no commas.
3. "phone": Any HANDWRITTEN phone number you see (NOT the printed shop number +91 6374734176). If none, return "".
4. "measurements": Any measurement values with labels like UC, MC, Waist, Shoulder, etc. If none, return {}.

Return ONLY a valid JSON object. No explanation, no markdown.
Example output: {"name": "Kanaga", "phone": "", "totalBill": 6000, "measurements": {}}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 512
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Groq Vision API request failed");
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  console.log("=== GROQ VISION RAW OUTPUT ===");
  console.log(content);
  console.log("==============================");
  
  return JSON.parse(content);
}
