import { Router } from 'express';
import * as ProductController from './product.controller';
import { verifyToken, checkBlocked } from '../../middlewares';

const router = Router();

router.post('/', verifyToken, checkBlocked, ProductController.createProduct);
router.get('/', ProductController.getProducts);
router.get('/user/my-products', verifyToken, ProductController.getMyProducts);
router.get('/:id', ProductController.getProductById);
router.patch('/:id', verifyToken, checkBlocked, ProductController.updateProduct);
router.delete('/:id', verifyToken, checkBlocked, ProductController.deleteProduct);

export const ProductRoutes = router;
