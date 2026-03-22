import { Router } from 'express';
import { authenticateCustomer, authenticateCarrier, authenticateToken } from '../middleware/auth';
import { OfferController } from '../controllers/OfferController';

const router = Router();
const offerController = new OfferController();

router.post('/', authenticateCarrier, offerController.create);
router.get('/:id', authenticateToken, offerController.getById);
router.put('/:id/accept', authenticateCustomer, offerController.accept);
router.put('/:id/reject', authenticateCustomer, offerController.reject);

export default router;
