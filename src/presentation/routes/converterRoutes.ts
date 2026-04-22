import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ConverterController } from '../controllers/ConverterController';
import {
  validateApplyConverterRequest,
  validateCreateConverterSession,
  validateEstimateConverterRequest,
} from '../middleware/validateConverterRequest';

const router = Router();
const controller = new ConverterController();

router.post('/sessions', authenticateToken, validateCreateConverterSession, controller.createSession);
router.post('/sessions/:sessionId/estimate', authenticateToken, validateEstimateConverterRequest, controller.estimate);
router.get('/sessions/:sessionId/result', authenticateToken, controller.getResult);
router.post('/sessions/:sessionId/apply-to-shipment', authenticateToken, validateApplyConverterRequest, controller.applyToShipment);

export default router;
