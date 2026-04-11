import { Router } from 'express';
import { CustomerController } from '../controllers/CustomerController';
import { CustomerOfferController } from '../controllers/CustomerOfferController';
import { CustomerAddressController } from '../controllers/CustomerAddressController';
import { FavoriteCarrierController } from '../controllers/FavoriteCarrierController';
import { authenticateCustomer } from '../middleware/auth';
import { pictureUpload } from '../../infrastructure/upload/uploadMiddleware';
import { CustomerCarrierRelationRepository } from '../../infrastructure/repositories/CustomerCarrierRelationRepository';

const router = Router();
const customerController = new CustomerController();
const customerOfferController = new CustomerOfferController();
const customerAddressController = new CustomerAddressController();
const favoriteCarrierController = new FavoriteCarrierController();

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

// Favorite carrier routes
router.get('/me/favorites', authenticateCustomer, favoriteCarrierController.getFavorites);
router.get('/me/favorites/ids', authenticateCustomer, favoriteCarrierController.getFavoriteIds);
router.post('/me/favorites/:carrierId', authenticateCustomer, favoriteCarrierController.toggle);

// Previous carriers (daha önce çalışılan nakliyeciler)
router.get('/me/previous-carriers', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.user!.customerId!;
    const relations = await CustomerCarrierRelationRepository.findPreviousCarriers(customerId);
    res.json({ success: true, data: relations });
  } catch {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;