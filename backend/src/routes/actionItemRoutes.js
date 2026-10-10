import express from 'express';
import {
  getActionItems,
  createActionItem,
  updateActionItemStatus,
  deleteActionItem,
} from '../controllers/actionItemController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getActionItems)
  .post(createActionItem);

router.route('/:id')
  .delete(deleteActionItem);

router.patch('/:id/status', updateActionItemStatus);

export default router;
