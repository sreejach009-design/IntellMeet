import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { meetingService } from '../../services/meetingService';
import { Calendar, Users, Lock, Copy, Check, Video, Sparkles } from 'lucide-react';
import { getShareableMeetingLink } from '../../utils/formatters';

const ScheduleMeetingModal = ({
  isOpen,
  onClose,
  workspaces = [],
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workspaceId: workspaces[0]?._id || '',
    scheduledStart: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    scheduledEnd: new Date(Date.now() + 7200000).toISOString().slice(0, 16),
    invitedEmails: '',
    passcode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClose = () => {
    setCreatedMeeting(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setLoading(true);
      setError('');

      const emails = formData.invitedEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await meetingService.createMeeting({
        ...formData,
        isInstant: false,
        invitedEmails: emails,
        workspaceId: formData.workspaceId || null,
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.meeting);
        setCreatedMeeting(res.meeting);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  if (createdMeeting) {
    const joinUrl = getShareableMeetingLink(createdMeeting.meetingCode || createdMeeting._id);

    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Meeting Created & Link Generated"
        subtitle="Your session is ready. Share this link with attendees so they can join."
      >
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">
                {createdMeeting.title}
              </h4>
              <span className="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded">
                {createdMeeting.meetingCode}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Shareable Meeting Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="w-full bg-[#111827] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-indigo-300 select-all"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(joinUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  icon={copied ? Check : Copy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Anyone with this link can join directly from their browser without needing to sign up.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Done
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Video}
              onClick={() => {
                handleClose();
                navigate(`/room/${createdMeeting.meetingCode || createdMeeting._id}`);
              }}
            >
              Start / Join Now
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule Future Meeting"
      subtitle="Plan a future conferencing session and send invitations to teammates."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Meeting Title
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Q4 Platform Roadmap & OKRs"
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Workspace
          </label>
          <select
            name="workspaceId"
            value={formData.workspaceId}
            onChange={handleChange}
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Personal / General (No Workspace)</option>
            {workspaces.map((ws) => (
              <option key={ws._id} value={ws._id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              name="scheduledStart"
              required
              value={formData.scheduledStart}
              onChange={handleChange}
              className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="scheduledEnd"
              required
              value={formData.scheduledEnd}
              onChange={handleChange}
              className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Invite Attendees (Comma-separated emails)
          </label>
          <input
            type="text"
            name="invitedEmails"
            value={formData.invitedEmails}
            onChange={handleChange}
            placeholder="alice@company.com, bob@company.com"
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Passcode (Optional)
          </label>
          <input
            type="text"
            name="passcode"
            value={formData.passcode}
            onChange={handleChange}
            placeholder="e.g. 123456"
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={loading}
            icon={Calendar}
          >
            Schedule Meeting
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMeetingModal;
