# IntellMeet — AI-Powered Enterprise Meeting & Collaboration Platform

> The platform provides real-time video conferencing, live chat, screen sharing, AI-generated meeting summaries, automatic transcription, smart action item extraction, and collaborative team workspaces within a secure and scalable environment. Built with technologies like React, Node.js, MongoDB, Socket.io, WebRTC, and OpenAI integration, IntellMeet delivers a production-grade experience with enterprise-level security, real-time performance, cloud scalability, and intelligent workflow automation, helping organizations transform meetings into actionable and efficient business outcomes.

---

## 1. Technology Stack

- **Frontend**: React 18, Vite, React Router 6, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose ODM
- **Authentication**: Stateless JSON Web Tokens (JWT) & bcrypt password hashing
- **Real-Time Communication**: Socket.io (Signaling, presence, chat & instant notifications)
- **Video & Audio**: WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`, STUN configuration)
- **AI Intelligence**: OpenAI API integration (GPT-4o-mini & Whisper) with deterministic heuristic fallback when an API key is not configured
- **Security**: Helmet HTTP headers, CORS origin enforcement, express-rate-limit protection

---

## 2. Monorepo Folder Structure

```
intellmeet/
  frontend/
    public/
      favicon.svg
      logo.svg
    src/
      assets/
      components/
        common/          # Button, Card, Badge, Modal, Loader, Toast, EmptyState, Navbar, Sidebar
        auth/            # LoginForm, RegisterForm, ProtectedRoute
        dashboard/       # MetricsOverview, UpcomingMeetingsCard, RecentMeetingsCard, ActionItemsOverview, WorkspaceListCard
        meetings/        # VideoGrid, VideoTile, MeetingControls, ParticipantList, MeetingChat, ScheduleMeetingModal
        chat/            # Chat components
        workspace/       # CreateWorkspaceModal, AddMemberModal
        ai/              # SummaryCard, TopicsCard, DecisionsCard, TranscriptViewer, GenerateSummaryModal
        actionItems/     # ActionItemTable, CreateActionItemModal
        notifications/   # NotificationDropdown
        profile/         # ProfileCard, PasswordChangeCard
      pages/             # LandingPage, LoginPage, RegisterPage, DashboardPage, MeetingsPage, MeetingRoomPage, MeetingDetailPage, WorkspacesPage, WorkspaceDetailPage, ActionItemsPage, ProfilePage, NotFoundPage
      layouts/           # AppLayout, AuthLayout
      routes/            # AppRoutes
      services/          # api (Axios interceptors), auth, meeting, workspace, chat, ai, actionItem, notification
      hooks/             # useWebRTC, useAuth, useSocket, useNotifications
      context/           # AuthContext, SocketContext, NotificationContext, ThemeContext
      store/             # State store
      types/             # JSDoc type definitions
      utils/             # formatters, webrtcConfig
      styles/            # index.css (Tailwind CSS layers & glassmorphism)
      App.jsx
      main.jsx
    package.json
    .env.example
    README.md

  backend/
    src/
      config/            # db.js (MongoDB Mongoose connection)
      controllers/       # auth, user, meeting, workspace, chat, ai, actionItem, notification
      routes/            # auth, user, meeting, workspace, chat, ai, actionItem, notification
      services/          # aiService (OpenAI / Whisper / Heuristics), notificationService
      models/            # User, Workspace, Meeting, Message, Transcript, MeetingSummary, ActionItem, Notification
      middleware/        # authMiddleware (JWT protect & RBAC), errorMiddleware, rateLimiter
      validators/        # authValidator, meetingValidator, workspaceValidator
      sockets/           # socketHandler (WebRTC signaling, chat broadcast, user room routing)
      utils/             # generateToken, logger
      app.js             # Express app setup, CORS, Helmet, rate limiting
      server.js          # HTTP & Socket.io server bootstrap
    tests/               # api.test.js (Jest & Supertest REST integration suite)
    package.json
    .env.example
    README.md

  .gitignore
  .env.example
  README.md
  ARCHITECTURE.md
```

---

## 3. Prerequisites

- **Node.js**: v18.x or newer (Tested on Node.js v24)
- **MongoDB**: Local MongoDB community edition running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI
- **OpenAI Account (Optional)**: To execute live LLM calls (`OPENAI_API_KEY`). If omitted, the platform gracefully switches to the built-in deterministic heuristic analysis engine.

---

## 4. Quick Start & Local Execution

### 1. Clone & Set Up Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend server runs on `http://localhost:5000`.
Health endpoint: `http://localhost:5000/api/health`

### 2. Set Up Frontend

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

The client application runs on `http://localhost:5173`.

---

## 5. WebRTC & STUN/TURN Configuration

IntellMeet configures Google Public STUN servers out of the box:
```javascript
export const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};
```

### Production WebRTC Scaling Notice:
- **STUN (Session Traversal Utilities for NAT)** allows peers behind symmetric or full-cone NATs to discover their public IP and port.
- **TURN (Traversal Using Relays around NAT)**: In production environments with strict corporate firewalls, symmetric NATs, or VPNs, direct peer-to-peer UDP may be blocked. A TURN relay server (such as Coturn, Twilio Network Traversal, or Xirsys) should be added to `iceServers` in `frontend/src/utils/webrtcConfig.js`.
- **SFU (Selective Forwarding Unit)**: The current architecture utilizes a full-mesh WebRTC topology, optimal for meetings up to 4–6 concurrent participants with zero media relay latency. For large conference rooms (10+ video participants), integrating an SFU media server (such as LiveKit, Mediasoup, or Janus) provides an optimal extension path to reduce client upstream bandwidth.

---

## 6. OpenAI Intelligence Integration

To enable OpenAI Whisper speech-to-text and GPT-4o-mini summarization:
1. Open `backend/.env`
2. Set your API key:
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
3. Restart the backend server.
4. When you click **Analyze Session** or submit a transcript, the system passes the meeting text to OpenAI using strict JSON Schema enforcement.
5. If the key is not set or OpenAI times out, the backend automatically invokes the built-in heuristic NLP engine, preventing crashes and allowing complete verification without paid third-party dependencies.

---

## 7. Running Tests

The test suite runs with Jest and Supertest, executing 9 automated integration tests across authentication, meetings, workspaces, AI summarization, and action items:

```bash
cd backend
npm test
```

Expected output:
```
PASS tests/api.test.js
  IntellMeet REST API Integration Test Suite
    √ POST /api/auth/register - Successfully register new user
    √ POST /api/auth/login - Successfully authenticate registered user
    √ GET /api/auth/me - Retrieve current authenticated profile
    √ GET /api/workspaces - Fetch user workspaces
    √ POST /api/meetings - Create instant or scheduled meeting
    √ GET /api/meetings/:id - Retrieve meeting details
    √ POST /api/ai/transcribe & /api/ai/summarize - Meeting intelligence pipeline
    √ GET /api/action-items - Fetch generated action items
    √ GET /api/meetings/stats/dashboard - Verify dashboard metrics

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

---

## 8. Deployment Instructions

### Deploying the Backend (e.g. Render, Railway, AWS ECS, DigitalOcean)
1. Set Environment Variables:
   - `PORT=5000`
   - `MONGODB_URI=<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET=<Strong random string>`
   - `CLIENT_URL=https://your-frontend-domain.com`
   - `OPENAI_API_KEY=<Optional>`
   - `NODE_ENV=production`
2. Start Command: `node src/server.js`

### Deploying the Frontend (e.g. Vercel, Netlify, Cloudflare Pages)
1. Set Build Command: `npm run build`
2. Set Output Directory: `dist`
3. Set Environment Variables:
   - `VITE_API_BASE_URL=https://your-backend-domain.com/api`
   - `VITE_SOCKET_URL=https://your-backend-domain.com`
