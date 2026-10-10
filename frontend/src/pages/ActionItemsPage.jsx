import React, { useState, useEffect } from 'react';
import { actionItemService } from '../services/actionItemService';
import { workspaceService } from '../services/workspaceService';
import { meetingService } from '../services/meetingService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ActionItemTable from '../components/actionItems/ActionItemTable';
import CreateActionItemModal from '../components/actionItems/CreateActionItemModal';
import { CheckSquare, Filter, Plus, UserCheck } from 'lucide-react';

const ActionItemsPage = () => {
  const [actionItems, setActionItems] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (assignedToMe) params.assignedToMe = 'true';
      if (selectedWorkspace) params.workspaceId = selectedWorkspace;

      const [itemsRes, wsRes, meetingsRes] = await Promise.all([
        actionItemService.getActionItems(params),
        workspaceService.getWorkspaces(),
        meetingService.getMeetings(),
      ]);

      if (itemsRes.success) {
        setActionItems(itemsRes.actionItems || []);
      }
      if (wsRes.success) {
        setWorkspaces(wsRes.workspaces || []);
      }
      if (meetingsRes.success) {
        setMeetings(meetingsRes.meetings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [statusFilter, assignedToMe, selectedWorkspace]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await actionItemService.updateStatus(id, newStatus);
      setActionItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await actionItemService.deleteActionItem(id);
      setActionItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Action Items & Task Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Deliverables extracted from AI transcripts and assigned to team members.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={Plus}
        >
          Add Action Item
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full md:w-auto">
          {['all', 'pending', 'in-progress', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex-1 md:flex-initial ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Workspace Filter */}
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="bg-[#151d30] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Workspaces</option>
            {workspaces.map((ws) => (
              <option key={ws._id} value={ws._id}>
                {ws.name}
              </option>
            ))}
          </select>

          {/* Assigned to me toggle */}
          <button
            onClick={() => setAssignedToMe(!assignedToMe)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              assignedToMe
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assigned to me
          </button>
        </div>
      </div>

      {/* Action Items List */}
      <Card className="p-6">
        {loading ? (
          <Loader label="Loading action items..." size="lg" />
        ) : actionItems.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No action items found"
            description="Run AI meeting intelligence or create tasks manually to populate this tracker."
            actionLabel="Create Action Item"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <ActionItemTable
            actionItems={actionItems}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </Card>

      {/* Manual Task Modal */}
      {meetings.length > 0 && (
        <CreateActionItemModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          meetingId={meetings[0]?._id}
          workspaceId={workspaces[0]?._id}
          onSuccess={() => fetchActionItems()}
        />
      )}
    </div>
  );
};

export default ActionItemsPage;
