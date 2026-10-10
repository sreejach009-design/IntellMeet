import React from 'react';
import ProfileCard from '../components/profile/ProfileCard';
import PasswordChangeCard from '../components/profile/PasswordChangeCard';
import Card from '../components/common/Card';
import { Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage your personal credentials, profile role, and notification preferences.
        </p>
      </div>

      <div className="space-y-6">
        <ProfileCard />
        <PasswordChangeCard />

        {/* Notification Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Notifications</h3>
              <p className="text-xs text-slate-500">Choose which alerts you receive</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40">
              <div>
                <p className="font-semibold text-slate-200">Meeting Invitations</p>
                <p className="text-slate-500 text-[11px]">Receive in-app and audio notifications for invites</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40">
              <div>
                <p className="font-semibold text-slate-200">Action Item Assignments</p>
                <p className="text-slate-500 text-[11px]">Notify me when a meeting AI extracts a task for me</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40">
              <div>
                <p className="font-semibold text-slate-200">Meeting AI Summaries</p>
                <p className="text-slate-500 text-[11px]">Alert me when the executive digest is ready</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
