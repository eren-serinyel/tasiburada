import { Router } from 'express';
import { VehicleTypeController } from '../controllers/VehicleTypeController';

const router = Router();
const controller = new VehicleTypeController();

// GET /api/v1/vehicle-types
router.get('/', controller.list.bind(controller));

export default router;
