import { Router } from 'express';
import { AdminAuthController } from '../controllers/AdminAuthController';
import { AdminController } from '../controllers/AdminController';
import { authenticateAdmin, requireSuperadmin } from '../middleware/auth';

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
router.get('/stats/trends', adminController.getStatsTrends);

// Carriers
router.get('/carriers', adminController.getCarriers);
router.get('/carriers/:carrierId', adminController.getCarrierById);
router.put('/carriers/:carrierId', adminController.updateCarrier);
router.put('/carriers/:carrierId/verify', adminController.verifyCarrier);
router.get('/carriers/:carrierId/documents', adminController.getCarrierDocuments);
router.get('/carriers/:carrierId/shipments', adminController.getCarrierShipments);
router.get('/carriers/:carrierId/reviews', adminController.getCarrierReviews);

// Customers
router.get('/customers', adminController.getCustomers);
router.put('/customers/:customerId/toggle-active', adminController.toggleCustomerActive);

// Shipments
router.get('/shipments', adminController.getShipments);

// Reviews
router.get('/reviews', adminController.getReviews);
router.delete('/reviews/:reviewId', adminController.deleteReview);

// Offers
router.get('/offers', adminController.getOffers);
router.put('/offers/:offerId/cancel', adminController.cancelOffer);
router.delete('/offers/:offerId', adminController.deleteOffer);

// Documents
router.get('/documents', adminController.getDocuments);
router.put('/documents/:documentId/verify', adminController.verifyDocument);

// Reports
router.get('/reports/overview', adminController.getReportsOverview);
router.get('/reports/top-carriers', adminController.getTopCarriers);
router.get('/reports/popular-routes', adminController.getPopularRoutes);

// Audit Log
router.get('/audit-log', adminController.getAuditLogs);
router.post('/audit-log', adminController.createAuditLog);

// Platform Settings (superadmin only)
router.get('/settings', adminController.getSettings);
router.put('/settings', requireSuperadmin as any, adminController.updateSettings);

// Admin Management (superadmin only)
router.get('/admins', adminController.getAdmins);
router.post('/admins', requireSuperadmin as any, adminController.createAdmin);
router.put('/admins/:adminId', requireSuperadmin as any, adminController.updateAdmin);
router.delete('/admins/:adminId', requireSuperadmin as any, adminController.deleteAdminUser);
router.post('/admins/:adminId/reset-password', requireSuperadmin as any, adminController.resetAdminPassword);

export default router;
