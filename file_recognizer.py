from pathlib import Path
from typing import Dict, Any, List
import pdfplumber
import shutil
import json
import config


class FileRecognizer:
    """Handles file upload and recognition, splitting PDFs and extracting text."""

    def __init__(self) -> None:
        self.upload_dir = config.UPLOAD_DIR
        self.processed_dir = config.PROCESSED_DIR

    def process_upload(self, file_path: Path, category: str) -> Dict[str, Any]:
        try:
            if not file_path.exists():
                return {"success": False, "error": f"File not found: {file_path}"}

            suffix = file_path.suffix.lower()
            if suffix not in config.SUPPORTED_EXTENSIONS:
                return {"success": False, "error": f"Unsupported file type: {suffix}"}

            category_dir = self.processed_dir / category.replace(" ", "_")
            category_dir.mkdir(exist_ok=True)

            if suffix == ".pdf":
                return self._process_pdf(file_path, category_dir)
            # For images just copy for now
            return self._process_image(file_path, category_dir)

        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def _process_pdf(self, pdf_path: Path, output_dir: Path) -> Dict[str, Any]:
        pages_info: List[Dict[str, Any]] = []
        text_data: List[str] = []
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text(layout=True) or ""
                text_data.append(page_text)
                page_filename = f"{pdf_path.stem}_page_{page_num}.txt"
                page_filepath = output_dir / page_filename
                with open(page_filepath, "w", encoding="utf-8") as f:
                    f.write(page_text)
                pages_info.append({
                    "page_number": page_num,
                    "filename": page_filename,
                    "filepath": str(page_filepath),
                    "text_length": len(page_text),
                })

        # Save raw full text (joined) with same filename into Raw_extracted_text
        if not config.RAW_EXTRACTED_TEXT_PATH.exists():
            config.RAW_EXTRACTED_TEXT_PATH.mkdir(parents=True, exist_ok=True)
            print("Raw_extracted_text folder created successfully")
        full_text_path = config.RAW_EXTRACTED_TEXT_PATH / f"{pdf_path.stem}.txt"
        with open(full_text_path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(text_data))

        processed_pdf_path = output_dir / pdf_path.name
        shutil.copy2(pdf_path, processed_pdf_path)

        return {
            "success": True,
            "original_file": str(pdf_path),
            "processed_file": str(processed_pdf_path),
            "total_pages": len(pages_info),
            "pages": pages_info,
        }

    def _process_image(self, image_path: Path, output_dir: Path) -> Dict[str, Any]:
        processed_image_path = output_dir / image_path.name
        shutil.copy2(image_path, processed_image_path)
        return {
            "success": True,
            "original_file": str(image_path),
            "processed_file": str(processed_image_path),
            "total_pages": 1,
            "pages": [
                {
                    "page_number": 1,
                    "filename": image_path.name,
                    "filepath": str(processed_image_path),
                    "text_length": 0,
                }
            ],
        }


