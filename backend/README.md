# IntellMeet Backend API

IntellMeet Backend provides high-performance RESTful APIs, WebRTC signaling, Socket.io real-time chat, and OpenAI-based meeting intelligence services.

## Prerequisites
- Node.js >= 18
- MongoDB running on `mongodb://127.0.0.1:27017`

## Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## REST API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & get JWT token
- `GET /api/auth/me` - Get current authenticated user
- `GET /api/users/profile` - User profile details
- `PUT /api/users/profile` - Update user profile & notification settings
- `PUT /api/users/change-password` - Change account password
- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create a workspace
- `GET /api/workspaces/:id` - Get workspace details & members
- `POST /api/workspaces/:id/members` - Add/invite member to workspace
- `GET /api/meetings` - List meetings (filterable by workspace/status)
- `POST /api/meetings` - Create an instant or scheduled meeting
- `GET /api/meetings/:id` - Get meeting details & access status
- `PUT /api/meetings/:id` - Edit meeting details
- `DELETE /api/meetings/:id` - Cancel meeting
- `GET /api/chat/:meetingId` - Retrieve persisted meeting chat history
- `POST /api/ai/transcribe` - Transcribe audio / process meeting transcript
- `POST /api/ai/summarize` - Generate executive summary, decisions, and action items via OpenAI
- `GET /api/ai/summary/:meetingId` - Get persisted meeting AI intelligence
- `GET /api/action-items` - List action items (filterable by workspace, status, assignee)
- `PATCH /api/action-items/:id/status` - Update action item completion status
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all notifications as read
