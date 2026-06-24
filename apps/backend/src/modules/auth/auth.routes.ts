import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../validations/validate';
import { registerSchema, loginSchema } from './auth.validation';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/profile', authMiddleware, authController.getProfile);

export default router;
