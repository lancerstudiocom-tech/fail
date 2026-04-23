import sys
import json
import os
import requests

def preprocess_image(image_path):
    """
    Apply preprocessing to improve OCR accuracy
    """
    from PIL import Image, ImageOps, ImageEnhance
    img = Image.open(image_path)
    
    # Convert to grayscale
    img = ImageOps.grayscale(img)
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    
    # Save temp preprocessed image
    temp_path = "temp_preprocessed.jpg"
    img.save(temp_path)
    return temp_path

import requests

def call_hf_api(image_path, token):
    API_URL = "https://api-inference.huggingface.co/models/microsoft/trocr-large-handwritten"
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(image_path, "rb") as f:
        data = f.read()
    
    response = requests.post(API_URL, headers=headers, data=data)
    if response.status_code == 200:
        result = response.json()
        text = result[0].get("generated_text", "") if isinstance(result, list) else result.get("generated_text", "")
        return {
            "status": "success",
            "lines": text.split("\n"),
            "raw_text": text
        }
    else:
        raise Exception(f"HF API Error: {response.status_code} - {response.text}")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    token = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    try:
        if token:
            # Use HF API
            result = call_hf_api(image_path, token)
            print(json.dumps(result))
            return

        # Local EasyOCR Fallback (Lazy Import)
        import easyocr
        from PIL import Image
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(image_path)
        lines = [text for (bbox, text, prob) in results]
        print(json.dumps({
            "status": "success",
            "lines": lines,
            "raw_text": "\n".join(lines)
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
