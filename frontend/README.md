# 🛡️ Sentinel - Suspicious Content Detection App

A production-ready React application for detecting and analyzing suspicious content including SMS, emails, images, videos, documents, and audio files.

## Features

### 🔐 Authentication
- Email/password registration and login
- Secure JWT token-based authentication
- Protected routes and session management

### 📊 Dashboard
- Submit text content (SMS/Email/Chat) for analysis
- Upload files (images, videos, documents, audio) for scanning
- Real-time updates via Server-Sent Events (SSE)
- Live analysis progress tracking
- Recent reports overview

### 📚 History
- Complete submission history with detailed reports
- Advanced filtering (channel, risk level, date range)
- Risk scoring and suspicious content flagging
- Timeline markers for audio/video segments
- File attachment management

### ⚙️ Settings
- Profile management
- Real-time updates toggle
- Theme preferences (Light/Dark coming soon)
- System information display

### 🔄 Real-time Updates
- Server-Sent Events for live analysis updates
- Auto-reconnection with exponential backoff
- Progress tracking and completion notifications
- Toast notifications for important events

## Technology Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Custom CSS with CSS Variables
- **Real-time**: Server-Sent Events (EventSource)
- **State Management**: React Context + Local State
- **Demo Mode**: Complete mock API for frontend testing

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## Demo Mode (Current Setup)

The application is **fully configured in demo mode** with comprehensive mock data for frontend testing. **No backend or real APIs are used.**

### Demo Credentials
- **Email**: `demo@example.com`
- **Password**: `password123`

### Mock Features
- ✅ Complete authentication flow
- ✅ Realistic submission data (8 sample submissions)
- ✅ Simulated SSE events with analysis progression
- ✅ File attachments with sample URLs
- ✅ Risk scoring and suspicious content detection
- ✅ Timeline markers for audio/video content
- ✅ Advanced filtering and search functionality

### Sample Data Includes
- **15+ Sample Submissions**: SMS, Email, Chat messages with various risk levels
- **Diverse File Types**: Images, videos, documents, audio files with sample URLs
- **Realistic Risk Analysis**: Scores from 0.02 (safe) to 0.94 (high risk)
- **Comprehensive Indicators**: URL detection, voice cloning, deepfakes, phishing, investment scams
- **Timeline Markers**: Timestamp ranges for suspicious segments in audio/video content
- **Complete History**: Full pagination and filtering with dummy data

## Environment Configuration

The `.env` file is configured for **100% demo mode** (no real APIs):

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SSE_URL=http://localhost:4000/api/sse/reports
VITE_MOCK=true
```

**Important**: All data is dummy/mock data. No real backend connection is made.

## Project Structure

```
src/
├── app/
│   ├── layouts/          # Layout components
│   └── pages/           # Page components
├── components/          # Reusable UI components
├── api/                # API client with mock data
├── context/            # React contexts
├── utils/              # Utility functions
└── styles/             # CSS styles
```

## Backend Integration (When Ready)

When your backend is implemented, simply change `VITE_MOCK=false` in the `.env` file. The app expects these endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Submissions
- `POST /api/submissions/text` - Submit text content
- `POST /api/submissions/file` - Upload file for analysis
- `GET /api/submissions` - List submissions with filtering
- `GET /api/submissions/:id` - Get submission details

### Real-time Updates
- `GET /api/sse/reports` - Server-Sent Events stream

## Features in Detail

### Content Analysis
- **Text Analysis**: SMS, emails, and chat messages
- **File Analysis**: Images, videos, documents, and audio
- **Risk Scoring**: 0-1 scale with Low/Medium/High categories
- **Reason Tracking**: Detailed explanation of risk factors
- **Timeline Markers**: Timestamp ranges for suspicious content in media

### Security & Accessibility
- WCAG AA compliant design
- High contrast ratios
- Keyboard navigation support
- Screen reader friendly
- Secure authentication flow
- Protected routes

### Responsive Design
- Mobile-first approach
- Collapsible sidebar on mobile
- Optimized touch interactions
- Responsive tables and forms

## Testing the Application

1. **Login**: Use `demo@example.com` / `password123`
2. **Submit Content**: Try both text and file submissions
3. **Watch Live Updates**: See real-time analysis progress
4. **Browse History**: Explore the 8 sample submissions with different risk levels
5. **View Details**: Click on any submission to see detailed analysis
6. **Filter Data**: Test the advanced filtering options
7. **Settings**: Check profile and preferences

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.