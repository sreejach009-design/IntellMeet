import express from 'express';
import { getMeetingMessages, sendMeetingMessage } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/:meetingId')
  .get(getMeetingMessages)
  .post(sendMeetingMessage);

export default router;
