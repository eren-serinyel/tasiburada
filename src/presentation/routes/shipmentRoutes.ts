import { Router } from 'express';
import { authenticateCarrier, authenticateCustomer, authenticateToken, requireVerifiedCarrier } from '../middleware/auth';
import { ShipmentController } from '../controllers/ShipmentController';
import { ShipmentInviteController } from '../controllers/ShipmentInviteController';

const router = Router();
const shipmentController = new ShipmentController();
const inviteController = new ShipmentInviteController();

router.post('/', authenticateCustomer, shipmentController.create);
router.get('/my-shipments', authenticateCustomer, shipmentController.getMyShipments);
router.get('/search', shipmentController.searchShipments);
router.get('/pending', authenticateCarrier, requireVerifiedCarrier, shipmentController.getPending);
router.get('/:id/photos/:photoId', authenticateToken, shipmentController.getPhoto);
router.get('/:id', authenticateToken, shipmentController.getById);
router.put('/:id', authenticateCustomer, shipmentController.update);
router.put('/:id/cancel', authenticateCustomer, shipmentController.cancel);
router.put('/:id/start', authenticateCarrier, requireVerifiedCarrier, shipmentController.start);
router.put('/:id/complete', authenticateCarrier, requireVerifiedCarrier, shipmentController.complete);
router.post('/:id/invite/:carrierId', authenticateCustomer, inviteController.invite);
router.patch('/:id/invite/:carrierId', authenticateCustomer, inviteController.updateRequestedServices);
router.delete('/:id/invite/:carrierId', authenticateCustomer, inviteController.withdraw);

export default router;
