import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workspaceService } from '../services/workspaceService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal';
import { FolderKanban, Users, Plus, ArrowRight, Shield } from 'lucide-react';
import { getInitials } from '../utils/formatters';

const WorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await workspaceService.getWorkspaces();
      if (res.success) {
        setWorkspaces(res.workspaces || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Team Workspaces
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Organize collaborative departments, pods, and cross-functional project hubs.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          icon={Plus}
        >
          New Workspace
        </Button>
      </div>

      {loading ? (
        <Loader label="Loading workspaces..." size="lg" />
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No workspaces yet"
          description="Create your first team workspace to share meetings and coordinate action items."
          actionLabel="Create Workspace"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <Card
              key={ws._id}
              className="p-6 flex flex-col justify-between"
              hoverEffect
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white truncate max-w-[170px]">
                        {ws.name}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        Owner: {ws.owner?.name || 'You'}
                      </span>
                    </div>
                  </div>

                  <Badge variant="info" size="sm">
                    {ws.members?.length || 1} members
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-5">
                  {ws.description || 'Enterprise collaboration workspace.'}
                </p>

                {/* Member avatars preview */}
                <div className="flex items-center gap-1.5 mb-2">
                  {(ws.members || []).slice(0, 4).map((m, idx) => (
                    <div
                      key={idx}
                      title={m.user?.name}
                      className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white"
                    >
                      {getInitials(m.user?.name || 'U')}
                    </div>
                  ))}
                  {(ws.members || []).length > 4 && (
                    <span className="text-[10px] text-slate-500 font-semibold pl-1">
                      +{(ws.members || []).length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <Link to={`/workspaces/${ws._id}`}>
                  <Button variant="outline" size="xs" icon={ArrowRight}>
                    Open Workspace
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchWorkspaces()}
      />
    </div>
  );
};

export default WorkspacesPage;
