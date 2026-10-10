import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  MessageSquare,
  PhoneOff,
  Sparkles,
} from 'lucide-react';

const MeetingControls = ({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onToggleChat,
  onToggleAI,
  onLeaveMeeting,
  isParticipantsOpen,
  isChatOpen,
  isAIOpen,
  unreadChatCount = 0,
}) => {
  return (
    <div className="h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 sm:px-8 flex items-center justify-between shrink-0 z-20">
      {/* Left side info */}
      <div className="hidden md:flex items-center gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Encrypted WebRTC Mesh
        </span>
      </div>

      {/* Main Center Controls */}
      <div className="flex items-center gap-2 sm:gap-3 mx-auto md:mx-0">
        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleAudio}
          className={`p-3.5 rounded-2xl transition-all shadow-lg ${
            isAudioMuted
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-3.5 rounded-2xl transition-all shadow-lg ${
            isVideoOff
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3.5 rounded-2xl transition-all shadow-lg ${
            isScreenSharing
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-2 ring-indigo-400'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          <Monitor className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-8 bg-slate-800 mx-1 hidden sm:block" />

        {/* Participants toggle */}
        <button
          onClick={onToggleParticipants}
          className={`p-3.5 rounded-2xl transition-all ${
            isParticipantsOpen
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={`relative p-3.5 rounded-2xl transition-all ${
            isChatOpen
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
          title="In-meeting Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* AI Assistant toggle */}
        {onToggleAI && (
          <button
            onClick={onToggleAI}
            className={`p-3.5 rounded-2xl transition-all ${
              isAIOpen
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/30'
            }`}
            title="Meeting Intelligence"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
          </button>
        )}

        {/* Leave Meeting Button */}
        <button
          onClick={onLeaveMeeting}
          className="p-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 ml-2"
          title="Leave Meeting"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-xs font-semibold hidden sm:inline">Leave</span>
        </button>
      </div>

      <div className="hidden md:block w-32" />
    </div>
  );
};

export default MeetingControls;
