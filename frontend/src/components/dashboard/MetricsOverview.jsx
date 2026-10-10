import React from 'react';
import Card from '../common/Card';
import { Video, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

const MetricsOverview = ({ stats = {} }) => {
  const cards = [
    {
      label: 'Total Meetings',
      value: stats.totalMeetings ?? 0,
      subtext: `${stats.completedCount ?? 0} sessions completed`,
      icon: Video,
      color: 'from-indigo-600 to-indigo-400',
      textColor: 'text-indigo-400',
      bgPill: 'bg-indigo-500/10',
    },
    {
      label: 'Conferencing Time',
      value: formatDuration(stats.totalDurationMinutes ?? 0),
      subtext: 'Across workspaces',
      icon: Clock,
      color: 'from-purple-600 to-purple-400',
      textColor: 'text-purple-400',
      bgPill: 'bg-purple-500/10',
    },
    {
      label: 'Upcoming Sessions',
      value: stats.upcomingCount ?? 0,
      subtext: 'Scheduled on calendar',
      icon: Calendar,
      color: 'from-sky-600 to-sky-400',
      textColor: 'text-sky-400',
      bgPill: 'bg-sky-500/10',
    },
    {
      label: 'Action Items',
      value: stats.pendingTasksCount ?? 0,
      subtext: 'Pending team execution',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-emerald-400',
      textColor: 'text-emerald-400',
      bgPill: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="p-5 flex items-start justify-between" hoverEffect>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {c.label}
              </p>
              <h3 className="text-2xl font-bold text-white mt-1.5">{c.value}</h3>
              <p className="text-xs text-slate-500 mt-1">{c.subtext}</p>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${c.color} flex items-center justify-center text-white shadow-lg shrink-0`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricsOverview;
