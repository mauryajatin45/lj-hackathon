# Multi-Channel Digital Arrest & Fraud Scam Detection and Prevention

## Problem Statement

Digital arrest scams are a rapidly growing cybercrime trend where fraudsters impersonate law enforcement, government authorities, or financial institutions to coerce victims into making immediate payments or disclosing sensitive personal information. Scammers use psychological manipulation, spoofed caller IDs, AI-generated voices, deepfake videos, and fake documents to create a sense of urgency and fear. The victims are threatened with “digital arrest,” imprisonment, or legal consequences unless they comply.

These scams are increasingly sophisticated and difficult for the average user to detect. Fraudsters exploit multiple communication channels: SMS, email, voice calls, video calls, and social media—making detection even more challenging.

### Problem

Existing prevention methods are reactive, relying mainly on public awareness campaigns, media reporting, or user vigilance. These measures are insufficient against evolving tactics such as:

- Financial loss: Victims transfer large sums, sometimes their life savings.
- Erosion of trust: Legitimate government and banking communications lose credibility.
- Jurisdictional complexity: Transnational nature of scams makes prosecution difficult.
- AI-driven deception: Deepfake audio/video makes scams more believable, leaving victims with little chance of distinguishing real vs. fake interactions.

There is a critical need for a proactive, intelligent, and multi-channel system that can detect and flag potential digital arrest scams, including text, audio, and video fraud attempts. In real-time, empowering users with immediate alerts and protective measures.

### Challenge

Build a proof-of-concept Multi-Channel Digital Fraud Detection and Prevention System that can:

1. **Ingest and Analyze Communication Data**
   - Text-based Data: Simulated SMS, email, chat transcripts.
   - Voice-based Data: Caller ID, call metadata (duration, frequency), and speech-to-text transcripts for keyword spotting.
   - Video-based Data: Detect possible deepfake or manipulated content in video calls (e.g., AI-generated law enforcement officials).

2. **Detect Scam Patterns using AI/ML**
   - Apply NLP techniques for text analysis and classification (legitimate vs. scam).
   - Use keyword spotting & sentiment analysis to detect urgency, fear, and threats.
   - Apply deepfake/voice spoofing detection models to flag synthetic audio or video.
   - Perform sender/caller reputation analysis (e.g., suspicious email domains, spoofed phone numbers).
   - Build classification models that adapt and improve with user-reported suspicious communications.

3. **Real-Time Prevention & Alerts**
   - Trigger immediate, clear, and actionable alerts when potential scams are detected.
   - Provide protective advice (e.g., “Do not share OTP,” “Verify caller ID via official website,” “This video may be AI-generated, verify source”).
   - Enable call blocking, email filtering, or warning overlays in real-time.

4. **User-Friendly Interface**
   - A dashboard or mobile/web app that displays:
     - Detected scam attempts with explanations.
     - Highlighted keywords/phrases or deepfake indicators that triggered detection.
     - Educational resources on common scam tactics.
   - A manual reporting feature for users to submit suspicious communications and help improve the detection model.

### Requirements

- Data Simulation/Collection: Mock datasets for text, audio, and video communications (including both legitimate and fraudulent examples).
- AI/ML Models:
  - NLP models for scam text detection.
  - Speech-to-text + audio deepfake detection models.
  - Basic deepfake video detection techniques (e.g., blink rate, lip-sync mismatches, or pretrained classifiers).
- Alerting Mechanism: Instant user notifications with context and recommendations.
- UI/UX: A simple interface (web app, CLI tool, or mobile simulation) for displaying alerts and prevention tips.
- Explainability: Highlight risky patterns (phrases, audio markers, video inconsistencies) for user trust.
- Deployable Prototype: A single runnable solution with setup instructions.

---

## Project Overview

This project implements a comprehensive Multi-Channel Digital Fraud Detection and Prevention System designed to combat digital arrest scams and other sophisticated cybercrimes. The system provides real-time analysis of multiple communication channels including text messages, audio files, video content, and documents.

### Key Features

#### 🔍 Multi-Channel Analysis
- **Text Analysis**: SMS, email, and chat message scam detection using NLP and keyword spotting
- **Audio Deepfake Detection**: Advanced AI-powered analysis of voice recordings for synthetic audio detection
- **Video Deepfake Detection**: Real-time analysis of video content for manipulated or AI-generated media
- **Document Verification**: PDF and document authenticity checking

#### ⚡ Real-Time Processing
- **Instant Alerts**: Immediate notifications when suspicious content is detected
- **Live Updates**: Server-Sent Events (SSE) for real-time status updates
- **Progress Tracking**: Detailed analysis progress with estimated completion times

#### 🛡️ Security & Privacy
- **Secure File Storage**: AWS S3 integration with signed URLs for secure access
- **Authentication**: JWT-based user authentication and authorization
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Data Encryption**: Secure handling of sensitive information

#### 📊 User Dashboard
- **Interactive Interface**: Modern React-based web application
- **Analysis History**: Complete submission history with detailed reports
- **Risk Scoring**: Clear risk level indicators (Low/Medium/High)
- **Educational Resources**: Built-in scam awareness information

#### 🤖 AI/ML Integration
- **External ML Service**: Integration with specialized AI models for different content types
- **Adaptive Learning**: System improves with user feedback and reported scams
- **Explainable AI**: Detailed explanations of why content was flagged as suspicious

## Architecture

### Backend (Node.js/Express)
```
sentinel-backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API endpoints
│   ├── services/       # Business logic (AI, S3, SSE)
│   ├── middleware/     # Authentication, validation, rate limiting
│   ├── config/         # Environment and service configuration
│   └── utils/          # Helper functions
├── tests/              # Unit and integration tests
└── package.json
```

### Frontend (React/Vite)
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Main application pages
│   ├── api/           # API client functions
│   ├── context/       # React context providers
│   ├── styles/        # Global styles and themes
│   └── utils/         # Frontend utilities
├── public/            # Static assets
└── package.json
```

### AI/ML Service Integration
- **Text Analysis**: Spam detection and scam pattern recognition
- **Audio Analysis**: Deepfake voice detection (`df/detect_deepfake_audio`)
- **Video Analysis**: Deepfake video detection (`df/detect_deepfake_video`)
- **Document Analysis**: Authenticity verification and manipulation detection

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: AWS S3
- **Real-time**: Server-Sent Events (SSE)
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Pino HTTP logger

### Frontend
- **Framework**: React 18 with Vite
- **Routing**: React Router DOM
- **Styling**: Custom CSS with CSS variables
- **State Management**: React Context API
- **HTTP Client**: Fetch API with custom wrapper

### DevOps & Tools
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest (planned)
- **API Documentation**: OpenAPI/Swagger (planned)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

### Submissions
- `POST /api/submissions/text` - Submit text for analysis
- `POST /api/submissions/file` - Submit file (image/video/audio/document)
- `POST /api/submissions/process_document` - Process document with URL
- `POST /api/submissions/detect_spam` - Detect spam in text
- `GET /api/submissions` - Get user's submissions
- `GET /api/submissions/:id` - Get specific submission

### Real-time Updates
- `GET /api/sse/connect` - Establish SSE connection
- `POST /api/sse/disconnect` - Disconnect SSE

### Assets
- `GET /api/assets/*` - Serve static assets

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB
- AWS S3 account and bucket
- External AI/ML service endpoint
- Python 3.8+ (for ML service)

### Backend Setup

1. **Clone and navigate to backend directory:**
   ```bash
   git checkout maincode
   cd sentinel-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create `.env` file with required variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/sentinel
   JWT_SECRET=your-jwt-secret
   AWS_REGION=your-aws-region
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=your-bucket-name
   AI_BASE_URL=http://your-ai-service-url
   APP_BASE_URL=http://localhost:5000
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB:**
   ```bash
   mongod
   ```

5. **Run the backend server:**
   ```bash
   nodemon src/server.js
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start frontend development server:**
   ```bash
   npm run dev
   ```

### AI/ML Service Setup

1. **Switch to ML branch:**
   ```bash
   git checkout ml-code
   cd ai/ml
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the ML server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

Configure the external AI service endpoints:
- Text spam detection: `POST /detect_spam`
- Document processing: `POST /process_document`
- Audio deepfake detection: `POST /df/detect_deepfake_audio`
- Video deepfake detection: `POST /df/detect_deepfake_video`

## Usage

1. **Access the application** at `http://localhost:5173`
2. **Register/Login** to create an account
3. **Submit content** for analysis:
   - Click "Add / Check Something Suspicious"
   - Choose text submission or file upload
   - Select appropriate content type (SMS/Email, Image, Video, Document, Audio)
4. **Monitor real-time updates** in the dashboard
5. **View detailed reports** in the History section

## File Upload Limits

- **Images**: 10MB max
- **Videos**: 100MB max
- **Documents**: 25MB max
- **Audio**: 50MB max

## Supported File Types

- **Images**: PNG, JPG, JPEG, GIF, WebP
- **Videos**: MP4, MOV, AVI, WebM
- **Documents**: PDF, DOCX, DOC, TXT
- **Audio**: MP3, WAV, M4A, AAC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- [ ] Mobile application (React Native)
- [ ] Advanced AI model training with user feedback
- [ ] Integration with telecom providers for caller ID verification
- [ ] Browser extension for real-time web content analysis
- [ ] Multi-language support