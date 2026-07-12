import { Router } from 'express';
import * as UserController from './user.controller';
import { verifyToken, checkBlocked } from '../../middlewares';

const router = Router();

router.get('/stats', verifyToken, UserController.getUserStats);
router.get('/profile', verifyToken, UserController.getUserProfile);
router.patch('/profile', verifyToken, checkBlocked, UserController.updateUserProfile);

export const UserRoutes = router;
