from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
import fitz  # PyMuPDF
import logging
import json

# Import the classes you just built!
from extractor import DocumentExtractor 
from mapper import ReceiptMapper, InvestmentMapper

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.post("/process-document")
async def process_document(
    file: UploadFile = File(...), 
    doc_type: str = Form(...) 
):
    try:
        logger.info(f"Processing document: filename={file.filename}, content_type={file.content_type}, doc_type={doc_type}")
        
        # 1. Read the image sent by Node.js
        image_bytes = await file.read()

        if not image_bytes:
            logger.error("No image file provided")
            raise HTTPException(status_code=400, detail="No image file provided.")
        
        # --- THE FORK IN THE ROAD ---

        is_pdf = file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")

        # PATH A: Handle PDFs
        if is_pdf:
            logger.info("Processing PDF file")
            pdf_document = fitz.open(stream=image_bytes, filetype="pdf")
            first_page = pdf_document.load_page(0) 
            zoom_matrix = fitz.Matrix(3, 3)
            pix = first_page.get_pixmap(matrix=zoom_matrix)
            pil_image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
        # PATH B: Handle Images (JPEG, PNG, etc.)
        else:
            logger.info("Processing image file (JPEG, PNG, etc.)")
            pil_image = Image.open(BytesIO(image_bytes)).convert('RGB')
            
        # --- THE MERGE POINT (Un-indented!) ---
        # Both paths now have a valid `pil_image`! We can safely process it.

        # Convert PIL image to an OpenCV numpy array (Tesseract loves this format)
        open_cv_image = np.array(pil_image)
        
        # Convert RGB to BGR 
        clean_image = open_cv_image[:, :, ::-1].copy() 

        # 2. Run the Extractor (Turn pixels into math and text)
        logger.info("Starting OCR extraction...")
        extractor = DocumentExtractor(clean_image)
        primitives = extractor.extract_text()
        
        logger.info(f"Extracted {len(primitives)} primitives from document")
        
        # Log each extracted primitive for debugging
        for i, prim in enumerate(primitives):
            logger.debug(f"Primitive {i}: text='{prim['raw_text']}' | type={prim['type']} | value={prim['value']} | box={prim['box']}")

        # 3. Route to the correct Mapper based on doc_type
        logger.info(f"Routing to {doc_type} mapper")
        
        if doc_type == 'receipt':
            mapper = ReceiptMapper(primitives)
        elif doc_type == 'investment':
            mapper = InvestmentMapper(primitives)
        else:
            logger.error(f"Invalid doc_type: {doc_type}")
            raise HTTPException(status_code=400, detail="Invalid doc_type. Use 'receipt' or 'investment'.")

        # 4. Extract the final schema and return it to Node.js!
        final_data = mapper.extract_schema()
        
        logger.info(f"Final extracted schema: {json.dumps(final_data, indent=2, default=str)}")
        logger.info("Document processing completed successfully")
        
        return {
            "status": "success",
            "data": final_data
        }

    except Exception as e:
        import traceback
        logger.error(f"Error processing document: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))