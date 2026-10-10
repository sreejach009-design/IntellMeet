import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Toast from '../components/common/Toast';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { meetingService } from '../services/meetingService';
import { Video, Zap } from 'lucide-react';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('Instant Sync');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleStartInstantMeeting = async (e) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    try {
      setCreating(true);
      const res = await meetingService.createMeeting({
        title: meetingTitle.trim(),
        isInstant: true,
      });
      setQuickModalOpen(false);
      navigate(`/room/${res.meeting.meetingCode || res.meeting._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onQuickMeeting={() => setQuickModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Toast />

      {/* Quick Instant Meeting Modal */}
      <Modal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        title="Launch Instant Meeting"
        subtitle="Start a high-definition video room right now with zero wait time."
      >
        <form onSubmit={handleStartInstantMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Meeting Title
            </label>
            <input
              type="text"
              required
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Design Critique & Roadmap"
              className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={creating}
              icon={Zap}
            >
              Start Room Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AppLayout;
