import Message from '../models/Message.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import Transcript from '../models/Transcript.js';

// In-memory room tracking: meetingKey -> Map of socketId -> { socketId, user, audioEnabled, videoEnabled }
const roomParticipants = new Map();
// Socket ID -> metadata mapping
const socketMeta = new Map();

/**
 * Safely lookup a meeting by Mongo ObjectId or human-readable meetingCode
 */
const findMeetingByKeyOrId = async (idOrKey) => {
  if (!idOrKey) return null;
  const str = String(idOrKey).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    const byId = await Meeting.findById(str);
    if (byId) return byId;
  }
  return await Meeting.findOne({ meetingCode: str });
};

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
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

        // Resolve canonical room key (meetingCode if available, else meetingId)
        let canonicalKey = meetingId;
        const validMeeting = await findMeetingByKeyOrId(meetingId);

        if (validMeeting) {
          canonicalKey = validMeeting.meetingCode || validMeeting._id.toString();
          // Join both aliases so any broadcast reaches this client
          socket.join(`meeting:${validMeeting._id}`);
          if (validMeeting.meetingCode) {
            socket.join(`meeting:${validMeeting.meetingCode}`);
          }
        } else {
          socket.join(`meeting:${meetingId}`);
        }

        const roomId = `meeting:${canonicalKey}`;

        // Track in memory under canonical key
        if (!roomParticipants.has(canonicalKey)) {
          roomParticipants.set(canonicalKey, new Map());
        }

        const roomMap = roomParticipants.get(canonicalKey);
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
        socketMeta.set(socket.id, { meetingId: canonicalKey, user, actualMeetingId: validMeeting?._id });

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
          meeting: canonicalKey,
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
      const meta = socketMeta.get(socket.id);
      const key = meta?.meetingId || meetingId;
      const roomMap = roomParticipants.get(key);

      if (roomMap && roomMap.has(socket.id)) {
        const participant = roomMap.get(socket.id);
        if (audioEnabled !== undefined) participant.audioEnabled = audioEnabled;
        if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
        if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
      }

      socket.to(`meeting:${key}`).emit('media:status-update', {
        socketId: socket.id,
        audioEnabled,
        videoEnabled,
        isScreenSharing,
      });
    });

    /**
     * Live speech transcription chunk
     */
    socket.on('transcript:chunk', async ({ meetingId, speakerName, text }) => {
      if (!text || !text.trim()) return;
      const meta = socketMeta.get(socket.id);
      const key = meta?.meetingId || meetingId;
      const speaker = speakerName || meta?.user?.name || 'Speaker';

      const payload = {
        speakerName: speaker,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      io.to(`meeting:${key}`).emit('transcript:live', payload);

      // Persist real-time speech dialogue directly into MongoDB Transcript
      try {
        const validMeeting = (await findMeetingByKeyOrId(key)) || (await findMeetingByKeyOrId(meetingId));

        if (validMeeting) {
          if (`meeting:${validMeeting._id}` !== `meeting:${key}`) {
            io.to(`meeting:${validMeeting._id}`).emit('transcript:live', payload);
          }

          const newLine = `${speaker}: ${text.trim()}`;
          let doc = await Transcript.findOne({ meeting: validMeeting._id });
          if (doc) {
            doc.rawText = (doc.rawText ? doc.rawText + '\n' : '') + newLine;
            doc.segments.push({
              speaker,
              text: text.trim(),
              startTime: Date.now(),
              endTime: Date.now(),
            });
            await doc.save();
          } else {
            doc = await Transcript.create({
              meeting: validMeeting._id,
              rawText: newLine,
              source: 'live_captions',
              segments: [
                {
                  speaker,
                  text: text.trim(),
                  startTime: Date.now(),
                  endTime: Date.now(),
                },
              ],
            });
            validMeeting.transcript = doc._id;
            await validMeeting.save();
          }
        }
      } catch (err) {
        console.warn('[Socket transcript persistence error]:', err.message);
      }
    });

    /**
     * Real-time Chat message sent in meeting
     */
    socket.on('chat:send', async ({ meetingId, text, user }) => {
      try {
        if (!meetingId || !text || text.trim().length === 0) return;
        const meta = socketMeta.get(socket.id);
        const key = meta?.meetingId || meetingId;
        const senderName = user?.name || meta?.user?.name || 'Participant';

        let persistedMsg = null;
        const validMeeting = (await findMeetingByKeyOrId(key)) || (await findMeetingByKeyOrId(meetingId));

        if (validMeeting) {
          try {
            const isMongoId = Boolean(user?.id && /^[0-9a-fA-F]{24}$/.test(user.id));
            const newDoc = await Message.create({
              meeting: validMeeting._id,
              sender: isMongoId ? user.id : null,
              senderName,
              text: text.trim(),
              type: 'chat',
            });

            // Mirror in-meeting chat notes directly into Transcript for AI summary
            const chatLine = `${senderName}: ${text.trim()}`;
            let tDoc = await Transcript.findOne({ meeting: validMeeting._id });
            if (tDoc) {
              tDoc.rawText = (tDoc.rawText ? tDoc.rawText + '\n' : '') + chatLine;
              tDoc.segments.push({
                speaker: senderName,
                text: text.trim(),
                startTime: Date.now(),
                endTime: Date.now(),
              });
              await tDoc.save();
            } else {
              tDoc = await Transcript.create({
                meeting: validMeeting._id,
                rawText: chatLine,
                source: 'live_captions',
                segments: [
                  {
                    speaker: senderName,
                    text: text.trim(),
                    startTime: Date.now(),
                    endTime: Date.now(),
                  },
                ],
              });
              validMeeting.transcript = tDoc._id;
              await validMeeting.save();
            }

            if (isMongoId) {
              persistedMsg = await Message.findById(newDoc._id).populate(
                'sender',
                'name email avatar'
              );
            } else {
              persistedMsg = {
                _id: newDoc._id,
                meeting: validMeeting._id,
                sender: { name: senderName },
                senderName,
                text: text.trim(),
                type: 'chat',
                createdAt: newDoc.createdAt,
              };
            }
          } catch (e) {
            console.warn('[Message persistence notice]:', e.message);
          }
        }

        const outgoingMessage = persistedMsg || {
          _id: `temp-${Date.now()}`,
          meeting: validMeeting?._id || key,
          sender: user || { name: senderName },
          senderName,
          text: text.trim(),
          type: 'chat',
          createdAt: new Date().toISOString(),
        };

        io.to(`meeting:${key}`).emit('chat:message', outgoingMessage);
        if (validMeeting && validMeeting._id.toString() !== key) {
          io.to(`meeting:${validMeeting._id}`).emit('chat:message', outgoingMessage);
        }

        // Also persist in-meeting chat discussion directly into Transcript for AI summary
        if (validMeeting && text.trim()) {
          try {
            const chatLine = `${senderName}: ${text.trim()}`;
            let doc = await Transcript.findOne({ meeting: validMeeting._id });
            if (doc) {
              doc.rawText = (doc.rawText ? doc.rawText + '\n' : '') + chatLine;
              doc.segments.push({
                speaker: senderName,
                text: text.trim(),
                startTime: Date.now(),
                endTime: Date.now(),
              });
              await doc.save();
            } else {
              doc = await Transcript.create({
                meeting: validMeeting._id,
                rawText: chatLine,
                source: 'live_captions',
                segments: [
                  {
                    speaker: senderName,
                    text: text.trim(),
                    startTime: Date.now(),
                    endTime: Date.now(),
                  },
                ],
              });
              validMeeting.transcript = doc._id;
              await validMeeting.save();
            }
          } catch (e) {
            // ignore
          }
        }
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
    const meta = socketMeta.get(socket.id);
    const key = meta?.meetingId || meetingId;
    const roomId = `meeting:${key}`;
    socket.leave(roomId);

    const roomMap = roomParticipants.get(key);
    if (roomMap && roomMap.has(socket.id)) {
      const participant = roomMap.get(socket.id);
      roomMap.delete(socket.id);

      if (roomMap.size === 0) {
        roomParticipants.delete(key);
      }

      socket.to(roomId).emit('meeting:user-left', {
        socketId: socket.id,
        user: participant.user,
      });

      const systemMessage = {
        _id: `sys-${Date.now()}`,
        meeting: key,
        sender: { name: 'System', avatar: '' },
        text: `${participant.user?.name || 'A participant'} left the meeting`,
        type: 'system',
        createdAt: new Date().toISOString(),
      };
      socket.to(roomId).emit('chat:message', systemMessage);
    }
  };
};
