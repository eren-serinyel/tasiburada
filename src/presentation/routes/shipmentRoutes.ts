import { Router } from 'express';
import { authenticateCarrier, authenticateCustomer } from '../middleware/auth';
import { ShipmentController } from '../controllers/ShipmentController';

const router = Router();
const shipmentController = new ShipmentController();

router.post('/', authenticateCustomer, shipmentController.create);
router.get('/my-shipments', authenticateCustomer, shipmentController.getMyShipments);
router.get('/pending', authenticateCarrier, shipmentController.getPending);
router.get('/:id', shipmentController.getById);
router.put('/:id', authenticateCustomer, shipmentController.update);
router.put('/:id/cancel', authenticateCustomer, shipmentController.cancel);

export default router;
