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

  // Helper: creates silent fallback video track
  const createSilentVideoTrack = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const stream = canvas.captureStream ? canvas.captureStream(1) : new MediaStream();
      const track = stream.getVideoTracks()[0];
      if (track) {
        track._isSilentFallback = true;
        track.enabled = false;
        return track;
      }
    } catch (e) {
      console.warn('[Silent video track creation error]', e);
    }
    return null;
  };

  // Helper: creates silent fallback audio track
  const createSilentAudioTrack = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      const track = dst.stream.getAudioTracks()[0];
      if (track) {
        track.enabled = false;
        track._isSilentFallback = true;
        return track;
      }
    } catch (e) {
      console.warn('[Silent audio track creation error]', e);
    }
    return null;
  };

  // Initialize local media stream with resilient separate fallback
  const initializeMedia = useCallback(async () => {
    try {
      setConnectionStatus('requesting_media');
      setMediaError(null);

      // Check if mediaDevices exists in browser (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          window.isSecureContext === false
            ? 'Camera and Microphone require a secure connection (HTTPS). Please access the meeting via the secure link.'
            : 'WebRTC MediaDevices API is not supported in this browser environment.'
        );
      }

      let audioTrack = null;
      let videoTrack = null;
      let audioErrMessage = null;
      let videoErrMessage = null;

      // 1. Try requesting both audio and video with standard constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia(defaultMediaConstraints);
        audioTrack = stream.getAudioTracks()[0] || null;
        videoTrack = stream.getVideoTracks()[0] || null;
      } catch (combinedErr) {
        console.warn('[WebRTC Combined Error, falling back to separate captures]:', combinedErr.name, combinedErr.message);

        // 2. Try audio separately
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          audioTrack = audioStream.getAudioTracks()[0] || null;
        } catch (aErr) {
          try {
            const basicAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioTrack = basicAudio.getAudioTracks()[0] || null;
          } catch (basicAErr) {
            console.warn('[WebRTC Audio Capture Failed]:', basicAErr.name, basicAErr.message);
            audioErrMessage = basicAErr.message;
          }
        }

        // 3. Try video separately
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
          });
          videoTrack = videoStream.getVideoTracks()[0] || null;
        } catch (vErr) {
          try {
            const basicVideo = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = basicVideo.getVideoTracks()[0] || null;
          } catch (basicVErr) {
            console.warn('[WebRTC Video Capture Failed]:', basicVErr.name, basicVErr.message);
            videoErrMessage = basicVErr.message;
          }
        }
      }

      // 4. Construct final local stream
      const finalStream = new MediaStream();

      if (audioTrack) {
        finalStream.addTrack(audioTrack);
        setIsAudioMuted(false);
      } else {
        const silentAudio = createSilentAudioTrack();
        if (silentAudio) finalStream.addTrack(silentAudio);
        setIsAudioMuted(true);
      }

      if (videoTrack) {
        finalStream.addTrack(videoTrack);
        originalVideoTrackRef.current = videoTrack;
        setIsVideoOff(false);
      } else {
        const silentVideo = createSilentVideoTrack();
        if (silentVideo) finalStream.addTrack(silentVideo);
        originalVideoTrackRef.current = silentVideo;
        setIsVideoOff(true);
      }

      localStreamRef.current = finalStream;
      setLocalStream(finalStream);

      // Informative user-facing banner if partial or total denial
      if (!audioTrack && !videoTrack) {
        setMediaError('Camera and microphone access could not be started. Check browser permissions or device connection, then click "Retry / Grant Access".');
      } else if (!audioTrack) {
        setMediaError(`Microphone unavailable (${audioErrMessage || 'access blocked'}). You can still participate via video and in-room chat.`);
      } else if (!videoTrack) {
        setMediaError(`Camera unavailable (${videoErrMessage || 'access blocked'}). Audio microphone is active.`);
      } else {
        setMediaError(null);
      }

      setConnectionStatus('ready');
      return finalStream;
    } catch (err) {
      console.warn('[WebRTC Media Warning]', err.name, err.message);
      setMediaError(err.message || 'Media access failed. Please grant camera/mic permissions and click Retry.');

      const fallbackStream = new MediaStream();
      const silentAudio = createSilentAudioTrack();
      const silentVideo = createSilentVideoTrack();
      if (silentAudio) fallbackStream.addTrack(silentAudio);
      if (silentVideo) fallbackStream.addTrack(silentVideo);

      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      setIsVideoOff(true);
      setIsAudioMuted(true);
      setConnectionStatus('ready');
      return fallbackStream;
    }
  }, []);

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
      let stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
      if (!stream) {
        stream = new MediaStream();
        if (event.track) stream.addTrack(event.track);
      }
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(targetSocketId);
        const mergedStream = existing?.stream || stream;
        if (event.track && !mergedStream.getTracks().includes(event.track)) {
          mergedStream.addTrack(event.track);
        }
        updated.set(targetSocketId, {
          socketId: targetSocketId,
          user: targetUser || existing?.user || { name: 'Participant' },
          stream: mergedStream,
          audioEnabled: existing ? existing.audioEnabled : true,
          videoEnabled: existing ? existing.videoEnabled : true,
        });
        return updated;
      });
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

  // 1. Initialize local media immediately on mount (independent of socket status)
  useEffect(() => {
    initializeMedia();

    return () => {
      // Stop local tracks only when the meeting room unmounts completely
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
    };
  }, [initializeMedia]);

  // 2. Main setup: Join meeting & listen to signaling
  useEffect(() => {
    if (!meetingId || !currentUser || !socket || !connected) return;

    let isMounted = true;

    // Join the socket room for this meeting
    socket.emit('meeting:join', {
      meetingId,
      user: {
        id: currentUser.id || currentUser._id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    });

    setParticipants((prev) => {
      const others = prev.filter((p) => !p.isSelf);
      return [
        {
          socketId: socket.id,
          user: currentUser,
          isSelf: true,
          audioEnabled: !isAudioMuted,
          videoEnabled: !isVideoOff,
        },
        ...others,
      ];
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
                isScreenSharing: isScreenSharing !== undefined ? isScreenSharing : p.isScreenSharing,
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
   * Toggle Audio Mute - toggles live track or requests microphone if not yet active
   */
  const toggleAudio = useCallback(async () => {
    try {
      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream();
      }

      const audioTracks = localStreamRef.current.getAudioTracks();
      const realTrack = audioTracks.find((t) => !t._isSilentFallback && t.readyState === 'live');

      if (realTrack) {
        // Toggle real track enabled
        const nextState = !realTrack.enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsAudioMuted(!nextState);

        if (socket && connected) {
          socket.emit('media:status-update', {
            meetingId,
            audioEnabled: nextState,
          });
        }
      } else {
        // No live real track: request microphone permission directly from user click!
        let newAudioTrack = null;
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          newAudioTrack = micStream.getAudioTracks()[0];
        } catch (e1) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            newAudioTrack = micStream.getAudioTracks()[0];
          } catch (micErr) {
            console.warn('[Microphone permission error]', micErr);
            setMediaError(`Microphone access blocked: ${micErr.message}. Check browser permissions or device settings.`);
            return;
          }
        }

        if (newAudioTrack) {
          // Remove previous silent/dead tracks
          audioTracks.forEach((t) => {
            try { t.stop(); } catch (e) {}
            localStreamRef.current.removeTrack(t);
          });

          localStreamRef.current.addTrack(newAudioTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsAudioMuted(false);
          setMediaError(null);

          // Replace on all connected peers
          peersRef.current.forEach((pc) => {
            try {
              const senders = pc.getSenders();
              const audioSender = senders.find((s) => (s.track && s.track.kind === 'audio') || s.kind === 'audio');
              if (audioSender) {
                audioSender.replaceTrack(newAudioTrack).catch((e) => console.warn('[replaceTrack audio]', e));
              } else {
                pc.addTrack(newAudioTrack, localStreamRef.current);
              }
            } catch (e) {
              console.warn('[Peer audio attach error]', e);
            }
          });

          if (socket && connected) {
            socket.emit('media:status-update', {
              meetingId,
              audioEnabled: true,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[toggleAudio error]', err);
    }
  }, [meetingId, socket, connected]);

  /**
   * Toggle Video On/Off - toggles live track or requests camera if not yet active
   */
  const toggleVideo = useCallback(async () => {
    try {
      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream();
      }

      const videoTracks = localStreamRef.current.getVideoTracks();
      const realTrack = videoTracks.find((t) => !t._isSilentFallback && t.readyState === 'live');

      if (realTrack) {
        // Toggle real video track enabled
        const nextState = !realTrack.enabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoOff(!nextState);

        if (socket && connected) {
          socket.emit('media:status-update', {
            meetingId,
            videoEnabled: nextState,
          });
        }
      } else {
        // No live real camera track: request camera permission directly from user click!
        let newVideoTrack = null;
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
          });
          newVideoTrack = camStream.getVideoTracks()[0];
        } catch (e1) {
          try {
            const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
            newVideoTrack = camStream.getVideoTracks()[0];
          } catch (camErr) {
            console.warn('[Camera permission error]', camErr);
            setMediaError(`Camera access blocked: ${camErr.message}. Check browser permissions or webcam connection.`);
            return;
          }
        }

        if (newVideoTrack) {
          originalVideoTrackRef.current = newVideoTrack;

          // Remove old silent/dead tracks
          videoTracks.forEach((t) => {
            try { t.stop(); } catch (e) {}
            localStreamRef.current.removeTrack(t);
          });

          localStreamRef.current.addTrack(newVideoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsVideoOff(false);
          setMediaError(null);

          // Replace on all connected peers
          peersRef.current.forEach((pc) => {
            try {
              const senders = pc.getSenders();
              const videoSender = senders.find((s) => (s.track && s.track.kind === 'video') || s.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(newVideoTrack).catch((e) => console.warn('[replaceTrack video]', e));
              } else {
                pc.addTrack(newVideoTrack, localStreamRef.current);
              }
            } catch (e) {
              console.warn('[Peer video attach error]', e);
            }
          });

          if (socket && connected) {
            socket.emit('media:status-update', {
              meetingId,
              videoEnabled: true,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[toggleVideo error]', err);
    }
  }, [meetingId, socket, connected]);

  /**
   * Stop Screen Sharing and revert to camera
   */
  const stopScreenShare = useCallback(async () => {
    try {
      if (!originalVideoTrackRef.current || originalVideoTrackRef.current.readyState === 'ended') {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia(defaultMediaConstraints);
          const newCamTrack = camStream.getVideoTracks()[0];
          if (newCamTrack) {
            originalVideoTrackRef.current = newCamTrack;
          }
        } catch (camErr) {
          console.warn('[Fallback camera track creation]:', camErr);
          const silent = createSilentVideoTrack();
          originalVideoTrackRef.current = silent;
        }
      }

      const camTrack = originalVideoTrackRef.current;

      peersRef.current.forEach((pc) => {
        try {
          const senders = pc.getSenders();
          let videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (!videoSender && pc.getTransceivers) {
            const videoTransceiver = pc.getTransceivers().find(
              (t) =>
                (t.sender && t.sender.track && t.sender.track.kind === 'video') ||
                (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')
            );
            if (videoTransceiver && videoTransceiver.sender) {
              videoSender = videoTransceiver.sender;
            }
          }

          if (videoSender && camTrack) {
            videoSender.replaceTrack(camTrack).catch((e) => console.warn('[replaceTrack error]:', e));
          }
        } catch (peerErr) {
          console.warn('[Peer revert error]:', peerErr);
        }
      });

      if (localStreamRef.current && camTrack) {
        const currentVideoTracks = localStreamRef.current.getVideoTracks();
        currentVideoTracks.forEach((t) => localStreamRef.current.removeTrack(t));
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
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

  // Keep a ref to stopScreenShare for track.onended
  const stopScreenShareRef = useRef(stopScreenShare);
  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

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
      if (!screenVideoTrack) {
        throw new Error('No video track found in screen capture.');
      }

      // Replace video track in all active peer connections
      peersRef.current.forEach((pc) => {
        try {
          const senders = pc.getSenders();
          let videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (!videoSender && pc.getTransceivers) {
            const videoTransceiver = pc.getTransceivers().find(
              (t) =>
                (t.sender && t.sender.track && t.sender.track.kind === 'video') ||
                (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')
            );
            if (videoTransceiver && videoTransceiver.sender) {
              videoSender = videoTransceiver.sender;
            }
          }

          if (videoSender) {
            videoSender.replaceTrack(screenVideoTrack).catch((e) => console.warn('[replaceTrack error]:', e));
          } else {
            try {
              pc.addTrack(screenVideoTrack, localStreamRef.current);
            } catch (addErr) {
              console.warn('[Add track error]:', addErr);
            }
          }
        } catch (peerErr) {
          console.warn('[Peer track replace error]:', peerErr);
        }
      });

      // Update local preview
      if (localStreamRef.current) {
        const oldTracks = localStreamRef.current.getVideoTracks();
        oldTracks.forEach((t) => localStreamRef.current.removeTrack(t));
        localStreamRef.current.addTrack(screenVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      setIsScreenSharing(true);
      setIsVideoOff(false);

      if (socket) {
        socket.emit('media:status-update', {
          meetingId,
          isScreenSharing: true,
        });
      }

      // Handle user stopping share via browser native toolbar
      screenVideoTrack.onended = () => {
        if (stopScreenShareRef.current) {
          stopScreenShareRef.current();
        }
      };
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.warn('[Screen Share Error]', err);
      }
    }
  }, [meetingId, socket]);

  /**
   * Re-request or refresh camera and microphone media
   */
  const retryMedia = useCallback(async () => {
    return await initializeMedia();
  }, [initializeMedia]);

  return {
    localStream,
    remoteStreams: Array.from(remoteStreams.values()),
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    connectionStatus,
    mediaError,
    setMediaError,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    retryMedia,
  };
};
