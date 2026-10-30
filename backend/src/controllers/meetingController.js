import Meeting from '../models/Meeting.js';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import MeetingSummary from '../models/MeetingSummary.js';
import Transcript from '../models/Transcript.js';
import notificationService from '../services/notificationService.js';
import { processMeetingIntelligence } from './aiController.js';

/**
 * @route   GET /api/meetings
 * @desc    Get meetings for authenticated user with filters
 * @access  Private
 */
export const getMeetings = async (req, res, next) => {
  try {
    const { status, workspaceId, timeframe, search } = req.query;

    let query = {
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
        { invitedEmails: req.user.email },
      ],
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (timeframe === 'upcoming') {
      query.status = { $in: ['scheduled', 'in-progress'] };
      query.scheduledStart = { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }; // Include recently active
    } else if (timeframe === 'past') {
      query.status = 'completed';
    }

    const meetings = await Meeting.find(query)
      .populate('host', 'name email avatar')
      .populate('workspace', 'name')
      .populate('summary', 'overview sentiment keywords')
      .sort({ scheduledStart: timeframe === 'past' ? -1 : 1 });

    res.json({ success: true, count: meetings.length, meetings });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/meetings
 * @desc    Create an instant or scheduled meeting
 * @access  Private
 */
export const createMeeting = async (req, res, next) => {
  try {
    const {
      title,
      description,
      workspaceId,
      scheduledStart,
      scheduledEnd,
      isInstant,
      passcode,
      invitedEmails = [],
    } = req.body;

    // If workspace is specified, verify membership
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ success: false, message: 'Workspace not found' });
      }
      const isMember = workspace.members.some(
        (m) => m.user.toString() === req.user._id.toString()
      );
      if (!isMember && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this workspace.',
        });
      }
    }

    const defaultTitle = `${req.user?.name || 'User'}'s Instant Meeting`;
    const meeting = await Meeting.create({
      title: (title && typeof title === 'string' && title.trim().length > 0) ? title.trim() : defaultTitle,
      description: description ? description.trim() : '',
      host: req.user._id,
      workspace: workspaceId || null,
      scheduledStart: isInstant ? new Date() : (scheduledStart ? new Date(scheduledStart) : new Date()),
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : new Date(Date.now() + 45 * 60 * 1000),
      isInstant: Boolean(isInstant),
      status: isInstant ? 'in-progress' : 'scheduled',
      actualStart: isInstant ? new Date() : null,
      passcode: passcode || '',
      invitedEmails: Array.isArray(invitedEmails) ? invitedEmails.map((e) => e.trim().toLowerCase()) : [],
      participants: [
        {
          user: req.user._id,
          role: 'host',
          joinedAt: new Date(),
        },
      ],
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email avatar')
      .populate('workspace', 'name');

    // Send notifications if emails match registered users
    if (invitedEmails && invitedEmails.length > 0) {
      const invitedUsers = await User.find({ email: { $in: invitedEmails } });
      const io = req.app.get('io');
      if (invitedUsers.length > 0) {
        await notificationService.notifyMeetingInvite({
          recipients: invitedUsers.map((u) => u._id),
          senderId: req.user._id,
          meetingTitle: meeting.title,
          meetingId: meeting._id,
          io,
        });
      }
    }

    res.status(201).json({
      success: true,
      meeting: populatedMeeting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/meetings/:id
 * @desc    Get meeting details by ID or meetingCode
 * @access  Private
 */
export const getMeetingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ID is a Mongo ObjectId or a meetingCode (e.g. 'abc-defg-hij')
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { meetingCode: id };

    const meeting = await Meeting.findOne(query)
      .populate('host', 'name email avatar title department')
      .populate('workspace', 'name description')
      .populate('participants.user', 'name email avatar title department')
      .populate('summary')
      .populate('transcript');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/meetings/:id
 * @desc    Update meeting details
 * @access  Private
 */
export const updateMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Host or Admin check
    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host can modify meeting details.',
      });
    }

    const { title, description, scheduledStart, scheduledEnd, status } = req.body;
    if (title) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description.trim();
    if (scheduledStart) meeting.scheduledStart = new Date(scheduledStart);
    if (scheduledEnd) meeting.scheduledEnd = new Date(scheduledEnd);
    if (status) meeting.status = status;

    await meeting.save();

    const updated = await Meeting.findById(meeting._id)
      .populate('host', 'name email avatar')
      .populate('workspace', 'name');

    res.json({ success: true, meeting: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Cancel / delete meeting
 * @access  Private
 */
export const deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host can cancel this meeting.',
      });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.json({ success: true, message: 'Meeting cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/meetings/:id/join
 * @desc    Join a meeting and record participation
 * @access  Private
 */
export const joinMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { meetingCode: id };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This meeting was cancelled.' });
    }

    // Update status to in-progress if scheduled
    if (meeting.status === 'scheduled') {
      meeting.status = 'in-progress';
      meeting.actualStart = new Date();
    }

    // Check if participant already recorded
    if (req.user) {
      const existingIndex = meeting.participants.findIndex(
        (p) => p.user && p.user.toString() === req.user._id.toString()
      );

      if (existingIndex >= 0) {
        meeting.participants[existingIndex].joinedAt = new Date();
        meeting.participants[existingIndex].leftAt = null;
      } else {
        meeting.participants.push({
          user: req.user._id,
          name: req.user.name || '',
          role: meeting.host.toString() === req.user._id.toString() ? 'host' : 'attendee',
          joinedAt: new Date(),
        });
      }
    } else if (req.body.name || req.body.guestName) {
      const gName = (req.body.name || req.body.guestName).trim();
      const existingIndex = meeting.participants.findIndex(
        (p) => p.name && p.name.toLowerCase() === gName.toLowerCase()
      );

      if (existingIndex >= 0) {
        meeting.participants[existingIndex].joinedAt = new Date();
        meeting.participants[existingIndex].leftAt = null;
      } else {
        meeting.participants.push({
          name: gName,
          isGuest: true,
          role: 'attendee',
          joinedAt: new Date(),
        });
      }
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar title department');

    res.json({
      success: true,
      message: 'Joined meeting successfully',
      meeting: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/meetings/:id/end
 * @desc    End meeting and compute duration
 * @access  Private
 */
export const endMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { meetingCode: id };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host can conclude this meeting.',
      });
    }

    meeting.status = 'completed';
    meeting.actualEnd = new Date();

    const startTime = meeting.actualStart || meeting.scheduledStart || new Date();
    const durationMs = meeting.actualEnd.getTime() - new Date(startTime).getTime();
    meeting.durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    await meeting.save();

    const io = req.app.get('io');

    const { transcriptText, transcript } = req.body;
    const dialogueOverride = (transcriptText || transcript || '').trim() || null;

    // Automatically trigger AI intelligence generation immediately when meeting concludes
    let summaryResult = null;
    try {
      summaryResult = await processMeetingIntelligence({
        meetingId: meeting._id,
        overrideText: dialogueOverride,
        user: req.user,
        io,
      });
    } catch (aiErr) {
      console.warn('[Auto summary on end error]:', aiErr.message);
    }

    // Broadcast meeting:ended event to all connected room participants via Socket.io
    if (io) {
      io.to(`meeting:${meeting._id}`).emit('meeting:ended', {
        meetingId: meeting._id,
        meetingCode: meeting.meetingCode,
        summaryReady: Boolean(summaryResult),
      });
      if (meeting.meetingCode) {
        io.to(`meeting:${meeting.meetingCode}`).emit('meeting:ended', {
          meetingId: meeting._id,
          meetingCode: meeting.meetingCode,
          summaryReady: Boolean(summaryResult),
        });
      }
    }

    res.json({
      success: true,
      message: 'Meeting completed successfully',
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/meetings/stats/dashboard
 * @desc    Get dashboard metrics and counts
 * @access  Private
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const userMeetingQuery = {
      $or: [
        { host: userId },
        { 'participants.user': userId },
      ],
    };

    const totalMeetings = await Meeting.countDocuments(userMeetingQuery);
    const completedMeetings = await Meeting.find({
      ...userMeetingQuery,
      status: 'completed',
    }).select('durationMinutes');

    const totalDurationMinutes = completedMeetings.reduce(
      (sum, m) => sum + (m.durationMinutes || 0),
      0
    );

    const upcomingCount = await Meeting.countDocuments({
      ...userMeetingQuery,
      status: { $in: ['scheduled', 'in-progress'] },
    });

    const recentMeetings = await Meeting.find(userMeetingQuery)
      .populate('host', 'name email avatar')
      .populate('summary', 'overview sentiment')
      .sort({ updatedAt: -1 })
      .limit(5);

    const upcomingMeetings = await Meeting.find({
      ...userMeetingQuery,
      status: { $in: ['scheduled', 'in-progress'] },
    })
      .populate('host', 'name email avatar')
      .populate('workspace', 'name')
      .sort({ scheduledStart: 1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalMeetings,
        totalDurationMinutes,
        upcomingCount,
        completedCount: completedMeetings.length,
      },
      upcomingMeetings,
      recentMeetings,
    });
  } catch (error) {
    next(error);
  }
};
