import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { CustomerOfferController } from '../controllers/CustomerOfferController';
import { authenticateCustomer } from '../middleware/auth';

const router = Router();
const customerController = new CustomerController();
const customerOfferController = new CustomerOfferController();

// Public routes
router.post('/register', customerController.register);
router.post('/login', customerController.login);

// Protected routes (Customer only)
router.get('/profile', authenticateCustomer, customerController.getProfile);
router.put('/profile', authenticateCustomer, customerController.updateProfile);
router.put('/change-password', authenticateCustomer, customerController.changePassword);
router.get('/shipments', authenticateCustomer, customerController.getShipments);
router.get('/offers', authenticateCustomer, customerOfferController.getMyOffers);

// Admin routes
router.get('/search', authenticateCustomer, customerController.searchCustomers);

export default router;