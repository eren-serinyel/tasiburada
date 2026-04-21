import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

router.get('/check-email', authController.checkEmail);
router.post('/forgot-password', passwordResetLimiter, authController.requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.get('/resend-verification', authLimiter, authController.resendVerification);

export default router;
