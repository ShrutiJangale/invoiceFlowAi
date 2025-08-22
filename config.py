import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent

# File paths
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"
TRANSFORMED_DATA_DIR = BASE_DIR / "transformed_data"
RAW_EXTRACTED_TEXT_PATH = BASE_DIR / "Raw_extracted_text"

# Create directories if they don't exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, TRANSFORMED_DATA_DIR, RAW_EXTRACTED_TEXT_PATH]:
    directory.mkdir(exist_ok=True)

# Remove legacy temp dir if present
TEMP_DIR = BASE_DIR / "temp"
if TEMP_DIR.exists() and TEMP_DIR.is_dir():
    try:
        import shutil
        shutil.rmtree(TEMP_DIR)
    except Exception:
        pass

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
print("OpenAI API Key loaded:", "Yes" if OPENAI_API_KEY else "No")

# LLM model/token settings (for InvoiceEntityExtractor)
OPEN_AI_MODEL = os.getenv("OPEN_AI_MODEL", "gpt-4o-mini")
MAX_TOKEN_LIMIT = int(os.getenv("MAX_TOKEN_LIMIT", "4000"))

# Supported file types
SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg']

