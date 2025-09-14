# TODO: Implement Backend Endpoints for /process_document and /detect_spam

## Completed Tasks
- [x] Extend AIService with processDocument and detectSpam methods
- [x] Add handleProcessDocument and handleDetectSpam to submissions.controller.js
- [x] Add routes for /process_document and /detect_spam in submissions.routes.js
- [x] Update TODO.md with implementation tasks

## Remaining Tasks
- [ ] Test /process_document endpoint with Postman (form data: file_url, doc_title, doc_issuer, compact)
- [ ] Test /detect_spam endpoint with Postman (JSON: text, reference_id)
- [ ] Verify SSE events are sent on completion (report_ready event)
- [ ] Check database saves Submission and Report correctly
- [ ] Ensure history in frontend displays new submissions properly
- [ ] Verify logging in history for all data
