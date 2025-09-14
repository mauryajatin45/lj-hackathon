# TODO: Implement Audio and Video Deepfake Detection

## Completed Tasks
- [x] Extend AIService with processDocument and detectSpam methods
- [x] Add handleProcessDocument and handleDetectSpam to submissions.controller.js
- [x] Add routes for /process_document and /detect_spam in submissions.routes.js
- [x] Add detectDeepfakeAudio method to AIService
- [x] Add detectDeepfakeVideo method to AIService
- [x] Modify analyzeFile to handle audio and video files with deepfake detection
- [x] Update TODO.md with implementation tasks
- [x] Implement audio deepfake detection with 2-minute timeout
- [x] Frontend supports audio file selection and submission
- [x] Backend handles audio file uploads and analysis
- [x] SSE events properly handle audio analysis progress and results
- [x] Error handling for timeout shows "AI failed to analyze" after 2 minutes

## Remaining Tasks
- [ ] Test /process_document endpoint with Postman (form data: file_url, doc_title, doc_issuer, compact)
- [ ] Test /detect_spam endpoint with Postman (JSON: text, reference_id)
- [ ] Test audio file upload and deepfake detection
- [ ] Test video file upload and deepfake detection
- [ ] Verify SSE events are sent on completion (report_ready event)
- [ ] Check database saves Submission and Report correctly for audio and video files
- [ ] Ensure history in frontend displays new submissions properly
- [ ] Verify logging in history for all data
- [ ] Test 2-minute timeout handling for audio and video analysis
