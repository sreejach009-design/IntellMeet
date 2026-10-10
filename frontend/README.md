# IntellMeet Frontend

The client single-page application for **IntellMeet — AI-Powered Enterprise Meeting & Collaboration Platform**, built with React 18, Vite, React Router 6, Tailwind CSS, Lucide Icons, Recharts, and Socket.io-client.

## Features
- **Landing Page**: Public hero showcase, feature matrix, enterprise security overview, FAQ, and fast onboarding.
- **Enterprise Dashboard**: Welcome banner, active conferencing stats, upcoming schedule, quick join with meeting code, action items overview, and workspace list.
- **WebRTC Conferencing Room**:
  - Full-mesh peer-to-peer audio and video transmission with Google STUN servers.
  - Video and audio mute/unmute track controls.
  - Screen sharing using `getDisplayMedia` and dynamic `replaceTrack` on peer connections.
  - Real-time in-meeting chat backed by Socket.io and persisted in MongoDB.
  - In-meeting participant list with host roles.
  - Real-time session timer and leave meeting handling.
  - Meeting intelligence extraction drawer with transcript submission and demo data injection.
- **Meeting Directory & Detail View**:
  - Upcoming, past, and active session filtering.
  - Meeting search and instant meeting creation.
  - Detailed AI summary, key discussion points, explicit decisions, and task tracker.
- **Workspaces**: Create team workspaces, invite members with roles (owner, manager, member), and associate meetings.
- **Action Items Kanban/Table**: Track pending, in-progress, and completed deliverables derived by AI or created manually.
- **User Profile**: Update profile details, change password, and customize notification preferences.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
