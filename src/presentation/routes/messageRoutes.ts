import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
import { authenticateCustomer } from '../middleware/auth';
import { authenticateCarrier } from '../middleware/auth';

const router = Router();
const messageController = new MessageController();

router.post('/', authenticateCustomer, messageController.sendMessage);
router.get('/shipment/:shipmentId', authenticateCustomer, messageController.getMessages);

router.post('/carrier', authenticateCarrier, messageController.sendMessage);
router.get('/carrier/shipment/:shipmentId', authenticateCarrier, messageController.getMessages);

export default router;
