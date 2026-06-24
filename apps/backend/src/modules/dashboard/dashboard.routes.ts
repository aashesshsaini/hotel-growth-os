import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware } from '../../middlewares/hotelAccessMiddleware';
import { dashboard } from './dashboard.controller';
const router = Router();
router.use(authMiddleware, hotelAccessMiddleware);
router.get('/', dashboard);
export default router;
