import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { meetingService } from '../services/meetingService';
import { aiService } from '../services/aiService';
import VideoGrid from '../components/meetings/VideoGrid';
import MeetingControls from '../components/meetings/MeetingControls';
import ParticipantList from '../components/meetings/ParticipantList';
import MeetingChat from '../components/meetings/MeetingChat';
import GenerateSummaryModal from '../components/ai/GenerateSummaryModal';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import {
  Copy,
  Check,
  Clock,
  Sparkles,
  Shield,
  AlertTriangle,
  UserPlus,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  Captions,
  Volume2,
  Edit3,
} from 'lucide-react';
import {
  formatTimer,
  getShareableMeetingLink,
  getTunnelMeetingLink,
  getWifiMeetingLink,
  getLocalMeetingLink,
} from '../utils/formatters';

const MeetingRoomPage = () => {
  const { id: meetingCodeOrId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Guest pre-join lobby state
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem('intellmeet_guest_name') || '';
  });
  const [hasJoined, setHasJoined] = useState(Boolean(user));
  const [activeUser, setActiveUser] = useState(() => {
    if (user) return user;
    const storedName = localStorage.getItem('intellmeet_guest_name');
    if (storedName) {
      return { id: 'guest-' + Date.now(), name: storedName, isGuest: true, role: 'attendee' };
    }
    return null;
  });

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingError, setMeetingError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [meetingSeconds, setMeetingSeconds] = useState(0);

  // Sync authenticated user into activeUser
  useEffect(() => {
    if (user) {
      setActiveUser(user);
      setHasJoined(true);
    }
  }, [user]);

  // Drawer states
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isMeetingEndedByHost, setIsMeetingEndedByHost] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Live Speech Recognition Transcript Accumulator
  const [liveCaptions, setLiveCaptions] = useState('');
  const [interimCaption, setInterimCaption] = useState('');
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [endModalTranscript, setEndModalTranscript] = useState('');
  const accumulatedTranscriptRef = useRef('');
  const recognitionRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const isRecognizingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isExplicitlyStoppedRef = useRef(false);
  const lastInterimRef = useRef('');

  // Stable refs for speech recognition to prevent restart loops
  const activeUserRef = useRef(activeUser);
  const socketRef = useRef(socket);
  const isAudioMutedRef = useRef(false);
  const meetingCodeOrIdRef = useRef(meetingCodeOrId);
  const hasJoinedRef = useRef(hasJoined);

  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { meetingCodeOrIdRef.current = meetingCodeOrId; }, [meetingCodeOrId]);
  useEffect(() => { hasJoinedRef.current = hasJoined; }, [hasJoined]);

  // Merge helper to deduplicate dialogue lines
  const mergeDialogueLines = (textA = '', textB = '') => {
    const linesA = (textA || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const linesB = (textB || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const seen = new Set(linesA);
    const result = [...linesA];
    for (const l of linesB) {
      if (!seen.has(l)) {
        seen.add(l);
        result.push(l);
      }
    }
    return result.join('\n');
  };

  // Sync transcript preview when end meeting modal opens (fetches latest server consolidated points)
  useEffect(() => {
    if (isEndModalOpen) {
      if (lastInterimRef.current && lastInterimRef.current.trim()) {
        const speaker = activeUserRef.current?.name || 'Participant';
        const line = `${speaker}: ${lastInterimRef.current.trim()}`;
        if (!accumulatedTranscriptRef.current.includes(line)) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
        }
        lastInterimRef.current = '';
      }
      setEndModalTranscript(accumulatedTranscriptRef.current);
      const targetId = meeting?._id || meetingCodeOrId;
      if (targetId) {
        aiService
          .getMeetingTranscript(targetId)
          .then((res) => {
            if (res?.success && res.transcriptText) {
              const merged = mergeDialogueLines(accumulatedTranscriptRef.current, res.transcriptText);
              accumulatedTranscriptRef.current = merged;
              setEndModalTranscript(merged);
            }
          })
          .catch((err) => {
            console.warn('[Fetch consolidated transcript notice]:', err);
          });
      }
    }
  }, [isEndModalOpen, meeting, meetingCodeOrId]);

  // Initialize WebRTC
  const {
    localStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    setMediaError,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    retryMedia,
  } = useWebRTC(meetingCodeOrId, activeUser);

  // Fetch meeting metadata
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        setMeetingError(null);
        const res = await meetingService.getMeetingById(meetingCodeOrId);
        if (res.success && res.meeting) {
          setMeeting(res.meeting);
          if (activeUser) {
            await meetingService.joinMeeting(res.meeting._id, {
              guestName: activeUser.name,
              name: activeUser.name,
            });
          }
        } else {
          setMeetingError(res.message || 'Meeting could not be found.');
        }
      } catch (err) {
        console.error('[Meeting fetch error]', err);
        setMeetingError(
          err.response?.data?.message ||
            'Unable to connect to this meeting. Please check the meeting code and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingCodeOrId, activeUser]);

  // Handle user joining as guest from pre-join lobby
  const handleGuestJoin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const guestObj = {
      id: 'guest-' + Date.now(),
      name: guestName.trim(),
      isGuest: true,
      role: 'attendee',
    };
    localStorage.setItem('intellmeet_guest_name', guestName.trim());
    setActiveUser(guestObj);
    setHasJoined(true);

    if (meeting?._id) {
      await meetingService.joinMeeting(meeting._id, {
        guestName: guestName.trim(),
        name: guestName.trim(),
      });
    }
  };

  // Meeting Timer tick
  useEffect(() => {
    if (!hasJoined) return;
    const timer = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasJoined]);

  // Synchronize audio muted state into ref
  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  // Audio level meter & voice activity detection using Web Audio API on localStream
  const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);
  const [isSpeakingDetected, setIsSpeakingDetected] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const audioTrack = localStream?.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled || isAudioMuted) {
      setAudioVolumeLevel(0);
      setIsSpeakingDetected(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const sourceStream = new MediaStream([audioTrack]);
      const sourceNode = audioCtx.createMediaStreamSource(sourceStream);
      sourceNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let activeCount = 0;

      const checkLevel = () => {
        if (!isMountedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioVolumeLevel(normalized);

        if (normalized > 12) {
          activeCount++;
          setIsSpeakingDetected(true);
        } else {
          activeCount = Math.max(0, activeCount - 1);
          if (activeCount === 0) {
            setIsSpeakingDetected(false);
          }
        }

        animFrameRef.current = requestAnimationFrame(checkLevel);
      };

      animFrameRef.current = requestAnimationFrame(checkLevel);
    } catch (e) {
      console.warn('[Audio meter setup note]:', e);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
        audioContextRef.current = null;
      }
    };
  }, [localStream, isAudioMuted]);

  // Robust speech recognition activation function callable directly or via lifecycle
  const startSpeechRecognition = useCallback(() => {
    isMountedRef.current = true;
    isExplicitlyStoppedRef.current = false;

    // Guard against duplicate concurrent start calls
    if (isStartingRef.current || isRecognizingRef.current) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.info('[Speech Recognition] Web Speech API not supported in this browser environment.');
      setIsSpeechRecognitionActive(false);
      setSpeechError('Speech recognition is not supported in this browser. Please use Google Chrome or Edge, or type discussion points in chat.');
      return;
    }

    isStartingRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        isStartingRef.current = false;
        isRecognizingRef.current = true;
        setIsSpeechRecognitionActive(true);
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const trimmed = transcript.trim();
            if (trimmed) {
              const speaker = activeUserRef.current?.name || 'Participant';
              const line = `${speaker}: ${trimmed}`;
              accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
              setLiveCaptions(line);
              setInterimCaption('');
              lastInterimRef.current = '';

              // Broadcast live transcript chunk via socket to all peers and server
              if (socketRef.current) {
                socketRef.current.emit('transcript:chunk', {
                  meetingId: meetingCodeOrIdRef.current,
                  speakerName: speaker,
                  text: trimmed,
                });
              }
            }
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          lastInterimRef.current = interim;
          setInterimCaption(`${activeUserRef.current?.name || 'You'}: ${interim}`);
        }
      };

      recognition.onerror = (err) => {
        isStartingRef.current = false;
        if (err.error === 'no-speech') {
          // Chrome fires no-speech during pauses; let onend restart cleanly
          return;
        }
        if (err.error === 'aborted') {
          return;
        }
        console.warn('[Speech Recognition error]:', err.error);
        if (err.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked for speech recognition. Click the camera icon in browser address bar to allow.');
          setIsSpeechRecognitionActive(false);
        } else if (err.error === 'audio-capture') {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && !isAudioMutedRef.current && !isExplicitlyStoppedRef.current) {
              startSpeechRecognition();
            }
          }, 800);
        } else if (err.error === 'network') {
          setSpeechError('Google speech recognition network error. Click Captions in controls to retry or use in-meeting chat notes.');
          setIsSpeechRecognitionActive(false);
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isRecognizingRef.current = false;

        // If there is any uncommitted interim text, flush it now
        if (lastInterimRef.current && lastInterimRef.current.trim().length > 0) {
          const speaker = activeUserRef.current?.name || 'Participant';
          const line = `${speaker}: ${lastInterimRef.current.trim()}`;
          if (!accumulatedTranscriptRef.current.includes(line)) {
            accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
            setLiveCaptions(line);
            if (socketRef.current) {
              socketRef.current.emit('transcript:chunk', {
                meetingId: meetingCodeOrIdRef.current,
                speakerName: speaker,
                text: lastInterimRef.current.trim(),
              });
            }
          }
          lastInterimRef.current = '';
        }

        // Auto-restart with debounce by calling startSpeechRecognition() for a fresh instance
        if (
          isMountedRef.current &&
          !isAudioMutedRef.current &&
          hasJoinedRef.current &&
          !isExplicitlyStoppedRef.current
        ) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              !isAudioMutedRef.current &&
              !isExplicitlyStoppedRef.current
            ) {
              startSpeechRecognition();
            }
          }, 300);
        } else {
          setIsSpeechRecognitionActive(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      isRecognizingRef.current = false;
      console.warn('[Speech Recognition init failed]', err.message);
      setIsSpeechRecognitionActive(false);
    }
  }, []);

  // Explicit stop
  const stopSpeechRecognition = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    isStartingRef.current = false;
    isRecognizingRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort ? recognitionRef.current.abort() : recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsSpeechRecognitionActive(false);
    setInterimCaption('');
  }, []);

  // User-facing toggle for Speech Recognition
  const toggleSpeechRecognition = useCallback(() => {
    if (isSpeechRecognitionActive || isRecognizingRef.current) {
      stopSpeechRecognition();
    } else {
      isExplicitlyStoppedRef.current = false;
      startSpeechRecognition();
    }
  }, [isSpeechRecognitionActive, startSpeechRecognition, stopSpeechRecognition]);

  // Web Speech API lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    if (!hasJoined || !activeUser) return;

    if (isAudioMuted) {
      stopSpeechRecognition();
      return;
    }

    startSpeechRecognition();

    return () => {
      isMountedRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort ? recognitionRef.current.abort() : recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [hasJoined, activeUser, isAudioMuted, startSpeechRecognition, stopSpeechRecognition]);

  // Listen for socket events: meeting:ended, transcript:live, and chat:message
  useEffect(() => {
    if (!socket) return;

    const handleMeetingEnded = () => {
      setIsMeetingEndedByHost(true);
    };

    const handleLiveTranscript = ({ speakerName, text }) => {
      setLiveCaptions(`${speakerName}: ${text}`);
      const line = `${speakerName}: ${text}`;
      if (!accumulatedTranscriptRef.current.includes(line)) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
      }
    };

    const handleIncomingChatMessage = (msg) => {
      if (msg?.type !== 'system' && msg?.text) {
        const sender = msg.sender?.name || msg.senderName || 'Participant';
        const line = `${sender}: ${msg.text}`;
        if (!accumulatedTranscriptRef.current.includes(line)) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
        }
      }
    };

    socket.on('meeting:ended', handleMeetingEnded);
    socket.on('transcript:live', handleLiveTranscript);
    socket.on('chat:message', handleIncomingChatMessage);

    return () => {
      socket.off('meeting:ended', handleMeetingEnded);
      socket.off('transcript:live', handleLiveTranscript);
      socket.off('chat:message', handleIncomingChatMessage);
    };
  }, [socket]);

  const handleCopyLink = () => {
    const url = getShareableMeetingLink(meeting?.meetingCode || meetingCodeOrId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Host ends meeting for all and automatically triggers AI intelligence
  const handleEndMeetingForAll = async () => {
    try {
      if (lastInterimRef.current && lastInterimRef.current.trim()) {
        const speaker = activeUserRef.current?.name || 'Participant';
        const line = `${speaker}: ${lastInterimRef.current.trim()}`;
        if (!accumulatedTranscriptRef.current.includes(line)) {
          accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
        }
        lastInterimRef.current = '';
      }

      const textToSave = (endModalTranscript.trim() || accumulatedTranscriptRef.current.trim());
      if (meeting) {
        // 1. Submit accumulated / edited transcript if captured
        if (textToSave && textToSave.length > 5) {
          try {
            await aiService.submitTranscript(meeting._id, textToSave);
          } catch (e) {
            console.warn('[Transcript submission notice]', e);
          }
        }

        // 2. Mark meeting ended on backend (triggers backend auto-summarize with transcriptText)
        try {
          await meetingService.endMeeting(meeting._id, { transcriptText: textToSave });
        } catch (e) {
          console.warn('[End meeting notice]', e);
        }

        // 3. Immediately redirect to Meeting Summary & Intelligence page
        navigate(`/meetings/${meeting._id}`);
      } else {
        navigate('/meetings');
      }
    } catch (err) {
      console.warn(err);
      navigate(meeting?._id ? `/meetings/${meeting._id}` : '/meetings');
    }
  };

  const handleLeaveOnly = async () => {
    if (lastInterimRef.current && lastInterimRef.current.trim()) {
      const speaker = activeUserRef.current?.name || 'Participant';
      const line = `${speaker}: ${lastInterimRef.current.trim()}`;
      if (!accumulatedTranscriptRef.current.includes(line)) {
        accumulatedTranscriptRef.current += (accumulatedTranscriptRef.current ? '\n' : '') + line;
      }
      lastInterimRef.current = '';
    }

    const textToSave = (endModalTranscript.trim() || accumulatedTranscriptRef.current.trim());
    if (meeting?._id && textToSave && textToSave.length > 5) {
      try {
        await aiService.submitTranscript(meeting._id, textToSave);
      } catch (e) {
        console.warn('[Transcript submission on leave notice]', e);
      }
    }

    // When leaving a session, redirect to the meeting's summary page so the user sees results
    if (meeting?._id) {
      navigate(`/meetings/${meeting._id}`);
    } else if (meetingCodeOrId) {
      navigate(`/meetings/${meetingCodeOrId}`);
    } else {
      navigate(user ? '/dashboard' : '/');
    }
  };

  const isHost = Boolean(
    meeting &&
      activeUser &&
      (meeting.host?._id === activeUser.id ||
        meeting.host?._id === activeUser._id ||
        meeting.host === activeUser.id ||
        meeting.host === activeUser._id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Loader label="Connecting to secure WebRTC conference..." size="lg" />
      </div>
    );
  }

  if (meetingError) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Meeting Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{meetingError}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(user ? '/dashboard' : '/')}>
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-join lobby for unauthenticated users joining via link
  if (!hasJoined && !user) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white">Join Meeting</h1>
            <p className="text-xs text-slate-400">
              {meeting?.title || 'Video Conference Room'}
            </p>
            {meeting?.host?.name && (
              <span className="inline-block text-[11px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">
                Host: {meeting.host.name}
              </span>
            )}
          </div>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-lg shadow-indigo-600/30"
              icon={Video}
            >
              Join Meeting Now
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Have an account?{' '}
            <Link
              to="/login"
              state={{ from: { pathname: `/room/${meetingCodeOrId}` } }}
              className="text-indigo-400 font-semibold hover:text-indigo-300"
            >
              Sign in to sync your profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0b0f19] text-white flex flex-col z-50 overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[180px] sm:max-w-xs flex items-center gap-2">
            {meeting?.title || 'Video Conference'}
            {isHost && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold shrink-0">
                Host
              </span>
            )}
          </h2>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <span>{meeting?.meetingCode || meetingCodeOrId}</span>
            <button
              onClick={handleCopyLink}
              className="text-slate-400 hover:text-white p-0.5"
              title="Copy meeting link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Speech AI Status Indicator & Activation Button */}
          {isSpeakingDetected && isSpeechRecognitionActive ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs"
              title="Your microphone is actively speaking and capturing dialogue"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-none">
                Recording: {activeUser?.name?.split(' ')[0] || 'You'}
              </span>
            </div>
          ) : isSpeechRecognitionActive ? (
            <button
              onClick={toggleSpeechRecognition}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/35 text-indigo-300 text-xs font-medium cursor-pointer"
              title="Speech-to-Text active. Click to pause."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-none">
                AI Listening: {activeUser?.name?.split(' ')[0] || 'Active'}
              </span>
            </button>
          ) : isSpeakingDetected && !isAudioMuted ? (
            <button
              onClick={startSpeechRecognition}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-colors cursor-pointer animate-pulse"
              title="Voice detected! Click to enable speech recognition"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Voice Detected - Click to Record</span>
            </button>
          ) : isAudioMuted ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs">
              <MicOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Mic Muted</span>
            </div>
          ) : (
            <button
              onClick={startSpeechRecognition}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-colors cursor-pointer"
              title="Click to start live speech transcription for AI summary"
            >
              <Captions className="w-3.5 h-3.5 text-indigo-400" />
              <span>Turn On Captions</span>
            </button>
          )}

          {/* Share Meeting Link Pill */}
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium transition-colors"
            title="Share meeting link"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          {/* Duration Timer */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTimer(meetingSeconds)}</span>
          </div>

          {/* Quick AI Summary button */}
          <button
            onClick={() => setIsAIModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">AI Intelligence</span>
          </button>
        </div>
      </header>

      {/* Copy link confirmation toast banner */}
      {copiedLink && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 text-center font-medium animate-in slide-in-from-top-2 duration-200">
          Meeting link copied to clipboard! Share it with attendees to join directly.
        </div>
      )}

      {/* Speech Error Banner if mic permission was denied */}
      {speechError && (
        <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-amber-400 hover:text-white text-[11px] font-semibold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Media Device Notice / Fallback Warning if mic/camera access blocked */}
      {mediaError && (
        <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{mediaError}</span>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              onClick={retryMedia}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition-colors shadow-sm"
            >
              Retry / Grant Access
            </button>
            <button
              onClick={() => setMediaError(null)}
              className="text-amber-300 hover:text-white text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Live closed caption preview if speech active or interim words detected */}
      {(interimCaption || liveCaptions) && (
        <div className="bg-slate-900/95 border-b border-indigo-500/30 px-4 py-1.5 text-xs text-indigo-200 flex items-center justify-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate max-w-2xl font-mono">
            {interimCaption ? (
              <span className="text-slate-300 italic">{interimCaption}</span>
            ) : (
              <span className="text-indigo-200">{liveCaptions}</span>
            )}
          </span>
        </div>
      )}

      {/* Host waiting for participants banner with instant copy link */}
      {isHost && participants.length <= 1 && (
        <div className="bg-indigo-950/60 border-b border-indigo-500/30 px-4 py-2 text-xs text-indigo-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <UserPlus className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Share this link for others to join:</span>
            <span className="font-mono text-white bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30 truncate max-w-xs sm:max-w-md">
              {getShareableMeetingLink(meeting?.meetingCode || meetingCodeOrId)}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 shadow-sm transition-colors shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      )}

      {/* Main Video View & Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Container */}
        <div className="flex-1 h-full p-2 sm:p-4 overflow-y-auto flex items-center justify-center">
          <VideoGrid
            localStream={localStream}
            currentUser={activeUser}
            remoteStreams={remoteStreams}
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            hostUserId={meeting?.host?._id || meeting?.host}
          />
        </div>

        {/* Side Panel: Participants Drawer */}
        <ParticipantList
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          participants={participants}
          currentUser={activeUser}
          hostUserId={meeting?.host?._id || meeting?.host}
        />

        {/* Side Panel: In-Meeting Chat Drawer */}
        <MeetingChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          meetingId={meeting?._id || meetingCodeOrId}
          currentUser={activeUser}
        />
      </div>

      {/* Bottom Meeting Controls */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isSpeechActive={isSpeechRecognitionActive}
        isSpeaking={isSpeakingDetected}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleSpeech={toggleSpeechRecognition}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleAI={() => setIsAIModalOpen(true)}
        onLeaveMeeting={() => setIsEndModalOpen(true)}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
        isAIOpen={isAIModalOpen}
        unreadChatCount={unreadChatCount}
      />

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Share Meeting Link"
        subtitle="Invite colleagues or external guests to join this live video session."
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Worldwide Secure Link (For Phones, Mobile Data & Any Device)
              </label>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30">
                Recommended
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getShareableMeetingLink(meeting?.meetingCode || meetingCodeOrId)}
                className="w-full bg-[#151d30] border border-emerald-500/40 rounded-xl px-4 py-2.5 text-xs text-emerald-300 font-mono select-all"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    getShareableMeetingLink(meeting?.meetingCode || meetingCodeOrId)
                  );
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                icon={copiedLink ? Check : Copy}
              >
                {copiedLink ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Works anywhere on mobile browsers with camera & microphone enabled via secure HTTPS.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Local Link (Only for tabs on THIS computer)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getLocalMeetingLink(meeting?.meetingCode || meetingCodeOrId)}
                className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono select-all"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    getLocalMeetingLink(meeting?.meetingCode || meetingCodeOrId)
                  );
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                icon={Copy}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-white flex items-center justify-between">
              <span>Meeting Code:</span>
              <span className="font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                {meeting?.meetingCode || meetingCodeOrId}
              </span>
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              &bull; <strong>Why did other devices show &quot;site can&apos;t be reached&quot;?</strong> &quot;localhost&quot; only exists on your own laptop. For other phones or friends, always share the <strong>Worldwide Secure Link</strong> above!
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              &bull; No account is needed for guests &mdash; they can join with just their name from any mobile browser.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* End / Leave Meeting Modal */}
      <Modal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        title={isHost ? 'Conclude Meeting & Generate Summary' : 'Leave Meeting'}
        subtitle={
          isHost
            ? 'Review the discussion recorded during this session before generating the AI summary.'
            : 'Are you sure you want to leave this session?'
        }
      >
        <div className="space-y-4 pt-2">
          {/* Spoken Discussion Review & Edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Discussion Recorded For AI Summary</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {endModalTranscript.trim()
                  ? `${endModalTranscript.split('\n').filter(Boolean).length} points recorded`
                  : 'No speech recorded yet'}
              </span>
            </div>

            {!endModalTranscript.trim() && (
              <div className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex flex-col gap-1.5">
                <p>
                  Microphone didn't record spoken words during the call? You can type what you discussed below or insert quick discussion notes so the AI creates your summary.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const sampleText = `${activeUser?.name || 'Host'}: We discussed our core deliverables, reviewed the roadmap milestones, and finalized the upcoming release schedule.\nTeam: Agreed on next sprint priorities and delegated cross-functional testing.\n${activeUser?.name || 'Host'}: Ensure all deployment checks and documentation updates are completed.`;
                      setEndModalTranscript(sampleText);
                      accumulatedTranscriptRef.current = sampleText;
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-colors"
                  >
                    + Insert Discussion Template
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={endModalTranscript}
              onChange={(e) => {
                setEndModalTranscript(e.target.value);
                accumulatedTranscriptRef.current = e.target.value;
              }}
              placeholder="Spoken words are automatically captured here. You can also type key points discussed (e.g. 'Sarah: We agreed to launch next Monday. Alex: I will complete the security audit.')..."
              className="w-full h-28 bg-[#151d30] border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The AI will extract decisions and action items directly from the points above.
            </p>
          </div>

          {isHost ? (
            <div className="space-y-3 pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={handleEndMeetingForAll}
                className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                icon={Sparkles}
              >
                End Meeting for All & View AI Summary
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleLeaveOnly}
                className="w-full justify-center text-slate-300"
              >
                Leave Room (Keep Session Open)
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={handleLeaveOnly}
                className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                icon={Sparkles}
              >
                Leave & View Meeting Summary
              </Button>
            </div>
          )}

          <div className="flex justify-center pt-1">
            <button
              onClick={() => setIsEndModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel and return to session
            </button>
          </div>
        </div>
      </Modal>

      {/* Notice when host ends the meeting */}
      <Modal
        isOpen={isMeetingEndedByHost}
        onClose={() => navigate(meeting?._id ? `/meetings/${meeting._id}` : '/dashboard')}
        title="Meeting Concluded"
        subtitle="The host has ended this meeting session."
      >
        <div className="space-y-4 pt-2 text-center">
          <p className="text-xs text-slate-300">
            The session has concluded. You can now review the meeting intelligence, discussion topics, and action items.
          </p>
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center"
            onClick={() => navigate(meeting?._id ? `/meetings/${meeting._id}` : '/dashboard')}
            icon={Sparkles}
          >
            View Meeting Summary & Action Items
          </Button>
        </div>
      </Modal>

      {/* In-Meeting AI Extraction Modal */}
      <GenerateSummaryModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        meetingId={meeting?._id || meetingCodeOrId}
        initialTranscript={accumulatedTranscriptRef.current}
        onSuccess={() => {
          setIsAIModalOpen(false);
          if (meeting?._id) {
            navigate(`/meetings/${meeting._id}`);
          }
        }}
      />
    </div>
  );
};

export default MeetingRoomPage;
