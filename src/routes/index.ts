import { Router } from 'express';
import { ProductRoutes } from '../modules/product';
import { UserRoutes } from '../modules/user';
import { AdminRoutes } from '../modules/admin';

const router = Router();

router.use('/products', ProductRoutes);
router.use('/users', UserRoutes);
router.use('/admin', AdminRoutes);

export default router;
