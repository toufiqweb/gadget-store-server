import { Router } from 'express';
import * as AdminController from './admin.controller';
import { verifyToken, verifyAdmin } from '../../middlewares';

const router = Router();

router.get('/stats', verifyToken, verifyAdmin, AdminController.getAdminStats);
router.get('/products', verifyToken, verifyAdmin, AdminController.getAdminProducts);
router.get('/users', verifyToken, verifyAdmin, AdminController.getAdminUsers);
router.patch('/users/:id/status', verifyToken, verifyAdmin, AdminController.updateUserStatus);
router.patch('/users/:id/role', verifyToken, verifyAdmin, AdminController.updateUserRole);

export const AdminRoutes = router;
