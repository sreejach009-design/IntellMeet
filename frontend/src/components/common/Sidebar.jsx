import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  FolderKanban,
  CheckSquare,
  User,
  Plus,
  Sparkles,
} from 'lucide-react';
import Button from './Button';

const Sidebar = ({ isOpen, onClose, onQuickMeeting }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Meetings', path: '/meetings', icon: Video },
    { label: 'Workspaces', path: '/workspaces', icon: FolderKanban },
    { label: 'Action Items', path: '/action-items', icon: CheckSquare },
    { label: 'Profile & Settings', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-[#0b0f19] border-r border-slate-800/80 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Quick Action Button */}
          {onQuickMeeting && (
            <Button
              variant="primary"
              className="w-full justify-center shadow-lg shadow-indigo-600/20"
              icon={Plus}
              onClick={() => {
                if (onClose) onClose();
                onQuickMeeting();
              }}
            >
              New Instant Meeting
            </Button>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Intelligence Pro Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-900/30">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Intelligence v2.0
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every session automatically analyzes speech, identifies decisions, and delegates tasks.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
