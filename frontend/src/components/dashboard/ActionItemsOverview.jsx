import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { CheckSquare, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { formatDateOnly } from '../../utils/formatters';

const ActionItemsOverview = ({ actionItems = [], onStatusChange, onAddActionItem }) => {
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

  return (
    <Card className="p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-white">Pending Action Items</h3>
          </div>
          <div className="flex items-center gap-3">
            {onAddActionItem && (
              <button
                type="button"
                onClick={onAddActionItem}
                className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold transition-colors"
              >
                + New Task
              </button>
            )}
            <Link
              to="/action-items"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {actionItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            All clear! No pending action items assigned.
          </div>
        ) : (
          <div className="space-y-3">
            {actionItems.slice(0, 5).map((item) => (
              <div
                key={item._id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() =>
                      onStatusChange &&
                      onStatusChange(
                        item._id,
                        item.status === 'completed' ? 'pending' : 'completed'
                      )
                    }
                    className={`mt-0.5 w-4 h-4 rounded border transition-colors flex items-center justify-center shrink-0 ${
                      item.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {item.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold truncate ${
                        item.status === 'completed'
                          ? 'line-through text-slate-500'
                          : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-500">
                      <span>{item.assigneeNameText || 'Unassigned'}</span>
                      {item.dueDate && (
                        <>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatDateOnly(item.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{getPriorityBadge(item.priority)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActionItemsOverview;
