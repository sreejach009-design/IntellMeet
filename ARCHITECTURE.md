# IntellMeet — Architecture & Technical Specifications

## 1. System Overview

IntellMeet is an AI-powered Enterprise Meeting and Collaboration Platform. The system is architected as a decoupled full-stack monorepo:

```
                            +-----------------------+
                            |     React Client      |
                            |  (Vite + Tailwind CSS)|
                            +-----------+-----------+
                                        |
                 +----------------------+----------------------+
                 | REST API (Axios)                            | WebSocket (Socket.io)
                 v                                             v
+-----------------------------------+       +------------------------------------+
|         Express REST API          |       |         Socket.io Gateway          |
|  - Auth & User Profile            |       |  - Meeting Signaling (WebRTC)      |
|  - Meeting Scheduling & Mgmt      |       |  - Real-time In-meeting Chat       |
|  - Workspaces & Permissions       |       |  - Instant Push Notifications      |
|  - Action Items & Status Kanban   |       |  - Participant Presence            |
|  - AI Meeting Intelligence Engine |       +------------------------------------+
+-----------------+-----------------+
                  |
         +--------+--------+
         |                 |
         v                 v
+-----------------+   +--------------------+
|     MongoDB     |   |   OpenAI Engine    |
| (Mongoose ODM)  |   | (GPT-4o / Whisper) |
+-----------------+   +--------------------+
```

---

## 2. Real-Time Video Architecture (WebRTC + Socket.io)

### Signaling Mechanism
WebRTC media connections require out-of-band signaling to exchange session descriptions (SDP offers/answers) and network routing paths (ICE candidates).
1. **Join Meeting**: Client connects to `/meeting` room over Socket.io.
2. **Peer Discovery**: Server notifies existing room participants of the new peer (`user-joined`).
3. **Offer / Answer Exchange**:
   - Initiating peer creates an `RTCPeerConnection`, adds local tracks, creates an SDP offer, and sends it via Socket.io `signal-send`.
   - Receiving peer sets remote description, adds local tracks, creates an SDP answer, and returns it.
4. **ICE Candidate Exchange**: Trickle ICE candidates are passed between peers via `ice-candidate` Socket.io events.
5. **Media Pipeline**: Direct peer-to-peer audio/video streaming via UDP/SRTP with Google Public STUN servers (`stun:stun.l.google.com:19302`).
6. **Track Management**: Dynamic mute/unmute of video/audio tracks without renegotiation; track replacement for screen sharing (`replaceTrack`).

---

## 3. Meeting Intelligence Engine (OpenAI Workflow)

```
[Meeting Audio / Transcript Input]
               │
               ▼
   [Validation & Normalization]
               │
               ▼
      [OpenAI Processing]
   ├── Whisper Audio-to-Text (when audio supplied)
   └── GPT Analysis (Strict JSON Schema Output)
               │
               ▼
   [Structured Result Extraction]
   ├── Executive Summary
   ├── Key Discussion Points
   ├── Explicit Decisions
   └── Structured Action Items (Assignee, Due Date, Status)
               │
               ▼
   [Atomic MongoDB Persistence]
   ├── Meeting.summary Ref
   ├── ActionItem Collection
   └── In-App Notifications dispatched to Assignees
```

---

## 4. Database Schema Design

- **User**: Name, email, hashed password, avatar, role, preferences, timestamps.
- **Workspace**: Name, description, owner (`User`), members `[{ user: User, role: 'owner'|'manager'|'member' }]`.
- **Meeting**: Title, description, host (`User`), workspace (`Workspace`), scheduledStart, scheduledEnd, actualStart, actualEnd, status (`scheduled`|`in-progress`|`completed`|`cancelled`), participants `[{ user, joinedAt, leftAt }]`, passCode, meetingId.
- **Message**: Meeting (`Meeting`), sender (`User`), text, type (`chat`|`system`), createdAt.
- **Transcript**: Meeting (`Meeting`), rawText, segments `[{ speaker, text, timestamp }]`, processed.
- **MeetingSummary**: Meeting (`Meeting`), executiveSummary, discussionPoints `[String]`, decisions `[String]`, modelUsed.
- **ActionItem**: Meeting (`Meeting`), workspace (`Workspace`), title, description, assignedTo (`User`), dueDate, status (`pending`|`in-progress`|`completed`), priority (`low`|`medium`|`high`).
- **Notification**: User (`User`), title, message, type (`meeting_invite`|`action_item_assigned`|`summary_ready`|`workspace_update`), isRead, link, createdAt.
