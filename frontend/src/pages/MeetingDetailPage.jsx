import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { meetingService } from '../services/meetingService';
import { aiService } from '../services/aiService';
import { actionItemService } from '../services/actionItemService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import SummaryCard from '../components/ai/SummaryCard';
import TopicsCard from '../components/ai/TopicsCard';
import DecisionsCard from '../components/ai/DecisionsCard';
import TranscriptViewer from '../components/ai/TranscriptViewer';
import ActionItemTable from '../components/actionItems/ActionItemTable';
import GenerateSummaryModal from '../components/ai/GenerateSummaryModal';
import CreateActionItemModal from '../components/actionItems/CreateActionItemModal';
import {
  Video,
  Clock,
  Sparkles,
  Users,
  CheckSquare,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { formatDateTime, formatDuration } from '../utils/formatters';

const MeetingDetailPage = () => {
  const { id } = useParams();

  const [meeting, setMeeting] = useState(null);
  const [aiData, setAiData] = useState({ summary: null, transcript: null, actionItems: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('intelligence'); // intelligence | action-items | transcript

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      const [meetingRes, aiRes] = await Promise.all([
        meetingService.getMeetingById(id),
        aiService.getMeetingAIResults(id),
      ]);

      if (meetingRes.success) {
        setMeeting(meetingRes.meeting);
      }

      if (aiRes.success) {
        setAiData({
          summary: aiRes.summary,
          transcript: aiRes.transcript,
          actionItems: aiRes.actionItems || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingData();
  }, [id]);

  const handleActionItemStatus = async (itemId, newStatus) => {
    try {
      await actionItemService.updateStatus(itemId, newStatus);
      setAiData((prev) => ({
        ...prev,
        actionItems: prev.actionItems.map((item) =>
          item._id === itemId ? { ...item, status: newStatus } : item
        ),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleActionItemDelete = async (itemId) => {
    try {
      await actionItemService.deleteActionItem(itemId);
      setAiData((prev) => ({
        ...prev,
        actionItems: prev.actionItems.filter((i) => i._id !== itemId),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader label="Retrieving meeting details & intelligence..." size="lg" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-lg font-bold text-white">Meeting not found</h2>
        <Link to="/meetings" className="text-xs text-indigo-400 mt-2 inline-block">
          Return to meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Back */}
      <Link
        to="/meetings"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to meetings
      </Link>

      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {meeting.title}
              </h1>
              <Badge
                variant={
                  meeting.status === 'in-progress'
                    ? 'success'
                    : meeting.status === 'completed'
                    ? 'purple'
                    : 'primary'
                }
                size="md"
                dot={meeting.status === 'in-progress'}
              >
                {meeting.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {meeting.description || 'Enterprise collaboration session.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {formatDateTime(meeting.scheduledStart)}
              </span>
              <span>&bull;</span>
              <span>Duration: {formatDuration(meeting.durationMinutes)}</span>
              {meeting.workspace?.name && (
                <>
                  <span>&bull;</span>
                  <span>Workspace: {meeting.workspace.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {meeting.status !== 'cancelled' && (
              <Link to={`/room/${meeting.meetingCode || meeting._id}`}>
                <Button variant="primary" size="sm" icon={Video}>
                  {meeting.status === 'completed' ? 'Re-open Room' : 'Join Video Room'}
                </Button>
              </Link>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSummaryModalOpen(true)}
              icon={Sparkles}
            >
              {aiData.summary ? 'Re-Analyze AI' : 'Process with AI'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'intelligence'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Summary & Key Topics
        </button>

        <button
          onClick={() => setActiveTab('action-items')}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'action-items'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Action Items ({aiData.actionItems.length})
        </button>

        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'transcript'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Transcript
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {!aiData.summary ? (
            <Card className="p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">
                No AI Intelligence generated yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Submit or paste the meeting dialogue transcript to automatically produce executive summaries, key topics, decisions, and action items.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSummaryModalOpen(true)}
                icon={Sparkles}
              >
                Generate Intelligence Now
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <SummaryCard
                summary={aiData.summary}
                onRegenerate={() => setIsSummaryModalOpen(true)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopicsCard topics={aiData.summary.keyTopics} />
                <DecisionsCard decisions={aiData.summary.decisions} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'action-items' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">
                Extracted & Assigned Tasks
              </h3>
              <p className="text-xs text-slate-500">
                Actionable deliverables derived from this session
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsActionModalOpen(true)}
              icon={Plus}
            >
              Add Manual Task
            </Button>
          </div>

          <ActionItemTable
            actionItems={aiData.actionItems}
            onStatusChange={handleActionItemStatus}
            onDelete={handleActionItemDelete}
          />
        </Card>
      )}

      {activeTab === 'transcript' && (
        <div>
          {!aiData.transcript ? (
            <Card className="p-10 text-center space-y-4">
              <p className="text-xs text-slate-400">
                No raw transcript uploaded or captured for this session yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSummaryModalOpen(true)}
              >
                Upload / Submit Transcript
              </Button>
            </Card>
          ) : (
            <TranscriptViewer transcript={aiData.transcript} />
          )}
        </div>
      )}

      {/* Modals */}
      <GenerateSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        meetingId={meeting._id}
        initialTranscript={aiData.transcript?.rawText || ''}
        onSuccess={() => fetchMeetingData()}
      />

      <CreateActionItemModal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        meetingId={meeting._id}
        workspaceId={meeting.workspace?._id}
        onSuccess={() => fetchMeetingData()}
      />
    </div>
  );
};

export default MeetingDetailPage;
