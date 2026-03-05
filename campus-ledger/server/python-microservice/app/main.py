from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from io import BytesIO
from PIL import Image
import numpy as np
import cv2

# Import the classes you just built!
from extractor import DocumentExtractor # Assuming your first file is named extractor.py
from mapper import ReceiptMapper, InvestmentMapper

app = FastAPI()

@app.post("/process-document")
async def process_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...) # Node.js will tell us if it's a 'receipt' or 'investment'
):
    try:
        # 1. Read the image sent by Node.js
        image_bytes = await file.read()
        pil_image = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Convert PIL image to an OpenCV numpy array (Tesseract loves this format)
        open_cv_image = np.array(pil_image)
        # Convert RGB to BGR 
        clean_image = open_cv_image[:, :, ::-1].copy() 

        # 2. Run the Extractor (Turn pixels into math and text)
        extractor = DocumentExtractor(clean_image)
        primitives = extractor.extract_text()

        # 3. Route to the correct Mapper based on doc_type
        if doc_type == 'receipt':
            mapper = ReceiptMapper(primitives)
        elif doc_type == 'investment':
            mapper = InvestmentMapper(primitives)
        else:
            raise HTTPException(status_code=400, detail="Invalid doc_type. Use 'receipt' or 'investment'.")

        # 4. Extract the final schema and return it to Node.js!
        final_data = mapper.extract_schema()
        
        return {
            "status": "success",
            "data": final_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))