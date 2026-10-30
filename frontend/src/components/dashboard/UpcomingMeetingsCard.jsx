import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { Calendar, Video, ArrowRight, Clock, Copy, Check } from 'lucide-react';
import { formatDateTime, getInitials, getShareableMeetingLink } from '../../utils/formatters';

const UpcomingMeetingsCard = ({ meetings = [] }) => {
  const [copiedId, setCopiedId] = useState(null);
  return (
    <Card className="p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Upcoming Meetings</h3>
          </div>
          <Link
            to="/meetings"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {meetings.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No upcoming meetings scheduled.
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m._id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {m.title}
                    </h4>
                    {m.status === 'in-progress' && (
                      <Badge variant="success" size="sm" dot>
                        Live
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {formatDateTime(m.scheduledStart)}
                    </span>
                    {m.workspace?.name && (
                      <span className="truncate max-w-[120px] text-slate-500">
                        &bull; {m.workspace.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      const link = getShareableMeetingLink(m.meetingCode || m._id);
                      navigator.clipboard.writeText(link);
                      setCopiedId(m._id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Copy meeting link"
                  >
                    {copiedId === m._id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link to={`/room/${m.meetingCode || m._id}`}>
                    <Button
                      variant={m.status === 'in-progress' ? 'success' : 'primary'}
                      size="xs"
                      icon={Video}
                    >
                      {m.status === 'in-progress' ? 'Join Live' : 'Join'}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default UpcomingMeetingsCard;
