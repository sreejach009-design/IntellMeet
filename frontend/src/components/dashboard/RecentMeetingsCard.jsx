import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { Sparkles, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { formatDateOnly, formatDuration } from '../../utils/formatters';

const RecentMeetingsCard = ({ meetings = [] }) => {
  return (
    <Card className="p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Recent AI Summaries</h3>
          </div>
          <Link
            to="/meetings?timeframe=past"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {meetings.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No completed sessions yet. Start a meeting to generate intelligence.
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <Link
                key={m._id}
                to={`/meetings/${m._id}`}
                className="block p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-900/90 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {m.title}
                  </h4>
                  <Badge variant="purple" size="sm">
                    {m.summary ? 'AI Generated' : 'Completed'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {m.summary?.overview ||
                    'Review session notes, transcript segments, and action item deliverables.'}
                </p>

                <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-500">
                  <span>{formatDateOnly(m.scheduledStart || m.createdAt)}</span>
                  <span>&bull;</span>
                  <span>{formatDuration(m.durationMinutes)}</span>
                  {m.summary?.sentiment && (
                    <>
                      <span>&bull;</span>
                      <span className="capitalize text-slate-400">
                        {m.summary.sentiment} tone
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentMeetingsCard;
