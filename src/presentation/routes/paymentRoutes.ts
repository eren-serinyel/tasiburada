import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticateCustomer, authenticateAdmin, authenticateCarrier } from '../middleware/auth';

const router = Router();

router.post('/', authenticateCustomer, PaymentController.createPayment);
router.get('/my', authenticateCustomer, PaymentController.getMyPayments);
router.get('/carrier/my', authenticateCarrier, PaymentController.getMyCarrierPayments);
router.get('/admin/all', authenticateAdmin, PaymentController.getAllPayments);
router.post('/:paymentId/confirm-release', authenticateCustomer, PaymentController.confirmRelease);
router.get('/shipment/:shipmentId', authenticateCustomer, PaymentController.getPaymentByShipment);

export default router;
