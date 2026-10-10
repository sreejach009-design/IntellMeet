import User from '../models/User.js';

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile details
 * @access  Private
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile & preferences
 * @access  Private
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, title, department, avatar, theme, notificationPreferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (title !== undefined) user.title = title;
    if (department !== undefined) user.department = department;
    if (avatar !== undefined) user.avatar = avatar;
    if (theme) user.theme = theme;
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences.toObject(),
        ...notificationPreferences,
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        theme: user.theme,
        notificationPreferences: user.notificationPreferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/change-password
 * @desc    Change password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/search
 * @desc    Search users by name or email for invites
 * @access  Private
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      const recentUsers = await User.find({ _id: { $ne: req.user._id } })
        .select('name email avatar title department role')
        .limit(10);
      return res.json({ success: true, users: recentUsers });
    }

    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email avatar title department role')
      .limit(15);

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};
