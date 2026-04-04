import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';

const router = Router();
const adminController = new AdminController();

// Public — auth gerektirmez
router.get('/public', (req, res) => adminController.getPublicConfig(req, res));

export default router;
