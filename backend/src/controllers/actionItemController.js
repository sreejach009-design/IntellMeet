import ActionItem from '../models/ActionItem.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';
import notificationService from '../services/notificationService.js';

/**
 * @route   GET /api/action-items
 * @desc    Get action items for user/workspace/status
 * @access  Private
 */
export const getActionItems = async (req, res, next) => {
  try {
    const { status, workspaceId, meetingId, assignedToMe } = req.query;

    let query = {};

    if (assignedToMe === 'true') {
      query.assignedTo = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (meetingId) {
      query.meeting = meetingId;
    }

    const actionItems = await ActionItem.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('meeting', 'title meetingCode scheduledStart')
      .populate('workspace', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: actionItems.length,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/action-items
 * @desc    Create action item manually
 * @access  Private
 */
export const createActionItem = async (req, res, next) => {
  try {
    const { meetingId, workspaceId, title, description, assignedTo, dueDate, priority } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'Meeting reference is required' });
    }

    let assigneeNameText = 'Unassigned';
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (assignedUser) {
        assigneeNameText = assignedUser.name;
      }
    }

    const actionItem = await ActionItem.create({
      meeting: meetingId,
      workspace: workspaceId || null,
      title: title.trim(),
      description: description ? description.trim() : '',
      assignedTo: assignedTo || null,
      assigneeNameText,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      status: 'pending',
      extractedByAI: false,
    });

    const populated = await ActionItem.findById(actionItem._id)
      .populate('assignedTo', 'name email avatar')
      .populate('meeting', 'title')
      .populate('workspace', 'name');

    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      const io = req.app.get('io');
      await notificationService.notifyActionItemAssigned({
        recipientId: assignedTo,
        senderId: req.user._id,
        taskTitle: actionItem.title,
        meetingTitle: populated.meeting?.title || 'Meeting',
        meetingId: populated.meeting?._id,
        actionItemId: actionItem._id,
        io,
      });
    }

    res.status(201).json({ success: true, actionItem: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/action-items/:id/status
 * @desc    Update action item status
 * @access  Private
 */
export const updateActionItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in-progress', 'completed', 'blocked'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const actionItem = await ActionItem.findById(req.params.id);
    if (!actionItem) {
      return res.status(404).json({ success: false, message: 'Action item not found' });
    }

    actionItem.status = status;
    if (status === 'completed') {
      actionItem.completedAt = new Date();
    } else {
      actionItem.completedAt = null;
    }

    await actionItem.save();

    const populated = await ActionItem.findById(actionItem._id)
      .populate('assignedTo', 'name email avatar')
      .populate('meeting', 'title')
      .populate('workspace', 'name');

    res.json({
      success: true,
      message: `Action item marked as ${status}`,
      actionItem: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/action-items/:id
 * @desc    Delete action item
 * @access  Private
 */
export const deleteActionItem = async (req, res, next) => {
  try {
    const actionItem = await ActionItem.findById(req.params.id);
    if (!actionItem) {
      return res.status(404).json({ success: false, message: 'Action item not found' });
    }

    await ActionItem.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Action item removed' });
  } catch (error) {
    next(error);
  }
};
