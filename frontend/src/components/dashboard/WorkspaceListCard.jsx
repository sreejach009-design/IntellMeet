import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { FolderKanban, Users, ArrowRight, Plus } from 'lucide-react';

const WorkspaceListCard = ({ workspaces = [], onCreateWorkspace }) => {
  return (
    <Card className="p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Workspaces</h3>
          </div>
          <button
            onClick={onCreateWorkspace}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New Workspace
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No workspaces found. Create one to organize meetings and teams.
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <Link
                key={ws._id}
                to={`/workspaces/${ws._id}`}
                className="block p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/30 hover:bg-slate-900/90 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                    {ws.name}
                  </h4>
                  <Badge variant="info" size="sm">
                    {ws.members?.length || 1} members
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {ws.description || 'Enterprise team collaboration hub.'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default WorkspaceListCard;
