import { Router } from 'express';
import { AdminAuthController } from '../controllers/AdminAuthController';
import { AdminController } from '../controllers/AdminController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();
const authController = new AdminAuthController();
const adminController = new AdminController();

// ─── Public ────────────────────────────────────────────────────────────────
router.post('/login', authController.login);

// ─── Protected ─────────────────────────────────────────────────────────────
router.use(authenticateAdmin as any);

router.get('/me', authController.me);

// Stats
router.get('/stats', adminController.getStats);

// Carriers
router.get('/carriers', adminController.getCarriers);
router.get('/carriers/:carrierId', adminController.getCarrierById);
router.put('/carriers/:carrierId/verify', adminController.verifyCarrier);
router.get('/carriers/:carrierId/documents', adminController.getCarrierDocuments);

// Customers
router.get('/customers', adminController.getCustomers);
router.put('/customers/:customerId/toggle-active', adminController.toggleCustomerActive);

// Shipments
router.get('/shipments', adminController.getShipments);

// Reviews
router.get('/reviews', adminController.getReviews);
router.delete('/reviews/:reviewId', adminController.deleteReview);

// Audit Log
router.get('/audit-log', adminController.getAuditLogs);

export default router;
