import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ConverterController } from '../controllers/ConverterController';
import {
  validateCreateConverterSession,
  validateEstimateConverterRequest,
} from '../middleware/validateConverterRequest';

const router = Router();
const controller = new ConverterController();

router.post('/sessions', authenticateToken, validateCreateConverterSession, controller.createSession);
router.post('/sessions/:sessionId/estimate', authenticateToken, validateEstimateConverterRequest, controller.estimate);
router.get('/sessions/:sessionId/result', authenticateToken, controller.getResult);

export default router;
