import { Router } from 'express';
import { authenticateCustomer, authenticateCarrier, authenticateToken, requireVerifiedCarrier } from '../middleware/auth';
import { checkCarrierProfileCompletion } from '../middleware/checkCarrierProfileCompletion';
import { OfferController } from '../controllers/OfferController';

const router = Router();
const offerController = new OfferController();

router.post('/',
  authenticateCarrier,
  requireVerifiedCarrier,
  checkCarrierProfileCompletion(75),
  offerController.create
);
router.get('/:id', authenticateToken, offerController.getById);
router.put('/:id/accept', authenticateCustomer, offerController.accept);
router.post('/:id/accept', authenticateCustomer, offerController.accept);
router.put('/:id/reject', authenticateCustomer, offerController.reject);
router.post('/:id/reject', authenticateCustomer, offerController.reject);
router.put('/:id/withdraw', authenticateCarrier, requireVerifiedCarrier, offerController.withdraw);
router.post('/:id/withdraw', authenticateCarrier, requireVerifiedCarrier, offerController.withdraw);
router.put('/:id', authenticateCarrier, requireVerifiedCarrier, offerController.update);

export default router;
