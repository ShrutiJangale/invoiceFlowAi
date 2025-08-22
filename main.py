from pathlib import Path
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import config
from file_recognizer import FileRecognizer
from llm_pipeline import InvoiceEntityExtractor

app = FastAPI()

# Static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/process")
async def process_invoice(file: UploadFile, category: str = Form(...)):
    try:
        upload_path = config.UPLOAD_DIR / file.filename
        with open(upload_path, "wb") as f:
            f.write(await file.read())

        fr = FileRecognizer()
        result = fr.process_upload(upload_path, category)
        if not result.get("success"):
            return JSONResponse({"success": False, "error": result.get("error")}, status_code=400)

        combined: Dict[str, Any] = {}
        for page in result["pages"]:
            if page["text_length"] > 0:
                with open(page["filepath"], "r", encoding="utf-8") as f:
                    text = f.read()
                entities = InvoiceEntityExtractor.extract_invoice_entities(text, category=category)
                if entities.get("success") and isinstance(entities.get("extracted_data"), dict):
                    for k, v in entities.get("extracted_data", {}).items():
                        if k not in combined or combined[k] in (None, "", []):
                            combined[k] = v

        payload = {
            "success": True,
            "original_file": file.filename,
            "category": category,
            "total_pages": result["total_pages"],
            "pdf_url": f"/uploads/{file.filename}",
            "key_values": combined,
            "timestamp": datetime.now().isoformat(),
        }

        out_file = config.TRANSFORMED_DATA_DIR / f"{Path(file.filename).stem}_extracted_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            import json as _json
            _json.dump(payload["key_values"], f, indent=2, ensure_ascii=False)

        return JSONResponse(payload)
    except Exception as exc:
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)

@app.get('/uploads/{filename}')
def get_upload(filename: str):
    path = config.UPLOAD_DIR / filename
    return FileResponse(path)

