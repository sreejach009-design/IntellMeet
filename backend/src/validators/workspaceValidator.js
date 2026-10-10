export const validateCreateWorkspace = (req, res, next) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Workspace name is required.',
    });
  }

  if (name.trim().length > 80) {
    return res.status(400).json({
      success: false,
      message: 'Workspace name cannot exceed 80 characters.',
    });
  }

  next();
};
