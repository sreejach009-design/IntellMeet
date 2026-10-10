export const validateCreateMeeting = (req, res, next) => {
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Meeting title is required.',
    });
  }

  if (title.trim().length > 120) {
    return res.status(400).json({
      success: false,
      message: 'Meeting title cannot exceed 120 characters.',
    });
  }

  next();
};
