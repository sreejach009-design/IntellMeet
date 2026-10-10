import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import notificationService from '../services/notificationService.js';

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces the authenticated user belongs to
 * @access  Private
 */
export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
      isArchived: false,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar title department role')
      .sort({ updatedAt: -1 });

    res.json({ success: true, workspaces });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/workspaces
 * @desc    Create new collaborative workspace
 * @access  Private
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'owner',
        },
      ],
    });

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar title department');

    res.status(201).json({
      success: true,
      workspace: populatedWorkspace,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/workspaces/:id
 * @desc    Get single workspace details, its meetings, and its action items
 * @access  Private
 */
export const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar title department role');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Check membership authorization
    const isMember = workspace.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this workspace.',
      });
    }

    // Fetch related meetings and action items
    const meetings = await Meeting.find({ workspace: workspace._id })
      .populate('host', 'name email avatar')
      .sort({ scheduledStart: -1 })
      .limit(10);

    const actionItems = await ActionItem.find({ workspace: workspace._id })
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      workspace,
      meetings,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/workspaces/:id/members
 * @desc    Add member to workspace by email or user ID
 * @access  Private
 */
export const addWorkspaceMember = async (req, res, next) => {
  try {
    const { email, userId, role = 'member' } = req.body;

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Only owner or manager can add members
    const userMemberRecord = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (
      (!userMemberRecord || (userMemberRecord.role !== 'owner' && userMemberRecord.role !== 'manager')) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owners or managers can add members.',
      });
    }

    // Find the user to add
    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found. Ensure the user is registered with that email.',
      });
    }

    // Check if already member
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === targetUser._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this workspace.',
      });
    }

    workspace.members.push({
      user: targetUser._id,
      role: role || 'member',
    });
    await workspace.save();

    const io = req.app.get('io');
    await notificationService.createNotification({
      recipientId: targetUser._id,
      senderId: req.user._id,
      title: 'Added to Workspace',
      message: `${req.user.name} added you to workspace "${workspace.name}"`,
      type: 'workspace_invite',
      link: `/workspaces/${workspace._id}`,
      metadata: { workspaceId: workspace._id },
      io,
    });

    const updated = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar title department role');

    res.json({
      success: true,
      message: `${targetUser.name} added to workspace successfully.`,
      workspace: updated,
    });
  } catch (error) {
    next(error);
  }
};
