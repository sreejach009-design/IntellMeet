import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Sparkles, FileText, Upload } from 'lucide-react';
import { aiService } from '../../services/aiService';

const GenerateSummaryModal = ({
  isOpen,
  onClose,
  meetingId,
  initialTranscript = '',
  onSuccess,
}) => {
  const [transcriptText, setTranscriptText] = useState(initialTranscript);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleDemoTranscript = `Alex (Host): Thank you everyone for joining today's sprint and architecture alignment.
Sarah: Let's start with the WebRTC peer connection status. The mesh signaling over Socket.io is functional. I will finalize the STUN server fallback configuration by Wednesday.
David: On the backend, I migrated our MongoDB indexing and JWT authentication. David will implement rate limiting on the auth endpoints before Friday.
Alex: Excellent. Let's make a decision: we are standardizing on 720p 24fps for video streams to optimize bandwidth for larger rooms.
Sarah: Agreed. That ensures solid performance on low-bandwidth connections.
Alex: Next, I will coordinate with the design team to ensure all action-item status badges match our design system by next Monday.
David: Sounds like a solid plan. I'll get that security review finished tomorrow.`;

  const handleUseDemo = () => {
    setTranscriptText(sampleDemoTranscript);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcriptText || transcriptText.trim().length < 15) {
      setError('Please provide at least a couple of sentences of transcript text.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await aiService.generateMeetingIntelligence(meetingId, transcriptText);
      if (res.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'AI processing encountered an error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Meeting Intelligence"
      subtitle="Submit speech transcript to extract executive summaries, decisions, and action items."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Meeting Dialogue / Transcript
            </label>
            <button
              type="button"
              onClick={handleUseDemo}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Insert Demo Transcript
            </button>
          </div>

          <textarea
            rows={10}
            required
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            placeholder="Paste transcript or speaker dialogue here...
Speaker A: We need to finalize the deployment...
Speaker B: I will complete the tests by Friday..."
            className="w-full bg-[#151d30] border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            Uses OpenAI GPT-4o-mini structured analysis
          </p>

          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
              icon={Sparkles}
            >
              Extract Intelligence
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default GenerateSummaryModal;
