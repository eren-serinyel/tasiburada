import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { CustomerOfferController } from '../controllers/CustomerOfferController';
import { CustomerAddressController } from '../controllers/CustomerAddressController';
import { authenticateCustomer } from '../middleware/auth';
import { pictureUpload } from '../../infrastructure/upload/uploadMiddleware';

const router = Router();
const customerController = new CustomerController();
const customerOfferController = new CustomerOfferController();
const customerAddressController = new CustomerAddressController();

// Public routes
router.post('/register', customerController.register);
router.post('/login', customerController.login);

// Protected routes (Customer only)
router.get('/profile', authenticateCustomer, customerController.getProfile);
router.put('/profile', authenticateCustomer, customerController.updateProfile);
router.post('/me/picture', authenticateCustomer, pictureUpload.single('picture'), customerController.uploadPicture);
router.put('/change-password', authenticateCustomer, customerController.changePassword);
router.get('/shipments', authenticateCustomer, customerController.getShipments);
router.get('/offers', authenticateCustomer, customerOfferController.getMyOffers);

// Admin routes
router.get('/search', authenticateCustomer, customerController.searchCustomers);

// Address routes
router.get('/me/addresses', authenticateCustomer, customerAddressController.getAddresses);
router.post('/me/addresses', authenticateCustomer, customerAddressController.addAddress);
router.put('/me/addresses/:id', authenticateCustomer, customerAddressController.updateAddress);
router.delete('/me/addresses/:id', authenticateCustomer, customerAddressController.deleteAddress);
router.put('/me/addresses/:id/default', authenticateCustomer, customerAddressController.setDefault);

export default router;