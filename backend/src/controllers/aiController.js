import Meeting from '../models/Meeting.js';
import Transcript from '../models/Transcript.js';
import MeetingSummary from '../models/MeetingSummary.js';
import ActionItem from '../models/ActionItem.js';
import User from '../models/User.js';
import aiService from '../services/aiService.js';
import notificationService from '../services/notificationService.js';

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

    // Upsert transcript
    let transcript = await Transcript.findOne({ meeting: meeting._id });
    if (transcript) {
      transcript.rawText = rawText.trim();
      transcript.source = source;
      transcript.processedByAI = false;
      await transcript.save();
    } else {
      transcript = await Transcript.create({
        meeting: meeting._id,
        rawText: rawText.trim(),
        source,
      });
      meeting.transcript = transcript._id;
      await meeting.save();
    }

    res.status(200).json({
      success: true,
      message: 'Transcript saved successfully',
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
export const generateMeetingIntelligence = async (req, res, next) => {
  try {
    const { meetingId, transcriptText: overrideText } = req.body;

    const query = meetingId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: meetingId }
      : { meetingCode: meetingId };

    const meeting = await Meeting.findOne(query)
      .populate('participants.user', 'name email')
      .populate('host', 'name email');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Determine text to analyze
    let textToAnalyze = overrideText;
    let transcriptRecord = null;

    if (!textToAnalyze) {
      transcriptRecord = await Transcript.findOne({ meeting: meeting._id });
      if (transcriptRecord) {
        textToAnalyze = transcriptRecord.rawText;
      }
    }

    if (!textToAnalyze || textToAnalyze.trim().length < 15) {
      return res.status(400).json({
        success: false,
        message: 'No transcript found for this meeting. Please provide or upload a transcript first.',
      });
    }

    // Save or update transcript if supplied directly
    if (overrideText && (!transcriptRecord || overrideText !== transcriptRecord.rawText)) {
      if (transcriptRecord) {
        transcriptRecord.rawText = overrideText;
        await transcriptRecord.save();
      } else {
        transcriptRecord = await Transcript.create({
          meeting: meeting._id,
          rawText: overrideText,
          source: 'manual_submission',
        });
        meeting.transcript = transcriptRecord._id;
        await meeting.save();
      }
    }

    // Build participant names for reference in OpenAI extraction
    const participantNames = (meeting.participants || [])
      .map((p) => p.user?.name)
      .filter(Boolean);

    if (meeting.host?.name && !participantNames.includes(meeting.host.name)) {
      participantNames.push(meeting.host.name);
    }

    // Call AI Service
    const aiResult = await aiService.analyzeMeetingTranscript({
      transcriptText: textToAnalyze,
      meetingTitle: meeting.title,
      participantsList: participantNames,
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
    const io = req.app.get('io');

    if (Array.isArray(aiResult.actionItems) && aiResult.actionItems.length > 0) {
      for (const item of aiResult.actionItems) {
        // Attempt to match assignee to known user by name
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
        if (matchedUserId) {
          await notificationService.notifyActionItemAssigned({
            recipientId: matchedUserId,
            senderId: req.user._id,
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
    const notifyUserIds = (meeting.participants || [])
      .map((p) => p.user?._id || p.user)
      .filter((uid) => uid.toString() !== req.user._id.toString());

    for (const uid of notifyUserIds) {
      await notificationService.createNotification({
        recipientId: uid,
        senderId: req.user._id,
        title: 'Meeting Summary Ready',
        message: `AI Summary and Action Items generated for "${meeting.title}"`,
        type: 'summary_ready',
        link: `/meetings/${meeting._id}`,
        metadata: { meetingId: meeting._id },
        io,
      });
    }

    res.status(200).json({
      success: true,
      message: 'AI Meeting Intelligence generated successfully.',
      summary,
      actionItems: createdActionItems,
      modelUsed: aiResult.modelUsed,
      warning: aiResult.warning || null,
      note: aiResult.note || null,
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

    const query = meetingId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: meetingId }
      : { meetingCode: meetingId };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const summary = await MeetingSummary.findOne({ meeting: meeting._id });
    const transcript = await Transcript.findOne({ meeting: meeting._id });
    const actionItems = await ActionItem.find({ meeting: meeting._id })
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      hasSummary: Boolean(summary),
      summary,
      transcript,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};
