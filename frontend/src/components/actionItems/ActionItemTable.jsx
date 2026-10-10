import React from 'react';
import Badge from '../common/Badge';
import { CheckCircle2, Clock, Trash2, Calendar, User, Sparkles } from 'lucide-react';
import { formatDateOnly } from '../../utils/formatters';

const ActionItemTable = ({
  actionItems = [],
  onStatusChange,
  onDelete,
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="primary" size="sm">In Progress</Badge>;
      case 'blocked':
        return <Badge variant="danger" size="sm">Blocked</Badge>;
      default:
        return <Badge variant="warning" size="sm">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <Badge variant="danger" size="sm">{priority}</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">{priority}</Badge>;
      default:
        return <Badge variant="default" size="sm">{priority || 'low'}</Badge>;
    }
  };

  if (actionItems.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-sm">
        No action items match the selected filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
          <tr>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Task Details</th>
            <th className="py-3 px-4">Assignee</th>
            <th className="py-3 px-4">Due Date</th>
            <th className="py-3 px-4">Priority</th>
            <th className="py-3 px-4">Meeting</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {actionItems.map((item) => (
            <tr
              key={item._id}
              className="hover:bg-slate-900/50 transition-colors group"
            >
              <td className="py-3.5 px-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onStatusChange &&
                      onStatusChange(
                        item._id,
                        item.status === 'completed' ? 'pending' : 'completed'
                      )
                    }
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                      item.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {item.status === 'completed' && (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {getStatusBadge(item.status)}
                </div>
              </td>

              <td className="py-3.5 px-4 max-w-xs">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`font-semibold text-slate-200 truncate ${
                      item.status === 'completed' ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.extractedByAI && (
                    <span
                      title="Extracted automatically by AI"
                      className="text-purple-400 shrink-0"
                    >
                      <Sparkles className="w-3 h-3" />
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </td>

              <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.assigneeNameText || item.assignedTo?.name || 'Unassigned'}</span>
                </div>
              </td>

              <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                {item.dueDate ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {formatDateOnly(item.dueDate)}
                  </span>
                ) : (
                  <span className="text-slate-600">Unspecified</span>
                )}
              </td>

              <td className="py-3.5 px-4 whitespace-nowrap">
                {getPriorityBadge(item.priority)}
              </td>

              <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                <span className="truncate max-w-[140px] block">
                  {item.meeting?.title || 'Direct Task'}
                </span>
              </td>

              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                {onDelete && (
                  <button
                    onClick={() => onDelete(item._id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActionItemTable;
