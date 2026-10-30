import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { meetingService } from '../services/meetingService';
import { workspaceService } from '../services/workspaceService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ScheduleMeetingModal from '../components/meetings/ScheduleMeetingModal';
import {
  Video,
  Calendar,
  Clock,
  Sparkles,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { formatDateTime, formatDuration, getShareableMeetingLink } from '../utils/formatters';

const MeetingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTimeframe = searchParams.get('timeframe') || 'all';

  const [meetings, setMeetings] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const navigate = useNavigate();

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (timeframe !== 'all') params.timeframe = timeframe;
      if (searchQuery) params.search = searchQuery;

      const [meetingsRes, workspacesRes] = await Promise.all([
        meetingService.getMeetings(params),
        workspaceService.getWorkspaces(),
      ]);

      if (meetingsRes.success) {
        setMeetings(meetingsRes.meetings || []);
      }
      if (workspacesRes.success) {
        setWorkspaces(workspacesRes.workspaces || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [timeframe]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMeetings();
  };

  const handleStartInstant = async () => {
    try {
      const res = await meetingService.createMeeting({
        title: `${user?.name || 'User'}'s Instant Meeting`,
        isInstant: true,
      });
      if (res?.meeting) {
        navigate(`/room/${res.meeting.meetingCode || res.meeting._id}`);
      }
    } catch (err) {
      console.error('[Instant Meeting Error]', err);
    }
  };

  const handleCancelMeeting = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      await meetingService.deleteMeeting(id);
      setMeetings((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: 'cancelled' } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Meeting Directory
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage upcoming video sessions, live conferencing rooms, and AI historical summaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartInstant}
            icon={Video}
          >
            Instant Meeting
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            icon={Plus}
          >
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Timeframe Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full sm:w-auto">
          {['all', 'upcoming', 'past'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setTimeframe(tab);
                setSearchParams(tab === 'all' ? {} : { timeframe: tab });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex-1 sm:flex-initial ${
                timeframe === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title..."
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl pl-10 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Meetings List */}
      {loading ? (
        <Loader label="Loading meetings..." size="lg" />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No meetings found"
          description="Schedule a new session or launch an instant meeting to get started."
          actionLabel="Schedule Meeting"
          onAction={() => setIsScheduleOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => {
            const isLive = m.status === 'in-progress';
            const isCompleted = m.status === 'completed';
            const isCancelled = m.status === 'cancelled';

            return (
              <Card
                key={m._id}
                className="p-5 flex flex-col justify-between"
                hoverEffect
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-white truncate flex-1">
                      {m.title}
                    </h3>
                    <Badge
                      variant={
                        isLive
                          ? 'success'
                          : isCompleted
                          ? 'purple'
                          : isCancelled
                          ? 'danger'
                          : 'primary'
                      }
                      size="sm"
                      dot={isLive}
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {m.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5 text-[11px] text-slate-400 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDateTime(m.scheduledStart)}</span>
                    </div>
                    {m.workspace?.name && (
                      <div className="text-slate-500">
                        Workspace: <span className="text-slate-300">{m.workspace.name}</span>
                      </div>
                    )}
                    <div className="text-slate-500">
                      Host: <span className="text-slate-300">{m.host?.name || 'You'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link to={`/meetings/${m._id}`}>
                      <Button variant="outline" size="xs">
                        Details & AI
                      </Button>
                    </Link>

                    {!isCancelled && (
                      <button
                        onClick={() => {
                          const link = getShareableMeetingLink(m.meetingCode || m._id);
                          navigator.clipboard.writeText(link);
                          setCopiedId(m._id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Copy meeting invite link"
                      >
                        {copiedId === m._id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleCancelMeeting(m._id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/20"
                        title="Cancel meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!isCancelled && (
                    <Link to={`/room/${m.meetingCode || m._id}`}>
                      <Button
                        variant={isLive ? 'success' : 'primary'}
                        size="xs"
                        icon={Video}
                      >
                        {isLive ? 'Join Live' : 'Start / Join'}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        workspaces={workspaces}
        onSuccess={() => fetchMeetings()}
      />
    </div>
  );
};

export default MeetingsPage;
