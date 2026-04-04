import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { authenticateCustomer, authenticateAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticateCustomer, PaymentController.createPayment);
router.get('/my', authenticateCustomer, PaymentController.getMyPayments);
router.get('/admin/all', authenticateAdmin, PaymentController.getAllPayments);
router.get('/shipment/:shipmentId', authenticateCustomer, PaymentController.getPaymentByShipment);

export default router;
