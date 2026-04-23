const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.post('/api/ocr', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Save image to temporary file
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const imagePath = path.join(uploadsDir, `temp_${Date.now()}.jpg`);
  
  fs.writeFileSync(imagePath, base64Data, 'base64');
  console.log(`Processing image: ${imagePath}`);

  // Run Python OCR engine
  console.log('Attempting Python OCR...');
  const pythonProcess = spawn('python', ['ocr_engine.py', imagePath]);

  let resultData = '';
  let errorData = '';

  pythonProcess.stdout.on('data', (data) => {
    resultData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    if (code === 0) {
      try {
        const parsedResult = JSON.parse(resultData);
        try { fs.unlinkSync(imagePath); } catch (e) {}
        return res.json(parsedResult);
      } catch (e) {
        console.error("Failed to parse Python output:", resultData);
      }
    }

    console.log('Python OCR failed, trying Server-side Tesseract...');
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text, lines } } = await worker.recognize(imagePath);
      await worker.terminate();

      try { fs.unlinkSync(imagePath); } catch (e) {}

      res.json({
        status: "success",
        lines: lines.map(l => l.text.trim()).filter(t => t.length > 0),
        raw_text: text
      });
    } catch (tessError) {
      console.error("Tesseract Fallback failed:", tessError);
      try { fs.unlinkSync(imagePath); } catch (e) {}
      res.status(500).json({ error: 'OCR processing failed' });
    }
  });
});

app.post('/api/ocr-hf', async (req, res) => {
  const { image, token } = req.body;
  if (!image || !token) {
    return res.status(400).json({ error: 'Image and token required' });
  }

  let imagePath = path.join(__dirname, 'uploads', `ocr_hf_${Date.now()}.jpg`);
  try {
    const base64Data = image.split(',')[1] || image;
    fs.writeFileSync(imagePath, base64Data, 'base64');
    
    console.log('Spawning Python AI Engine...');
    const pythonProcess = spawn('python', ['ocr_engine.py', imagePath, token]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => { resultData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

    pythonProcess.on('close', (code) => {
      try { fs.unlinkSync(imagePath); } catch (e) {}
      if (code === 0) {
        try {
          const result = JSON.parse(resultData);
          return res.json(result);
        } catch (e) {
          return res.status(500).json({ error: 'Failed to parse AI output', raw: resultData });
        }
      }
      res.status(500).json({ error: 'AI Engine Error', details: errorData || resultData });
    });
  } catch (error) {
    console.error('AI Proxy Failure:', error);
    try { fs.unlinkSync(imagePath); } catch (e) {}
    res.status(500).json({ error: 'Failed to start AI Engine', details: error.message });
  }
});

app.post('/api/ocr-groq', async (req, res) => {
  const { image, token } = req.body;
  if (!image || !token) {
    return res.status(400).json({ error: 'Image and token required' });
  }

  try {
    console.log('Proxying Vision request to Groq...');
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this tailoring institute receipt. Extract the following details: \n- Student Name (after Ms/Mrs)\n- Receipt Number (S.No)\n- Date\n- Total Amount\n- Individual Items and their prices (e.g. Tailoring: 2500, Aari: 1500)\n\nReturn the result in this EXACT format:\nName: [Name]\nSNo: [Number]\nDate: [Date]\nAmount: [Total Number]\nItems: [Item1: Price1, Item2: Price2]"
              },
              {
                type: "image_url",
                image_url: {
                  url: image.startsWith('data:image') ? image : `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 512
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Groq Proxy Failure:', error);
    res.status(500).json({ error: 'Failed to connect to Groq', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`OCR Backend listening at http://localhost:${port}`);
});
