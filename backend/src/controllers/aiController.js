import Meeting from '../models/Meeting.js';
import Transcript from '../models/Transcript.js';
import MeetingSummary from '../models/MeetingSummary.js';
import ActionItem from '../models/ActionItem.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import aiService from '../services/aiService.js';
import notificationService from '../services/notificationService.js';

/**
 * Consolidates dialogue from all sources:
 * 1. Live real-time speech segments recorded from all participants (host + remote guests)
 * 2. Saved raw transcript lines
 * 3. In-meeting chat messages sent by any attendee
 * 4. Manual/modal override text
 * Deduplicates utterances and extracts all active participant names.
 */
export const consolidateMeetingDialogue = async (meetingId, overrideText = null) => {
  const query = meetingId.toString().match(/^[0-9a-fA-F]{24}$/)
    ? { _id: meetingId }
    : { meetingCode: meetingId };

  const meeting = await Meeting.findOne(query)
    .populate('participants.user', 'name email')
    .populate('host', 'name email');

  if (!meeting) return { text: '', participantsList: [], transcript: null, meeting: null };

  let transcriptRecord = await Transcript.findOne({ meeting: meeting._id });
  const messages = await Message.find({ meeting: meeting._id }).populate('sender', 'name');

  const consolidatedLines = [];
  const seenLineSet = new Set();

  const addLine = (speaker, text) => {
    if (!text || !text.trim()) return;
    const cleanSpeaker = speaker && speaker.trim() ? speaker.trim() : 'Participant';
    const cleanText = text.trim();
    const formatted = `${cleanSpeaker}: ${cleanText}`;
    if (!seenLineSet.has(formatted)) {
      seenLineSet.add(formatted);
      consolidatedLines.push(formatted);
    }
  };

  // 1. From real-time speech segments recorded from all participants
  if (transcriptRecord && Array.isArray(transcriptRecord.segments)) {
    for (const seg of transcriptRecord.segments) {
      addLine(seg.speaker || 'Participant', seg.text);
    }
  }

  // 2. From saved raw transcript text
  if (transcriptRecord && transcriptRecord.rawText) {
    const rawLines = transcriptRecord.rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of rawLines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        addLine(match[1], match[2]);
      } else {
        addLine('Discussion', line);
      }
    }
  }

  // 3. From in-meeting chat messages sent by any attendee (guest or authenticated)
  if (messages && messages.length > 0) {
    for (const msg of messages) {
      if (msg.type !== 'system' && msg.text) {
        const senderName = msg.sender?.name || msg.senderName || 'Participant';
        addLine(senderName, msg.text);
      }
    }
  }

  // 4. From manual/modal submission text
  if (overrideText && overrideText.trim()) {
    const ovLines = overrideText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of ovLines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        addLine(match[1], match[2]);
      } else {
        addLine('Discussion', line);
      }
    }
  }

  const consolidatedText = consolidatedLines.join('\n');

  // Build complete list of all participant names involved in this meeting
  const participantsList = [
    ...new Set([
      meeting.host?.name,
      ...(meeting.participants || []).map((p) => p.user?.name || p.name).filter(Boolean),
      ...consolidatedLines.map((l) => {
        const m = l.match(/^([^:]+):/);
        return m ? m[1].trim() : null;
      }).filter((s) => s && s !== 'Discussion'),
    ]),
  ].filter(Boolean);

  // Sync back to Transcript record
  if (transcriptRecord) {
    if (consolidatedText && consolidatedText.length > (transcriptRecord.rawText || '').length) {
      transcriptRecord.rawText = consolidatedText;
      await transcriptRecord.save();
    }
  } else if (consolidatedText) {
    transcriptRecord = await Transcript.create({
      meeting: meeting._id,
      rawText: consolidatedText,
      source: 'live_captions',
    });
    meeting.transcript = transcriptRecord._id;
    await meeting.save();
  }

  return {
    text: consolidatedText,
    participantsList,
    transcript: transcriptRecord,
    meeting,
  };
};

/**
 * @route   POST /api/ai/transcribe
 * @desc    Submit transcript or process audio file
 * @access  Private
 */
export const submitTranscript = async (req, res, next) => {
  try {
    const { meetingId, rawText, source = 'manual_submission' } = req.body;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Transcript content is required.' });
    }

    const query = meetingId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: meetingId }
      : { meetingCode: meetingId };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Merge incoming transcript with all existing segments and dialogue without overwriting other participants
    const { text: mergedText, transcript } = await consolidateMeetingDialogue(meeting._id, rawText.trim());

    if (transcript) {
      transcript.rawText = mergedText || rawText.trim();
      transcript.source = source;
      transcript.processedByAI = false;
      await transcript.save();
    }

    res.status(200).json({
      success: true,
      message: 'Transcript saved and merged successfully',
      transcript,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/ai/summarize
 * @desc    Process meeting transcript with OpenAI & generate structured summary, decisions, action items
 * @access  Private
 */
/**
 * Core processor for AI Meeting Intelligence (can be invoked by HTTP endpoint or server lifecycle)
 */
export const processMeetingIntelligence = async ({
  meetingId,
  overrideText = null,
  user = null,
  io = null,
}) => {
  const { text: consolidatedText, participantsList, transcript: transcriptRecord, meeting } =
    await consolidateMeetingDialogue(meetingId, overrideText);

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  const textToAnalyze = consolidatedText;

  // If no dialogue was captured, do NOT fabricate fake generic text
  if (!textToAnalyze || textToAnalyze.trim().length < 10) {
    let summary = await MeetingSummary.findOne({ meeting: meeting._id });
    const emptyOverview = `No spoken dialogue or chat messages were recorded during the session "${meeting.title}".

To generate an accurate AI summary of what you discussed, click "Add What Was Discussed" below to enter or paste the key points spoken during the meeting.`;

    if (summary) {
      summary.overview = emptyOverview;
      summary.keyTopics = [];
      summary.decisions = [];
      summary.keywords = ['Unrecorded Session'];
      summary.sentiment = 'neutral';
      summary.modelUsed = 'IntellMeet Dialogue Analyzer';
      await summary.save();
    } else {
      summary = await MeetingSummary.create({
        meeting: meeting._id,
        overview: emptyOverview,
        keyTopics: [],
        decisions: [],
        keywords: ['Unrecorded Session'],
        sentiment: 'neutral',
        modelUsed: 'IntellMeet Dialogue Analyzer',
      });
      meeting.summary = summary._id;
      await meeting.save();
    }

    return {
      summary,
      actionItems: [],
      aiResult: {
        modelUsed: 'IntellMeet Dialogue Analyzer',
        note: 'No dialogue recorded.',
      },
    };
  }

  // Call AI Service with full multi-participant transcript and verified participant list
  const aiResult = await aiService.analyzeMeetingTranscript({
    transcriptText: textToAnalyze,
    meetingTitle: meeting.title,
    participantsList,
  });

  // Save or update MeetingSummary
  let summary = await MeetingSummary.findOne({ meeting: meeting._id });
  if (summary) {
    summary.overview = aiResult.overview;
    summary.keyTopics = aiResult.keyTopics || [];
    summary.decisions = aiResult.decisions || [];
    summary.sentiment = aiResult.sentiment || 'constructive';
    summary.keywords = aiResult.keywords || [];
    summary.modelUsed = aiResult.modelUsed || 'gpt-4o-mini';
    summary.generatedAt = new Date();
    await summary.save();
  } else {
    summary = await MeetingSummary.create({
      meeting: meeting._id,
      overview: aiResult.overview,
      keyTopics: aiResult.keyTopics || [],
      decisions: aiResult.decisions || [],
      sentiment: aiResult.sentiment || 'constructive',
      keywords: aiResult.keywords || [],
      modelUsed: aiResult.modelUsed || 'gpt-4o-mini',
    });
    meeting.summary = summary._id;
    await meeting.save();
  }

  // Mark transcript as processed
  if (transcriptRecord) {
    transcriptRecord.processedByAI = true;
    await transcriptRecord.save();
  }

  // Clear previous AI generated action items for this meeting to avoid duplicates on re-processing
  await ActionItem.deleteMany({ meeting: meeting._id, extractedByAI: true });

  // Save structured action items
  const createdActionItems = [];
  if (Array.isArray(aiResult.actionItems) && aiResult.actionItems.length > 0) {
    for (const item of aiResult.actionItems) {
      let matchedUserId = null;
      let assigneeName = item.assigneeNameText || 'Unassigned';

      if (assigneeName && assigneeName !== 'Unassigned') {
        const userMatch = await User.findOne({
          name: { $regex: new RegExp(`^${assigneeName.trim()}$`, 'i') },
        });
        if (userMatch) {
          matchedUserId = userMatch._id;
          assigneeName = userMatch.name;
        }
      }

      let parsedDueDate = null;
      if (item.dueDateText && item.dueDateText !== 'unspecified' && !isNaN(Date.parse(item.dueDateText))) {
        parsedDueDate = new Date(item.dueDateText);
      }

      const actionItem = await ActionItem.create({
        meeting: meeting._id,
        workspace: meeting.workspace || null,
        title: item.title,
        description: item.description || '',
        assignedTo: matchedUserId,
        assigneeNameText: assigneeName,
        dueDate: parsedDueDate,
        priority: item.priority || 'medium',
        status: 'pending',
        extractedByAI: true,
      });

      createdActionItems.push(actionItem);

      // Notify matched user
      if (matchedUserId && io) {
        const senderId = user?._id || meeting.host?._id || meeting.host;
        await notificationService.notifyActionItemAssigned({
          recipientId: matchedUserId,
          senderId,
          taskTitle: item.title,
          meetingTitle: meeting.title,
          meetingId: meeting._id,
          actionItemId: actionItem._id,
          io,
        });
      }
    }
  }

  // Notify meeting host and attendees that AI summary is ready
  if (io) {
    const currentUserId = user?._id?.toString() || '';
    const notifyUserIds = (meeting.participants || [])
      .map((p) => p.user?._id || p.user)
      .filter((uid) => uid && uid.toString() !== currentUserId);

    const notificationSenderId = user?._id || meeting.host?._id || meeting.host;
    for (const uid of notifyUserIds) {
      await notificationService.createNotification({
        recipientId: uid,
        senderId: notificationSenderId,
        title: 'Meeting Summary Ready',
        message: `AI Summary and Action Items generated for "${meeting.title}"`,
        type: 'summary_ready',
        link: `/meetings/${meeting._id}`,
        metadata: { meetingId: meeting._id },
        io,
      });
    }
  }

  return { summary, actionItems: createdActionItems, aiResult };
};

/**
 * @route   POST /api/ai/summarize
 * @desc    Process meeting transcript with OpenAI & generate structured summary, decisions, action items
 * @access  Private
 */
export const generateMeetingIntelligence = async (req, res, next) => {
  try {
    const { meetingId, transcriptText: overrideText } = req.body;
    const io = req.app.get('io');

    const result = await processMeetingIntelligence({
      meetingId,
      overrideText,
      user: req.user,
      io,
    });

    res.status(200).json({
      success: true,
      message: 'AI Meeting Intelligence generated successfully.',
      summary: result.summary,
      actionItems: result.actionItems,
      modelUsed: result.aiResult.modelUsed,
      warning: result.aiResult.warning || null,
      note: result.aiResult.note || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/ai/summary/:meetingId
 * @desc    Get AI summary, transcript, and action items for a meeting
 * @access  Private
 */
export const getMeetingAIResults = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const { transcript: refreshedTranscript, meeting } =
      await consolidateMeetingDialogue(meetingId);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const summary = await MeetingSummary.findOne({ meeting: meeting._id });
    const actionItems = await ActionItem.find({ meeting: meeting._id })
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      hasSummary: Boolean(summary),
      summary,
      transcript: refreshedTranscript,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/ai/transcript/:meetingId
 * @desc    Get real-time consolidated transcript for a meeting (used by end modal & in-meeting sync)
 * @access  Public / Optional
 */
export const getMeetingTranscript = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { text, transcript, participantsList, meeting } =
      await consolidateMeetingDialogue(meetingId);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.json({
      success: true,
      transcriptText: text,
      transcript,
      participants: participantsList,
    });
  } catch (error) {
    next(error);
  }
};
