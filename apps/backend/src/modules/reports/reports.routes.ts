import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware } from '../../middlewares/hotelAccessMiddleware';
import { reports } from './reports.controller';
const router = Router();
router.use(authMiddleware, hotelAccessMiddleware);
router.get('/', reports);
export default router;
