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
import { protect } from '../middleware/authMiddleware.js';
import { validateCreateMeeting } from '../validators/meetingValidator.js';

const router = express.Router();

router.use(protect);

router.get('/stats/dashboard', getDashboardStats);

router.route('/')
  .get(getMeetings)
  .post(validateCreateMeeting, createMeeting);

router.route('/:id')
  .get(getMeetingById)
  .put(updateMeeting)
  .delete(deleteMeeting);

router.post('/:id/join', joinMeeting);
router.post('/:id/end', endMeeting);

export default router;
