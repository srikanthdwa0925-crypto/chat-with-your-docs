# REST API Reference — Chat With Your Docs

All API endpoints follow a uniform response envelope, standard HTTP status codes, and derive the authenticated user strictly from server-side Supabase session cookies.

---

## Response Envelope Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of error"
  }
}
```

---

## 1. Document Endpoints

### `POST /api/documents/upload`
Uploads a document to Supabase Storage and records its metadata in the database.
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: File (PDF, TXT, MD; max 25MB)
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f7a4b0-...",
      "user_id": "9b1deb4d-...",
      "filename": "Employee_Handbook.pdf",
      "original_filename": "Employee Handbook.pdf",
      "file_type": "application/pdf",
      "file_size": 245120,
      "storage_path": "9b1deb4d-.../c1f7a4b0-.../Employee_Handbook.pdf",
      "status": "UPLOADED",
      "error_message": null,
      "created_at": "2026-09-15T18:00:00.000Z"
    }
  }
  ```

### `POST /api/documents/:id/process`
Triggers page-aware text extraction, semantic chunking, embedding generation, and vector insertion into `document_chunks`.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "document": {
        "id": "c1f7a4b0-...",
        "status": "READY",
        "page_count": 5,
        "chunk_count": 18
      },
      "chunksProcessed": 18,
      "pagesProcessed": 5
    }
  }
  ```

### `GET /api/documents`
Lists documents belonging to the authenticated user with pagination.
- **Query Parameters**:
  - `page` (int, default: 1)
  - `limit` (int, default: 50)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "documents": [ ... ],
      "pagination": { "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
    }
  }
  ```

### `GET /api/documents/:id`
Retrieves single document metadata and processing status.

### `DELETE /api/documents/:id`
Cascades deletion: deletes chunks from `document_chunks`, deletes file from storage bucket, and deletes document row.

---

## 2. RAG Chat Endpoint

### `POST /api/chat`
Performs vector similarity search against the user's document chunks and streams the grounded answer from the LLM.
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
    "message": "What is the remote work policy?",
    "conversationId": "optional-uuid",
    "documentId": "optional-uuid-to-scope-search",
    "stream": true
  }
  ```
- **Response (Streaming SSE)**:
  - `data: {"type": "meta", "conversationId": "...", "sources": [...]}`
  - `data: {"type": "token", "content": "Employees "}`
  - `data: {"type": "token", "content": "can work remotely..."}`
  - `data: {"type": "done", "fullContent": "..."}`

---

## 3. Semantic Search Endpoint

### `POST /api/search`
Raw vector search endpoint returning top-K chunks without running LLM generation.
- **Body**:
  ```json
  {
    "query": "What are core collaboration hours?",
    "documentId": "optional-uuid",
    "topK": 5,
    "similarityThreshold": 0.2
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "query": "What are core collaboration hours?",
      "resultsCount": 3,
      "chunks": [
        {
          "id": "...",
          "document_id": "...",
          "document_name": "Handbook.pdf",
          "chunk_index": 2,
          "content": "Core collaboration hours are 10:00 AM to 3:00 PM Eastern Time.",
          "page_number": 1,
          "similarity": 0.884
        }
      ]
    }
  }
  ```

---

## 4. Conversation Endpoints

- `GET /api/conversations`: Returns all user conversations.
- `POST /api/conversations`: Creates a new conversation (`{ title?: string, documentId?: string }`).
- `GET /api/conversations/:id`: Returns conversation details and ordered message history.
- `DELETE /api/conversations/:id`: Deletes conversation and all contained messages.
