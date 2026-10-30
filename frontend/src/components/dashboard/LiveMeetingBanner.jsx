import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Users, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { getShareableMeetingLink, formatDateTime } from '../../utils/formatters';

const LiveMeetingBanner = ({ meeting }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!meeting) return null;

  const isLive = meeting.status === 'in-progress';
  const meetingUrl = getShareableMeetingLink(meeting.meetingCode || meeting._id);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-all ${
      isLive
        ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/40 border-indigo-500/40 shadow-xl shadow-indigo-600/10'
        : 'bg-[#111827] border-slate-800'
    }`}>
      {/* Background glowing orb */}
      <div className="absolute top-0 right-0 w-80 h-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                LIVE IN PROGRESS
              </span>
            ) : (
              <Badge variant="primary" size="sm">
                UPCOMING SESSION
              </Badge>
            )}

            {meeting.workspace?.name && (
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700/60 font-medium">
                {meeting.workspace.name}
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {meeting.title}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {isLive ? 'Active now' : formatDateTime(meeting.scheduledStart)}
            </span>

            {meeting.host?.name && (
              <span>Hosted by <strong className="text-slate-200">{meeting.host.name}</strong></span>
            )}

            <span className="font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
              Code: {meeting.meetingCode || meeting._id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            title="Copy invitation link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Share Link'}</span>
          </button>

          <Button
            variant="primary"
            size="md"
            icon={Video}
            onClick={() => navigate(`/room/${meeting.meetingCode || meeting._id}`)}
            className="shadow-lg shadow-indigo-600/30"
          >
            {isLive ? 'Join Room Now' : 'Enter Lobby'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveMeetingBanner;
