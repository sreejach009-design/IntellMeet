import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { meetingService } from '../services/meetingService';
import VideoGrid from '../components/meetings/VideoGrid';
import MeetingControls from '../components/meetings/MeetingControls';
import ParticipantList from '../components/meetings/ParticipantList';
import MeetingChat from '../components/meetings/MeetingChat';
import GenerateSummaryModal from '../components/ai/GenerateSummaryModal';
import Loader from '../components/common/Loader';
import {
  Copy,
  Check,
  Clock,
  Sparkles,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { formatTimer } from '../utils/formatters';

const MeetingRoomPage = () => {
  const { id: meetingCodeOrId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [meetingSeconds, setMeetingSeconds] = useState(0);

  // Drawer states
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Initialize WebRTC
  const {
    localStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(meetingCodeOrId, user);

  // Fetch meeting metadata and record participation
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const res = await meetingService.getMeetingById(meetingCodeOrId);
        if (res.success && res.meeting) {
          setMeeting(res.meeting);
          // Join meeting on backend
          await meetingService.joinMeeting(res.meeting._id);
        }
      } catch (err) {
        console.error('[Meeting fetch error]', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingCodeOrId]);

  // Meeting Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeaveMeeting = async () => {
    try {
      if (meeting) {
        const isHost =
          meeting.host?._id === user?.id || meeting.host?._id === user?._id;
        if (isHost) {
          // If host leaves, mark meeting ended
          await meetingService.endMeeting(meeting._id);
        }
      }
    } catch (err) {
      console.warn(err);
    } finally {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Loader label="Connecting to secure WebRTC conference..." size="lg" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0b0f19] text-white flex flex-col z-50 overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs">
            {meeting?.title || 'Video Conference'}
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

        <div className="flex items-center gap-3">
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
            <span className="hidden sm:inline">Analyze Session</span>
          </button>
        </div>
      </header>

      {/* Media Device Notice / Fallback Warning if mic/camera access blocked */}
      {mediaError && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{mediaError}</span>
          </div>
        </div>
      )}

      {/* Main Video View & Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Canvas Container */}
        <div className="flex-1 h-full p-2 sm:p-4 overflow-y-auto flex items-center justify-center">
          <VideoGrid
            localStream={localStream}
            currentUser={user}
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
          currentUser={user}
          hostUserId={meeting?.host?._id || meeting?.host}
        />

        {/* Side Panel: In-Meeting Chat Drawer */}
        <MeetingChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          meetingId={meeting?._id || meetingCodeOrId}
          currentUser={user}
        />
      </div>

      {/* Bottom Meeting Controls */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onToggleParticipants={() => {
          setIsParticipantsOpen(!isParticipantsOpen);
          if (isChatOpen) setIsChatOpen(false);
        }}
        onToggleChat={() => {
          setIsChatOpen(!isChatOpen);
          if (isParticipantsOpen) setIsParticipantsOpen(false);
        }}
        onToggleAI={() => setIsAIModalOpen(true)}
        onLeaveMeeting={handleLeaveMeeting}
        isParticipantsOpen={isParticipantsOpen}
        isChatOpen={isChatOpen}
        isAIOpen={isAIModalOpen}
        unreadChatCount={unreadChatCount}
      />

      {/* In-Meeting AI Extraction Modal */}
      <GenerateSummaryModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        meetingId={meeting?._id || meetingCodeOrId}
        onSuccess={() => {
          setIsAIModalOpen(false);
          // Navigate to meeting detail page if completed
        }}
      />
    </div>
  );
};

export default MeetingRoomPage;
