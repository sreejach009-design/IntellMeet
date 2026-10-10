import Message from '../models/Message.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';

// In-memory room tracking: meetingId -> Set of { socketId, user, audioEnabled, videoEnabled }
const roomParticipants = new Map();
// Socket ID -> metadata mapping
const socketMeta = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // console.log(`[Socket Connected] ID: ${socket.id}`);

    // Register user for personal notifications room
    socket.on('user:register', ({ userId }) => {
      if (userId) {
        socket.join(`user:${userId}`);
        socketMeta.set(socket.id, { ...socketMeta.get(socket.id), userId });
      }
    });

    /**
     * Join Meeting Room for WebRTC Signaling & Chat
     */
    socket.on('meeting:join', async ({ meetingId, user }) => {
      try {
        if (!meetingId || !user) return;

        const roomId = `meeting:${meetingId}`;
        socket.join(roomId);

        // Track in memory
        if (!roomParticipants.has(meetingId)) {
          roomParticipants.set(meetingId, new Map());
        }

        const roomMap = roomParticipants.get(meetingId);
        const participantData = {
          socketId: socket.id,
          user,
          audioEnabled: true,
          videoEnabled: true,
          isScreenSharing: false,
          joinedAt: new Date(),
        };

        // Existing participants to return to the newly joined peer
        const existingParticipants = Array.from(roomMap.values()).filter(
          (p) => p.socketId !== socket.id
        );

        roomMap.set(socket.id, participantData);
        socketMeta.set(socket.id, { meetingId, user });

        // Send existing peers to the newly joined peer so it can initiate peer connections
        socket.emit('meeting:room-users', {
          users: existingParticipants,
        });

        // Notify other room participants that a new user has joined
        socket.to(roomId).emit('meeting:user-joined', {
          socketId: socket.id,
          user,
          audioEnabled: true,
          videoEnabled: true,
        });

        // Broadcast a system chat notice
        const systemMessage = {
          _id: `sys-${Date.now()}`,
          meeting: meetingId,
          sender: { name: 'System', avatar: '' },
          text: `${user.name || 'A participant'} joined the meeting`,
          type: 'system',
          createdAt: new Date().toISOString(),
        };
        io.to(roomId).emit('chat:message', systemMessage);
      } catch (err) {
        console.error('[Socket meeting:join error]:', err.message);
      }
    });

    /**
     * WebRTC Signaling: SDP Offer / Answer Forwarding
     */
    socket.on('webrtc:signal', ({ targetSocketId, signalData, senderUser }) => {
      if (targetSocketId && signalData) {
        io.to(targetSocketId).emit('webrtc:signal', {
          senderSocketId: socket.id,
          signalData,
          senderUser,
        });
      }
    });

    /**
     * WebRTC ICE Candidate Forwarding
     */
    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      if (targetSocketId && candidate) {
        io.to(targetSocketId).emit('webrtc:ice-candidate', {
          senderSocketId: socket.id,
          candidate,
        });
      }
    });

    /**
     * Track status updates (Audio mute/unmute, Video toggle, Screen share)
     */
    socket.on('media:status-update', ({ meetingId, audioEnabled, videoEnabled, isScreenSharing }) => {
      const roomMap = roomParticipants.get(meetingId);
      if (roomMap && roomMap.has(socket.id)) {
        const participant = roomMap.get(socket.id);
        if (audioEnabled !== undefined) participant.audioEnabled = audioEnabled;
        if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
        if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
      }

      socket.to(`meeting:${meetingId}`).emit('media:status-update', {
        socketId: socket.id,
        audioEnabled,
        videoEnabled,
        isScreenSharing,
      });
    });

    /**
     * Real-time Chat message sent in meeting
     */
    socket.on('chat:send', async ({ meetingId, text, user }) => {
      try {
        if (!meetingId || !text || text.trim().length === 0) return;

        let persistedMsg = null;
        const validMeeting = await Meeting.findOne({
          $or: [
            { _id: meetingId.match(/^[0-9a-fA-F]{24}$/) ? meetingId : null },
            { meetingCode: meetingId },
          ],
        });

        if (validMeeting && user?.id) {
          const newDoc = await Message.create({
            meeting: validMeeting._id,
            sender: user.id,
            text: text.trim(),
            type: 'chat',
          });

          persistedMsg = await Message.findById(newDoc._id).populate(
            'sender',
            'name email avatar'
          );
        }

        const outgoingMessage = persistedMsg || {
          _id: `temp-${Date.now()}`,
          meeting: meetingId,
          sender: user || { name: 'Attendee' },
          text: text.trim(),
          type: 'chat',
          createdAt: new Date().toISOString(),
        };

        io.to(`meeting:${meetingId}`).emit('chat:message', outgoingMessage);
      } catch (err) {
        console.error('[Socket chat:send error]:', err.message);
      }
    });

    /**
     * Explicit Leave Meeting
     */
    socket.on('meeting:leave', ({ meetingId }) => {
      handleUserLeave(socket, meetingId);
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta && meta.meetingId) {
        handleUserLeave(socket, meta.meetingId);
      }
      socketMeta.delete(socket.id);
    });
  });

  const handleUserLeave = (socket, meetingId) => {
    const roomId = `meeting:${meetingId}`;
    socket.leave(roomId);

    const roomMap = roomParticipants.get(meetingId);
    if (roomMap && roomMap.has(socket.id)) {
      const participant = roomMap.get(socket.id);
      roomMap.delete(socket.id);

      if (roomMap.size === 0) {
        roomParticipants.delete(meetingId);
      }

      socket.to(roomId).emit('meeting:user-left', {
        socketId: socket.id,
        user: participant.user,
      });

      const systemMessage = {
        _id: `sys-${Date.now()}`,
        meeting: meetingId,
        sender: { name: 'System', avatar: '' },
        text: `${participant.user?.name || 'A participant'} left the meeting`,
        type: 'system',
        createdAt: new Date().toISOString(),
      };
      socket.to(roomId).emit('chat:message', systemMessage);
    }
  };
};
