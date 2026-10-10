import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, VideoOff, Monitor, Shield } from 'lucide-react';
import { getInitials } from '../../utils/formatters';

const VideoTile = ({
  stream,
  user,
  isSelf = false,
  audioEnabled = true,
  videoEnabled = true,
  isScreenSharing = false,
  isHost = false,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideoTrack =
    videoEnabled &&
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks()[0].enabled;

  return (
    <div className="relative w-full h-full min-h-[220px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl group flex items-center justify-center">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf} // Always mute local video playback to avoid acoustic feedback
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          hasVideoTrack ? 'opacity-100' : 'opacity-0 absolute'
        } ${isSelf && !isScreenSharing ? '-scale-x-100' : ''}`}
      />

      {/* Avatar Placeholder when video is off */}
      {!hasVideoTrack && (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-600 border-2 border-indigo-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-2xl">
            {getInitials(user?.name || 'User')}
          </div>
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <VideoOff className="w-3.5 h-3.5" /> Video paused
          </span>
        </div>
      )}

      {/* Name and Status Badge Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-medium text-white max-w-[80%] truncate">
          {isHost && <Shield className="w-3 h-3 text-amber-400 shrink-0" />}
          <span className="truncate">
            {user?.name || 'Participant'} {isSelf && '(You)'}
          </span>
          {isScreenSharing && (
            <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-1">
              <Monitor className="w-2.5 h-2.5" /> Sharing
            </span>
          )}
        </div>

        {/* Mic status indicator */}
        <div
          className={`p-1.5 rounded-lg backdrop-blur-md border ${
            audioEnabled
              ? 'bg-black/60 border-white/10 text-white'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-400'
          }`}
        >
          {audioEnabled ? (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
