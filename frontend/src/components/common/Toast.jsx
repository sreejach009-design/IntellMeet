import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const Toast = () => {
  const { toastMessage, setToastMessage } = useNotifications();

  if (!toastMessage) return null;

  const icons = {
    meeting_invite: <Bell className="w-5 h-5 text-indigo-400" />,
    action_item_assigned: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    summary_ready: <Info className="w-5 h-5 text-sky-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />,
    error: <AlertTriangle className="w-5 h-5 text-rose-400" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 backdrop-blur-xl">
        <div className="p-2 rounded-xl bg-slate-800/80 shrink-0">
          {icons[toastMessage.type] || <Info className="w-5 h-5 text-indigo-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">
            {toastMessage.title || 'Notification'}
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
            {toastMessage.message}
          </p>
        </div>
        <button
          onClick={() => setToastMessage(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
