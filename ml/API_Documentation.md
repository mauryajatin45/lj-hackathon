# ML Inference API Documentation

This document provides example inputs and responses for the available API endpoints (except the deepfake endpoint).

---

## 1. Process Document

**Endpoint:** `POST /process_document`

**Description:**  
Processes a document from a given URL, performs OCR and verification, and returns a compact or detailed verification result.

**Request Form Data:**

| Parameter   | Type    | Description                          | Default       |
|-------------|---------|------------------------------------|---------------|
| file_url    | string  | URL of the document to process      | (required)    |
| doc_title   | string  | Title of the document                | "Untitled Document" |
| doc_issuer  | string  | Issuer of the document (optional)  | None          |
| compact     | boolean | Return compact summary (true/false) | true          |

**Example Request:**

```
POST /process_document
Content-Type: application/x-www-form-urlencoded

file_url=https://example.com/sample.pdf&doc_title=Sample%20Document&compact=true
```

**Example Response:**

```json
{
  "confidence_score": 0.95,
  "legitimate": true
}
```

---

## 2. Process Batch

**Endpoint:** `POST /process_batch`

**Description:**  
Processes multiple uploaded documents in a batch and returns verification results for each.

**Request:**

- Multipart form-data with multiple files uploaded under the `files` field.
- Optional `compact` boolean form field (default: true).

**Example Request:**

Upload files `doc1.pdf` and `doc2.pdf` with `compact=true`.

**Example Response:**

```json
{
  "processed_count": 2,
  "successful_count": 2,
  "results": [
    {
      "filename": "doc1.pdf",
      "success": true,
      "result": {
        "confidence_score": 0.92,
        "legitimate": true
      }
    },
    {
      "filename": "doc2.pdf",
      "success": true,
      "result": {
        "confidence_score": 0.85,
        "legitimate": false
      }
    }
  ]
}
```

---

## 3. Detect Spam

**Endpoint:** `POST /detect_spam`

**Description:**  
Detects whether a given text is spam.

**Request JSON:**

```json
{
  "text": "Congratulations! You won a prize.",
  "reference_id": "12345"
}
```

**Example Response:**

```json
{
  "reference_id": "12345",
  "is_spam": true,
  "probability": 0.87
}
```

---

## 4. Download S3 File

**Endpoint:** `POST /download_s3`

**Description:**  
Downloads a file from S3 by key or URL and streams it back.

**Request JSON:**

```json
{
  "key_or_url": "https://s3.amazonaws.com/bucket/sample.pdf"
}
```

**Response:**  
Streams the file content with appropriate content-type headers.

---

## 5. Verify Document (Direct API)

**Endpoint:** `POST /verify/document`

**Description:**  
Directly verifies a document by sending base64 encoded pages and metadata.

**Request JSON:**

```json
{
  "INPUT_TYPE": "pdf",
  "PAGES": [
    {
      "pdf_bytes": "<base64_encoded_pdf_page>"
    }
  ],
  "DOC_META": {
    "title": "Sample Document",
    "issuer": "Sample Issuer"
  },
  "EXTERNAL_REFERENCES": {
    "domainReputation": "good"
  },
  "PARSING_HINTS": {
    "expected_fields": {
      "agreement_no": "AGR-\\d{5}",
      "effective_date": "\\d{2}-\\d{2}-\\d{4}"
    }
  }
}
```

**Example Response:**

```json
{
  "confidence_score": 0.93,
  "legitimate": true
}
```

---

# Notes

- All endpoints except `/predict` (deepfake) are documented here.
- The `compact` parameter controls whether the response is a minimal summary or detailed.
- For file uploads, use multipart form-data.
- For JSON requests, set `Content-Type: application/json`.
