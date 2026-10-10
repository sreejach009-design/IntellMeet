import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Shield } from 'lucide-react';
import { getInitials } from '../../utils/formatters';

const ParticipantList = ({
  isOpen,
  onClose,
  participants = [],
  currentUser,
  hostUserId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-80 h-full bg-[#111827] border-l border-slate-800 flex flex-col shrink-0 z-20">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Participants ({participants.length})
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {participants.map((p, index) => {
          const isUserHost =
            p.user?.id === hostUserId ||
            p.user?._id === hostUserId ||
            p.isHost;

          return (
            <div
              key={p.socketId || index}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {getInitials(p.user?.name || 'User')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                    {p.user?.name || 'Participant'}
                    {p.isSelf && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        (You)
                      </span>
                    )}
                  </p>
                  {isUserHost && (
                    <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Host
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                {p.audioEnabled ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                )}
                {p.videoEnabled ? (
                  <Video className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantList;
