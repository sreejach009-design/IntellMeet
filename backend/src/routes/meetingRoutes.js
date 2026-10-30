import express from 'express';
import {
  getMeetings,
  createMeeting,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  endMeeting,
  getDashboardStats,
} from '../controllers/meetingController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { validateCreateMeeting } from '../validators/meetingValidator.js';

const router = express.Router();

router.get('/stats/dashboard', protect, getDashboardStats);

router.route('/')
  .get(protect, getMeetings)
  .post(protect, validateCreateMeeting, createMeeting);

router.route('/:id')
  .get(optionalProtect, getMeetingById)
  .put(protect, updateMeeting)
  .delete(protect, deleteMeeting);

router.post('/:id/join', optionalProtect, joinMeeting);
router.post('/:id/end', protect, endMeeting);

export default router;
