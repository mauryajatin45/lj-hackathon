# API Routes Documentation

## Base URL
All routes are mounted under the `/api` prefix.

---

## Auth Routes (`/api/auth`)

- **POST /register**  
  Registers a new user.  
  Middleware: Rate limiting (`authLimiter`)  
  Request body validated with Zod schema.  
  Response: JWT token and user email.

- **POST /login**  
  Logs in a user.  
  Middleware: Rate limiting (`authLimiter`)  
  Request body validated with Zod schema.  
  Response: JWT token and user email.

- **GET /me**  
  Gets current authenticated user info.  
  Middleware: Authentication (`authMiddleware`)

---

## Submissions Routes (`/api/submissions`)

- **POST /text**  
  Submit text content for analysis.  
  Middleware: Authentication, rate limiting (`uploadLimiter`)  
  Validates submission data.  
  Emits SSE event on submission creation.  
  Dispatches to AI service for analysis.

- **POST /file**  
  Submit a file for analysis.  
  Middleware: Authentication, rate limiting (`uploadLimiter`)  
  Validates file upload with multer and Zod.  
  Uploads file to S3, dispatches to AI service.  
  Emits SSE event on submission creation.

- **GET /**  
  Get paginated list of submissions for the authenticated user.  
  Middleware: Authentication  
  Supports filtering by channel, date range, risk score, and query.

- **GET /:id**  
  Get details of a specific submission by ID.  
  Middleware: Authentication  
  Includes report and signed URLs for attachments.

---

## Assets Routes (`/api/assets`)

- **GET /:submissionId/:index/signed-url**  
  Get a signed URL for an attachment of a submission.  
  Middleware: Authentication  
  Validates submission and attachment index.

---

## SSE Routes (`/api/sse`)

- **GET /reports**  
  Establishes a Server-Sent Events connection for real-time report updates.  
  Middleware: Authentication, SSE middleware (`sseMiddleware`)

---

## Webhooks Routes (`/api/webhooks`)

- **POST /analysis**  
  Receives analysis webhook callbacks.  
  Middleware: Webhook signature verification (`verifyWebhookSignature`)  
  Updates submission status and emits SSE events based on webhook payload.

---

## Other Routes

- **GET /health**  
  Health check endpoint. Returns status and timestamp.

- **404 Handler**  
  Returns JSON error for unknown routes.

---

# Middleware Summary

- `authMiddleware`: Protects routes requiring authentication.
- `authLimiter` and `uploadLimiter`: Rate limiting for auth and upload routes.
- `validate`: Validates request bodies using Zod schemas.
- `webhookVerify`: Verifies webhook signatures.
- `sseMiddleware`: Handles SSE connection setup.

---

# Notes

- All routes return JSON responses.
- Error handling middleware is applied globally.
- SSE service manages real-time event delivery to clients.
