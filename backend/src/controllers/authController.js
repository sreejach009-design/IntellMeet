import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user, create default workspace, return JWT
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, title, department } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'member',
      title: title || 'Product Engineer',
      department: department || 'Engineering',
    });

    // Create a default Personal Workspace for user
    const defaultWorkspace = await Workspace.create({
      name: `${user.name}'s Workspace`,
      description: 'Default personal team workspace for meetings and collaborative initiatives.',
      owner: user._id,
      members: [
        {
          user: user._id,
          role: 'owner',
        },
      ],
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        theme: user.theme,
        defaultWorkspaceId: defaultWorkspace._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        department: user.department,
        avatar: user.avatar,
        theme: user.theme,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
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
 * @route   POST /api/auth/logout
 * @desc    Log user out (clears token on client)
 * @access  Private
 */
export const logout = (req, res) => {
  res.json({
    success: true,
    message: 'User successfully logged out.',
  });
};
