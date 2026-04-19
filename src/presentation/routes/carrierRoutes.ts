import { Router } from 'express';
import { CarrierAuthController } from '../controllers/CarrierAuthController';
import { CarrierProfileController } from '../controllers/CarrierProfileController';
import { CarrierDocumentController } from '../controllers/CarrierDocumentController';
import { authCarrier } from '../middleware/auth';
import { CarrierSearchController } from '../controllers/CarrierSearchController';
import { CarrierDetailController } from '../controllers/CarrierDetailController';
import { CarrierDashboardController } from '../controllers/CarrierDashboardController';
import { CarrierReviewController } from '../controllers/CarrierReviewController';
import { OfferController } from '../controllers/OfferController';
import { ShipmentInviteController } from '../controllers/ShipmentInviteController';
import { documentUpload, pictureUpload } from '../../infrastructure/upload/uploadMiddleware';

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
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/availability-summary', searchController.getAvailabilitySummary);
router.get('/search', searchController.search);
router.get('/:carrierId/detail', detailController.getDetail);

// Authenticated carrier routes
router.get('/me', authCarrier, authController.me);
router.get('/me/stats', authCarrier, dashboardController.getStats);
router.get('/me/earnings-history', authCarrier, dashboardController.getEarningsHistory);
router.get('/:carrierId/stats', authCarrier, dashboardController.getStats); // Alias for ID access

router.get('/me/profile-status', authCarrier, profileController.getProfileStatus);
router.put('/me/profile-status', authCarrier, profileController.refreshProfileStatus);
router.put('/me/company-info', authCarrier, profileController.updateCompanyInfo);
router.get('/me/activity', authCarrier, profileController.getActivityInfo);
router.put('/me/activity', authCarrier, profileController.updateActivityInfo);
router.put('/me/vehicle-types', authCarrier, profileController.updateVehicleTypes);
router.put('/me/service-types', authCarrier, profileController.updateServiceTypes);
router.get('/me/vehicles', authCarrier, profileController.listVehicles);
router.post('/me/vehicles', authCarrier, profileController.createVehicle);
router.put('/me/vehicles', authCarrier, profileController.upsertVehicles);
router.put('/me/vehicles/:vehicleId', authCarrier, profileController.updateVehicleById);
router.delete('/me/vehicles/:vehicleId', authCarrier, profileController.deleteVehicleById);
router.post('/me/vehicles/:vehicleId/photos', authCarrier, pictureUpload.array('photos', 8), profileController.addVehiclePhotos);
router.delete('/me/vehicles/:vehicleId/photos/:photoId', authCarrier, profileController.deleteVehiclePhoto);
router.get('/me/documents', authCarrier, documentController.getDocuments);
router.get('/me/documents/:documentId/download', authCarrier, documentController.downloadDocument);
router.delete('/me/documents/:documentId', authCarrier, documentController.deleteDocument);
router.put('/me/documents', authCarrier, documentUpload.single('file'), documentController.updateDocuments);
router.put('/me/earnings', authCarrier, profileController.updateEarnings);
router.put('/me/profile-picture', authCarrier, pictureUpload.single('picture'), profileController.updateProfilePicture);
router.put('/me/security', authCarrier, profileController.updateSecurity);
router.get('/me/notifications', authCarrier, profileController.getNotifications);
router.put('/me/notifications/toggle', authCarrier, profileController.toggleNotification);
router.get('/me/reviews', authCarrier, reviewController.getMyReviews);
router.get('/me/offers', authCarrier, offerController.getMyCarrierOffers);

// ID-based aliases (frontend currently uses /carriers/:carrierId/*)
router.put('/profile/:carrierId', authCarrier, profileController.updateCompanyInfo);
router.get('/:carrierId/activity', authCarrier, profileController.getActivityInfo);
router.put('/:carrierId/activity', authCarrier, profileController.updateActivityInfo);
router.get('/:carrierId/vehicles', authCarrier, profileController.listVehicles);
router.put('/:carrierId/vehicles', authCarrier, profileController.upsertVehicles);
router.put('/:carrierId/service-types', authCarrier, profileController.updateServiceTypes);
router.get('/:carrierId/documents', authCarrier, documentController.getDocuments);
router.get('/:carrierId/documents/:documentId/download', authCarrier, documentController.downloadDocument);
router.delete('/:carrierId/documents/:documentId', authCarrier, documentController.deleteDocument);
router.put('/:carrierId/documents', authCarrier, documentUpload.single('file'), documentController.updateDocuments);
router.put('/:carrierId/profile-picture', authCarrier, pictureUpload.single('picture'), profileController.updateProfilePicture);
router.put('/:carrierId/security', authCarrier, profileController.updateSecurity);
router.get('/me/invites', authCarrier, inviteController.getCarrierInvites);
router.get('/:carrierId', profileController.getCarrierProfile);

export default router;
