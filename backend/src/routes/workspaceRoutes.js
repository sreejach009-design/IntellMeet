import express from 'express';
import {
  getWorkspaces,
  createWorkspace,
  getWorkspaceById,
  addWorkspaceMember,
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateCreateWorkspace } from '../validators/workspaceValidator.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getWorkspaces)
  .post(validateCreateWorkspace, createWorkspace);

router.route('/:id')
  .get(getWorkspaceById);

router.post('/:id/members', addWorkspaceMember);

export default router;
