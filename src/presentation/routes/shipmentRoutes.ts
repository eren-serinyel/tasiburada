import { Router } from 'express';
import { authenticateCarrier, authenticateCustomer, authenticateToken } from '../middleware/auth';
import { ShipmentController } from '../controllers/ShipmentController';
import { ShipmentInviteController } from '../controllers/ShipmentInviteController';

const router = Router();
const shipmentController = new ShipmentController();
const inviteController = new ShipmentInviteController();

router.post('/', authenticateCustomer, shipmentController.create);
router.get('/my-shipments', authenticateCustomer, shipmentController.getMyShipments);
router.get('/search', shipmentController.searchShipments);
router.get('/pending', authenticateCarrier, shipmentController.getPending);
router.get('/:id', authenticateToken, shipmentController.getById);
router.put('/:id', authenticateCustomer, shipmentController.update);
router.put('/:id/assign-carrier', authenticateCustomer, shipmentController.assignCarrier);
router.put('/:id/cancel', authenticateCustomer, shipmentController.cancel);
router.put('/:id/start', authenticateCarrier, shipmentController.start);
router.put('/:id/complete', authenticateCarrier, shipmentController.complete);
router.post('/:id/invite/:carrierId', authenticateCustomer, inviteController.invite);

export default router;
