import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { meetingService } from '../services/meetingService';
import { workspaceService } from '../services/workspaceService';
import { actionItemService } from '../services/actionItemService';
import MetricsOverview from '../components/dashboard/MetricsOverview';
import UpcomingMeetingsCard from '../components/dashboard/UpcomingMeetingsCard';
import RecentMeetingsCard from '../components/dashboard/RecentMeetingsCard';
import ActionItemsOverview from '../components/dashboard/ActionItemsOverview';
import WorkspaceListCard from '../components/dashboard/WorkspaceListCard';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';
import ScheduleMeetingModal from '../components/meetings/ScheduleMeetingModal';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { Video, Calendar, Plus, Zap, ArrowRight } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  const [joinCode, setJoinCode] = useState('');
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, workspacesRes, actionItemsRes] = await Promise.all([
        meetingService.getDashboardStats(),
        workspaceService.getWorkspaces(),
        actionItemService.getActionItems({ status: 'pending' }),
      ]);

      if (statsRes.success) {
        setStats({
          ...statsRes.stats,
          pendingTasksCount: actionItemsRes.actionItems?.length || 0,
        });
        setUpcomingMeetings(statsRes.upcomingMeetings || []);
        setRecentMeetings(statsRes.recentMeetings || []);
      }

      if (workspacesRes.success) {
        setWorkspaces(workspacesRes.workspaces || []);
      }

      if (actionItemsRes.success) {
        setActionItems(actionItemsRes.actionItems || []);
      }
    } catch (err) {
      console.error('[Dashboard fetch error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/room/${joinCode.trim()}`);
  };

  const handleStartInstant = async () => {
    try {
      const res = await meetingService.createMeeting({
        title: `${user?.name || 'User'}'s Instant Meeting`,
        isInstant: true,
      });
      navigate(`/room/${res.meeting.meetingCode || res.meeting._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActionItemStatus = async (id, newStatus) => {
    try {
      await actionItemService.updateStatus(id, newStatus);
      setActionItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader label="Gathering workspace insights..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Team'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user?.department} &bull; {user?.title} &bull; Ready for intelligent collaboration.
          </p>
        </div>

        {/* Quick Join and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleJoinWithCode} className="flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter meeting code..."
              className="bg-[#151d30] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
            />
            <Button type="submit" variant="outline" size="sm">
              Join
            </Button>
          </form>

          <Button
            variant="primary"
            size="sm"
            onClick={handleStartInstant}
            icon={Zap}
          >
            Instant Sync
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsScheduleModalOpen(true)}
            icon={Calendar}
          >
            Schedule
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsOverview stats={stats} />

      {/* 2-Column Grid of Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingMeetingsCard meetings={upcomingMeetings} />
        <RecentMeetingsCard meetings={recentMeetings} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionItemsOverview
          actionItems={actionItems}
          onStatusChange={handleActionItemStatus}
        />
        <WorkspaceListCard
          workspaces={workspaces}
          onCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        />
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        workspaces={workspaces}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
};

export default DashboardPage;
