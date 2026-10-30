import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Video, Copy, Check, ShieldCheck, Sparkles, Share2 } from 'lucide-react';
import { getShareableMeetingLink } from '../../utils/formatters';

const PersonalRoomCard = ({ user, onStartInstant }) => {
  const [copied, setCopied] = useState(false);
  const personalCode = user?.id ? `room-${user.id.slice(-6)}` : 'instant-sync';
  const fullUrl = getShareableMeetingLink(personalCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 flex flex-col justify-between" hoverEffect>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Personal Meeting Room</h3>
              <p className="text-[11px] text-slate-500">Your dedicated, permanent video link</p>
            </div>
          </div>

          <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">
            Always Ready
          </span>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 mb-4">
          <span className="font-mono text-xs text-indigo-300 truncate">
            {fullUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors shrink-0"
            title="Copy personal link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onStartInstant}
            icon={Video}
            className="flex-1 justify-center shadow-md shadow-indigo-600/20"
          >
            Launch Instant Room
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            icon={Share2}
            className="shrink-0"
          >
            {copied ? 'Copied' : 'Share'}
          </Button>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          End-to-End Encrypted
        </span>
        <span>Zero app downloads needed</span>
      </div>
    </Card>
  );
};

export default PersonalRoomCard;
