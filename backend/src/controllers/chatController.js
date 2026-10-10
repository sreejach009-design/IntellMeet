import Message from '../models/Message.js';
import Meeting from '../models/Meeting.js';

/**
 * @route   GET /api/chat/:meetingId
 * @desc    Get chat messages for a meeting
 * @access  Private
 */
export const getMeetingMessages = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const query = meetingId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: meetingId }
      : { meetingCode: meetingId };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const messages = await Message.find({ meeting: meeting._id })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/chat/:meetingId
 * @desc    Send a message in a meeting (REST endpoint)
 * @access  Private
 */
export const sendMeetingMessage = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { text, type = 'chat' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const query = meetingId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: meetingId }
      : { meetingCode: meetingId };

    const meeting = await Meeting.findOne(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const message = await Message.create({
      meeting: meeting._id,
      sender: req.user._id,
      text: text.trim(),
      type,
    });

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email avatar'
    );

    // Broadcast via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`meeting:${meeting._id}`).emit('chat:message', populatedMessage);
      if (meeting.meetingCode) {
        io.to(`meeting:${meeting.meetingCode}`).emit('chat:message', populatedMessage);
      }
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
};
