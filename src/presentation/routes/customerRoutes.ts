import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { authenticateCustomer } from '../middleware/auth';

const router = Router();
const customerController = new CustomerController();

// Public routes
router.post('/register', customerController.register);
router.post('/login', customerController.login);

// Protected routes (Customer only)
router.get('/profile', authenticateCustomer, customerController.getProfile);
router.put('/profile', authenticateCustomer, customerController.updateProfile);
router.put('/change-password', authenticateCustomer, customerController.changePassword);
router.get('/shipments', authenticateCustomer, customerController.getShipments);

// Admin routes
router.get('/search', customerController.searchCustomers);

export default router;