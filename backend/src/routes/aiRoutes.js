import express from 'express';
import {
  submitTranscript,
  generateMeetingIntelligence,
  getMeetingAIResults,
  getMeetingTranscript,
} from '../controllers/aiController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/transcribe', optionalProtect, submitTranscript);
router.post('/summarize', optionalProtect, generateMeetingIntelligence);
router.get('/summary/:meetingId', optionalProtect, getMeetingAIResults);
router.get('/transcript/:meetingId', optionalProtect, getMeetingTranscript);

export default router;
