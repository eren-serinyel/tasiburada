import { Router } from 'express';
import { AiController } from '../controllers/AiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const aiController = new AiController();

router.use(authenticateToken);
router.get('/status', aiController.status);
router.post('/chat', aiController.chat);

export default router;
