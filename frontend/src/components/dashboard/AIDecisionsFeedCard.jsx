import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { Sparkles, ArrowRight, CheckCircle2, MessageSquare, ChevronRight } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

const AIDecisionsFeedCard = ({ meetings = [] }) => {
  // Filter meetings that have generated summaries
  const meetingsWithSummary = meetings.filter((m) => m.summary && m.summary.overview);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Executive AI Briefing</h3>
            <p className="text-xs text-slate-500">Autonomous insights & consensus from recent discussions</p>
          </div>
        </div>

        <Link
          to="/meetings?timeframe=past"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
        >
          <span>All Summaries</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {meetingsWithSummary.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-slate-400">
            No meeting summaries recorded yet. Start an instant sync or conclude a meeting to see AI executive highlights here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetingsWithSummary.slice(0, 3).map((m) => (
            <Link
              key={m._id}
              to={`/meetings/${m._id}`}
              className="block p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-indigo-500/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDateTime(m.actualEnd || m.updatedAt || m.scheduledStart)} &bull; {m.host?.name || 'Team'}
                  </p>
                </div>

                {m.summary.sentiment && (
                  <Badge
                    variant={m.summary.sentiment === 'positive' ? 'success' : 'primary'}
                    size="sm"
                  >
                    {m.summary.sentiment}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {m.summary.overview}
              </p>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  AI Intelligence Extracted
                </span>
                <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform font-medium">
                  Read full analysis <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AIDecisionsFeedCard;
