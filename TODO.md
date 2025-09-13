# TODO: Setup Backend Endpoints for Text and File Submissions

## Completed Tasks
- [x] Backend endpoints POST /api/submissions/text and POST /api/submissions/file are implemented
- [x] Authentication middleware (authMiddleware) applied to both endpoints
- [x] Rate limiting middleware (uploadLimiter) applied to both endpoints
- [x] Text submission validation with Zod schema (channel, content, sender, subject)
- [x] File submission validation with multer and Zod schema (file, type)
- [x] S3 upload for file submissions
- [x] AI service dispatch for both text and file submissions
- [x] SSE event emission on submission creation
- [x] Frontend API functions submitText and submitFile call correct endpoints
- [x] Frontend dialogs TextSubmitDialog and FileSubmitDialog collect data
- [x] Dashboard buttons open dialogs and handle submissions
- [x] Fixed frontend submitFile to not set explicit Content-Type header
- [x] Submission model includes sender, subject, and attachments fields
- [x] Controller saves sender and subject for text submissions
- [x] Controller uses type field for file submissions

## Postman Testing Instructions

### Setup
1. Start the backend server: `cd sentinel-backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Register/login to get JWT token
4. In Postman, set Authorization header: `Bearer <your-jwt-token>`

### Test Text Submission
- Method: POST
- URL: http://localhost:4000/api/submissions/text
- Headers: Content-Type: application/json
- Body (raw JSON):
```json
{
  "channel": "email",
  "content": "This is suspicious email content to analyze",
  "sender": "sender@example.com",
  "subject": "Urgent: Account Verification Required"
}
```

### Test File Submission
- Method: POST
- URL: http://localhost:4000/api/submissions/file
- Body: form-data
- Key: file (File) - select a file
- Key: type (Text) - enter "image", "video", "document", or "audio"

### Expected Responses
- Success: 201 Created with submissionId and status
- Validation Error: 400 Bad Request with error details
- Auth Error: 401 Unauthorized

## Remaining Tasks
- [ ] Test both endpoints with Postman
- [ ] Test frontend submission flows
- [ ] Verify SSE events are received in frontend
- [ ] Check AI service integration
