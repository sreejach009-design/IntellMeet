import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import AddMemberModal from '../components/workspace/AddMemberModal';
import ActionItemTable from '../components/actionItems/ActionItemTable';
import {
  FolderKanban,
  Users,
  UserPlus,
  Video,
  Clock,
  ArrowLeft,
  Calendar,
  CheckSquare,
} from 'lucide-react';
import { formatDateTime, getInitials } from '../utils/formatters';

const WorkspaceDetailPage = () => {
  const { id } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const res = await workspaceService.getWorkspaceById(id);
      if (res.success) {
        setWorkspace(res.workspace);
        setMeetings(res.meetings || []);
        setActionItems(res.actionItems || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24">
        <Loader label="Loading workspace..." size="lg" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-lg font-bold text-white">Workspace not found</h2>
        <Link to="/workspaces" className="text-xs text-indigo-400 mt-2 inline-block">
          Back to Workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/workspaces"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to workspaces
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {workspace.name}
                </h1>
                <Badge variant="info" size="sm">
                  {workspace.members?.length || 1} members
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {workspace.description || 'Enterprise collaboration workspace.'}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                <span>Owned by {workspace.owner?.name || 'User'}</span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddMemberOpen(true)}
            icon={UserPlus}
          >
            Invite Teammate
          </Button>
        </div>
      </Card>

      {/* Grid: Members & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members Column */}
        <Card className="p-6 h-fit">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Members ({workspace.members?.length || 0})
            </h3>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {(workspace.members || []).map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {getInitials(m.user?.name || 'U')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {m.user?.name || 'Team Member'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {m.user?.email}
                    </p>
                  </div>
                </div>

                <Badge variant={m.role === 'owner' ? 'purple' : 'default'} size="sm">
                  {m.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Meetings Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Workspace Meetings ({meetings.length})
              </h3>
            </div>

            {meetings.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No meetings recorded for this workspace yet.
              </p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m._id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white">
                        {m.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {formatDateTime(m.scheduledStart)} &bull; {m.status}
                      </p>
                    </div>

                    <Link to={`/meetings/${m._id}`}>
                      <Button variant="outline" size="xs">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Action items */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                Workspace Action Items ({actionItems.length})
              </h3>
            </div>

            <ActionItemTable actionItems={actionItems} />
          </Card>
        </div>
      </div>

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        workspaceId={workspace._id}
        onSuccess={() => fetchWorkspace()}
      />
    </div>
  );
};

export default WorkspaceDetailPage;
