import express from 'express';
import {
  submitTranscript,
  generateMeetingIntelligence,
  getMeetingAIResults,
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/transcribe', submitTranscript);
router.post('/summarize', generateMeetingIntelligence);
router.get('/summary/:meetingId', getMeetingAIResults);

export default router;
