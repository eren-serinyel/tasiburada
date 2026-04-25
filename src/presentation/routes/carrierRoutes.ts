import { Router } from 'express';
import { CarrierAuthController } from '../controllers/CarrierAuthController';
import { CarrierProfileController } from '../controllers/CarrierProfileController';
import { CarrierDocumentController } from '../controllers/CarrierDocumentController';
import { authenticateCarrier } from '../middleware/auth';
import { CarrierSearchController } from '../controllers/CarrierSearchController';
import { CarrierDetailController } from '../controllers/CarrierDetailController';
import { CarrierDashboardController } from '../controllers/CarrierDashboardController';
import { CarrierReviewController } from '../controllers/CarrierReviewController';
import { OfferController } from '../controllers/OfferController';
import { ShipmentInviteController } from '../controllers/ShipmentInviteController';
import { documentUpload, pictureUpload } from '../../infrastructure/upload/uploadMiddleware';
import { approvalSubmitLimiter, authLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new CarrierAuthController();
const profileController = new CarrierProfileController();
const documentController = new CarrierDocumentController();
const searchController = new CarrierSearchController();
const detailController = new CarrierDetailController();
const dashboardController = new CarrierDashboardController();
const reviewController = new CarrierReviewController();
const offerController = new OfferController();
const inviteController = new ShipmentInviteController();


// Public auth routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/availability-summary', searchController.getAvailabilitySummary);
router.get('/search', searchController.search);
router.get('/:carrierId/detail', detailController.getDetail);

// Authenticated carrier routes
router.get('/me', authenticateCarrier, authController.me);
router.get('/me/stats', authenticateCarrier, dashboardController.getStats);
router.get('/me/earnings-history', authenticateCarrier, dashboardController.getEarningsHistory);
router.get('/:carrierId/stats', authenticateCarrier, dashboardController.getStats); // Alias for ID access

router.get('/me/profile-status', authenticateCarrier, profileController.getProfileStatus);
router.put('/me/profile-status', authenticateCarrier, profileController.refreshProfileStatus);
router.post('/me/submit-for-approval', authenticateCarrier, approvalSubmitLimiter, profileController.submitForApproval);
router.put('/me/company-info', authenticateCarrier, profileController.updateCompanyInfo);
router.get('/me/activity', authenticateCarrier, profileController.getActivityInfo);
router.put('/me/activity', authenticateCarrier, profileController.updateActivityInfo);
router.put('/me/vehicle-types', authenticateCarrier, profileController.updateVehicleTypes);
router.put('/me/service-types', authenticateCarrier, profileController.updateServiceTypes);
router.get('/me/vehicles', authenticateCarrier, profileController.listVehicles);
router.post('/me/vehicles', authenticateCarrier, profileController.createVehicle);
router.put('/me/vehicles', authenticateCarrier, profileController.upsertVehicles);
router.put('/me/vehicles/:vehicleId', authenticateCarrier, profileController.updateVehicleById);
router.delete('/me/vehicles/:vehicleId', authenticateCarrier, profileController.deleteVehicleById);
router.post('/me/vehicles/:vehicleId/photos', authenticateCarrier, pictureUpload.array('photos', 8), profileController.addVehiclePhotos);
router.delete('/me/vehicles/:vehicleId/photos/:photoId', authenticateCarrier, profileController.deleteVehiclePhoto);
router.get('/me/documents', authenticateCarrier, documentController.getDocuments);
router.get('/me/documents/:documentId/download', authenticateCarrier, documentController.downloadDocument);
router.delete('/me/documents/:documentId', authenticateCarrier, documentController.deleteDocument);
router.put('/me/documents', authenticateCarrier, documentUpload.single('file'), documentController.updateDocuments);
router.put('/me/earnings', authenticateCarrier, profileController.updateEarnings);
router.put('/me/profile-picture', authenticateCarrier, pictureUpload.single('picture'), profileController.updateProfilePicture);
router.put('/me/security', authenticateCarrier, profileController.updateSecurity);
router.get('/me/notifications', authenticateCarrier, profileController.getNotifications);
router.put('/me/notifications/toggle', authenticateCarrier, profileController.toggleNotification);
router.get('/me/reviews', authenticateCarrier, reviewController.getMyReviews);
router.get('/me/offers', authenticateCarrier, offerController.getMyCarrierOffers);

// ID-based aliases (frontend currently uses /carriers/:carrierId/*)
router.put('/profile/:carrierId', authenticateCarrier, profileController.updateCompanyInfo);
router.get('/:carrierId/activity', authenticateCarrier, profileController.getActivityInfo);
router.put('/:carrierId/activity', authenticateCarrier, profileController.updateActivityInfo);
router.get('/:carrierId/vehicles', authenticateCarrier, profileController.listVehicles);
router.put('/:carrierId/vehicles', authenticateCarrier, profileController.upsertVehicles);
router.put('/:carrierId/service-types', authenticateCarrier, profileController.updateServiceTypes);
router.get('/:carrierId/documents', authenticateCarrier, documentController.getDocuments);
router.get('/:carrierId/documents/:documentId/download', authenticateCarrier, documentController.downloadDocument);
router.delete('/:carrierId/documents/:documentId', authenticateCarrier, documentController.deleteDocument);
router.put('/:carrierId/documents', authenticateCarrier, documentUpload.single('file'), documentController.updateDocuments);
router.put('/:carrierId/profile-picture', authenticateCarrier, pictureUpload.single('picture'), profileController.updateProfilePicture);
router.put('/:carrierId/security', authenticateCarrier, profileController.updateSecurity);
router.get('/me/invites', authenticateCarrier, inviteController.getCarrierInvites);
router.get('/:carrierId', profileController.getCarrierProfile);

export default router;
