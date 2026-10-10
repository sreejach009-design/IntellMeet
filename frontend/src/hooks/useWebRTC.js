import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { rtcConfiguration, defaultMediaConstraints } from '../utils/webrtcConfig';

export const useWebRTC = (meetingId, currentUser) => {
  const { socket, connected } = useSocket();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [mediaError, setMediaError] = useState(null);

  const localStreamRef = useRef(null);
  const originalVideoTrackRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const candidatesQueueRef = useRef(new Map()); // socketId -> RTCIceCandidate[]

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      setConnectionStatus('requesting_media');
      setMediaError(null);

      // Check if mediaDevices exists in browser
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC MediaDevices API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(defaultMediaConstraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Keep reference to camera video track for screensharing revert
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        originalVideoTrackRef.current = videoTrack;
      }

      setConnectionStatus('ready');
      return stream;
    } catch (err) {
      console.warn('[WebRTC Media Warning]', err.name, err.message);
      // Fallback for cases where camera/mic are blocked or unavailable (e.g. headless or permission denied)
      setMediaError(`Media device access: ${err.message}. You can still participate via audio/chat or screen share.`);
      
      // Create a dummy / silent canvas media stream so signaling and peer connection still function
      const fallbackStream = createSilentStream();
      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      setIsVideoOff(true);
      setIsAudioMuted(true);
      setConnectionStatus('ready');
      return fallbackStream;
    }
  }, []);

  // Helper: creates fallback canvas/silent stream if camera permission is denied
  const createSilentStream = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const stream = canvas.captureStream ? canvas.captureStream(10) : new MediaStream();
    return stream;
  };

  /**
   * Create RTCPeerConnection for a target peer
   */
  const createPeerConnection = useCallback((targetSocketId, targetUser) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(rtcConfiguration);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote track received
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(targetSocketId, {
            socketId: targetSocketId,
            user: targetUser || { name: 'Participant' },
            stream: remoteStream,
            audioEnabled: true,
            videoEnabled: true,
          });
          return updated;
        });
      }
    };

    // Connection state logging
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(targetSocketId);
      }
    };

    peersRef.current.set(targetSocketId, pc);
    return pc;
  }, [socket]);

  /**
   * Cleanup peer connection on leave or failure
   */
  const cleanupPeer = useCallback((socketId) => {
    const pc = peersRef.current.get(socketId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        // ignore
      }
      peersRef.current.delete(socketId);
    }

    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(socketId);
      return updated;
    });

    setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  // Main setup: Join meeting & listen to signaling
  useEffect(() => {
    if (!meetingId || !currentUser || !socket || !connected) return;

    let isMounted = true;

    initializeMedia().then((stream) => {
      if (!isMounted) return;

      // Join the socket room for this meeting
      socket.emit('meeting:join', {
        meetingId,
        user: {
          id: currentUser.id || currentUser._id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
      });

      setParticipants([
        {
          socketId: socket.id,
          user: currentUser,
          isSelf: true,
          audioEnabled: !isAudioMuted,
          videoEnabled: !isVideoOff,
        },
      ]);
    });

    // 1. Existing room participants returned by server
    const handleRoomUsers = async ({ users }) => {
      if (!users || !Array.isArray(users)) return;

      setParticipants((prev) => {
        const self = prev.find((p) => p.isSelf);
        return self ? [self, ...users] : users;
      });

      // Initiate WebRTC offer to each existing peer
      for (const peerUser of users) {
        const targetSocketId = peerUser.socketId;
        const pc = createPeerConnection(targetSocketId, peerUser.user);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('webrtc:signal', {
            targetSocketId,
            signalData: offer,
            senderUser: currentUser,
          });
        } catch (err) {
          console.error('[WebRTC createOffer Error]', err);
        }
      }
    };

    // 2. New user joined notification
    const handleUserJoined = ({ socketId, user, audioEnabled, videoEnabled }) => {
      setParticipants((prev) => [
        ...prev.filter((p) => p.socketId !== socketId),
        { socketId, user, isSelf: false, audioEnabled, videoEnabled },
      ]);
    };

    // 3. WebRTC Signal received (Offer or Answer)
    const handleSignal = async ({ senderSocketId, signalData, senderUser }) => {
      let pc = peersRef.current.get(senderSocketId);

      if (!pc) {
        pc = createPeerConnection(senderSocketId, senderUser);
      }

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));

          // Apply any buffered ICE candidates
          const queued = candidatesQueueRef.current.get(senderSocketId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(cand);
          }
          candidatesQueueRef.current.delete(senderSocketId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc:signal', {
            targetSocketId: senderSocketId,
            signalData: answer,
            senderUser: currentUser,
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));

          // Apply any buffered ICE candidates
          const queued = candidatesQueueRef.current.get(senderSocketId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(cand);
          }
          candidatesQueueRef.current.delete(senderSocketId);
        }
      } catch (err) {
        console.error('[WebRTC handleSignal Error]', err);
      }
    };

    // 4. ICE candidate received
    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peersRef.current.get(senderSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC addIceCandidate Error]', err);
        }
      } else {
        // Queue candidates until remote description is set
        if (!candidatesQueueRef.current.has(senderSocketId)) {
          candidatesQueueRef.current.set(senderSocketId, []);
        }
        candidatesQueueRef.current.get(senderSocketId).push(new RTCIceCandidate(candidate));
      }
    };

    // 5. Media status update from peers
    const handleMediaStatusUpdate = ({ socketId, audioEnabled, videoEnabled, isScreenSharing }) => {
      setRemoteStreams((prev) => {
        if (!prev.has(socketId)) return prev;
        const updated = new Map(prev);
        const data = updated.get(socketId);
        updated.set(socketId, {
          ...data,
          audioEnabled: audioEnabled !== undefined ? audioEnabled : data.audioEnabled,
          videoEnabled: videoEnabled !== undefined ? videoEnabled : data.videoEnabled,
          isScreenSharing: isScreenSharing !== undefined ? isScreenSharing : data.isScreenSharing,
        });
        return updated;
      });

      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId
            ? {
                ...p,
                audioEnabled: audioEnabled !== undefined ? audioEnabled : p.audioEnabled,
                videoEnabled: videoEnabled !== undefined ? videoEnabled : p.videoEnabled,
              }
            : p
        )
      );
    };

    // 6. User left notification
    const handleUserLeft = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    socket.on('meeting:room-users', handleRoomUsers);
    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('webrtc:signal', handleSignal);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('media:status-update', handleMediaStatusUpdate);
    socket.on('meeting:user-left', handleUserLeft);

    return () => {
      isMounted = false;
      // Clean up socket listeners
      socket.off('meeting:room-users', handleRoomUsers);
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('media:status-update', handleMediaStatusUpdate);
      socket.off('meeting:user-left', handleUserLeft);

      // Leave room
      socket.emit('meeting:leave', { meetingId });

      // Stop all local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Close all peer connections
      peersRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch (e) {
          // ignore
        }
      });
      peersRef.current.clear();
      candidatesQueueRef.current.clear();
    };
  }, [meetingId, currentUser, socket, connected, initializeMedia, createPeerConnection, cleanupPeer]);

  /**
   * Toggle Audio Mute
   */
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsAudioMuted(!nextState);

        if (socket) {
          socket.emit('media:status-update', {
            meetingId,
            audioEnabled: nextState,
          });
        }
      }
    }
  }, [meetingId, socket]);

  /**
   * Toggle Video On/Off
   */
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoOff(!nextState);

        if (socket) {
          socket.emit('media:status-update', {
            meetingId,
            videoEnabled: nextState,
          });
        }
      }
    }
  }, [meetingId, socket]);

  /**
   * Start Screen Sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported by your browser.');
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all active peer connections
      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack);
        }
      });

      // Update local preview
      const oldTracks = localStreamRef.current.getVideoTracks();
      localStreamRef.current.removeTrack(oldTracks[0]);
      localStreamRef.current.addTrack(screenVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsScreenSharing(true);

      if (socket) {
        socket.emit('media:status-update', {
          meetingId,
          isScreenSharing: true,
        });
      }

      // Handle user stopping share via browser native toolbar
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('[Screen Share Error]', err);
    }
  }, [meetingId, socket]);

  /**
   * Stop Screen Sharing and revert to camera
   */
  const stopScreenShare = useCallback(async () => {
    try {
      if (!originalVideoTrackRef.current) {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        originalVideoTrackRef.current = camStream.getVideoTracks()[0];
      }

      const camTrack = originalVideoTrackRef.current;

      peersRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(camTrack);
        }
      });

      const currentVideoTracks = localStreamRef.current.getVideoTracks();
      currentVideoTracks.forEach((t) => localStreamRef.current.removeTrack(t));
      localStreamRef.current.addTrack(camTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsScreenSharing(false);

      if (socket) {
        socket.emit('media:status-update', {
          meetingId,
          isScreenSharing: false,
        });
      }
    } catch (err) {
      console.error('[Stop Screen Share Error]', err);
    }
  }, [meetingId, socket]);

  return {
    localStream,
    remoteStreams: Array.from(remoteStreams.values()),
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    connectionStatus,
    mediaError,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
};
