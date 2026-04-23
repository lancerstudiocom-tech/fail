export async function scanWithHF(base64Image: string, token: string) {
  try {
    console.log('Routing Qwen OCR through local proxy...');
    
    const response = await fetch("http://localhost:3001/api/ocr-hf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        token: token
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Proxy OCR Error:', err);
      alert('Proxy Error: ' + (err.error || err.message || JSON.stringify(err)) + '\nDetails: ' + (err.details || 'None'));
      return null;
    }

    const result = await response.json();
    console.log('Proxy OCR Result:', result);
    
    const text = result.generated_text || (Array.isArray(result) ? result[0]?.generated_text : null);
    
    if (!text) return null;

    return {
      status: 'success',
      lines: text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0),
      rawText: text
    };
  } catch (error: any) {
    console.error('HF Proxy Failure:', error);
    alert('OCR Connection Error (Proxy): ' + error.message);
    return null;
  }
}
