import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { workspaceService } from '../../services/workspaceService';
import { UserPlus, Mail } from 'lucide-react';

const AddMemberModal = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError('');
      const res = await workspaceService.addMember(workspaceId, {
        email: email.trim().toLowerCase(),
        role,
      });
      if (res.success) {
        if (onSuccess) onSuccess(res.workspace);
        onClose();
        setEmail('');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to add member to workspace.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      subtitle="Add colleagues by email to grant access to workspace meetings and tasks."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Member Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-[#151d30] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Workspace Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="member">Member - Can attend meetings & complete tasks</option>
            <option value="manager">Manager - Can schedule meetings & invite teammates</option>
          </select>
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
            icon={UserPlus}
          >
            Add Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMemberModal;
