import json
from typing import Dict, Any
import config
from openai import OpenAI
from tiktoken import encoding_for_model


client = OpenAI(api_key=config.OPENAI_API_KEY)


class InvoiceEntityExtractor:
    """Wrapper for invoice data extraction using OpenAI models."""

    @staticmethod
    def extract_invoice_entities(invoice_text: str, category: str = None) -> Dict[str, Any]:
        """
        Extracts entities from invoice text and returns structured JSON.
        """

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an Expert invoice data extraction tool that extracts specific fields from invoice text and returns a dictionary. "
                    "Your response must strictly be a valid JSON dictionary with double-quoted keys and values. "
                    "Ensure that negative signs (-) are accurately captured when extracting numeric values. "
                    "If a requested field is not found, return \"\" for that field. "
                    "Do not include any extra characters, explanations, comments, or formatting beyond the dictionary itself."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"From the following invoice text {category}, extract and return only the requested data in dictionary format. "
                    f"If a field is not present, return null for that field. "
                    f"If extracted field is 0.00 or 0 then return 0.00 for that field. "
                    f"Ensure the response is strictly a dictionary. The invoice text is: {invoice_text}."
                ),
            },
        ]

        try:
            tokenizer = encoding_for_model(config.OPEN_AI_MODEL)
        except KeyError:
            raise ValueError(f"Tokenizer for {config.OPEN_AI_MODEL} is not available.")

        input_tokens = sum(len(tokenizer.encode(message["content"])) for message in messages)

        # Ensure we don’t exceed max token limit
        if config.MAX_TOKEN_LIMIT - input_tokens - 50 > 0:
            max_tokens = input_tokens + 50
        else:
            max_tokens = config.MAX_TOKEN_LIMIT

        response = client.chat.completions.create(
            model=config.OPEN_AI_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )

        content = response.choices[0].message.content

        try:
            return {"success": True, "extracted_data": json.loads(content)}
        except json.JSONDecodeError:
            return {"success": False, "error": "Failed to decode JSON response from OpenAI."}
