import { Router } from 'express';
import { CarrierAuthController } from '../controllers/CarrierAuthController';
import { CarrierProfileController } from '../controllers/CarrierProfileController';
import { CarrierDocumentController } from '../controllers/CarrierDocumentController';
import { authCarrier } from '../middleware/auth';
import { checkCarrierProfileCompletion } from '../middleware/checkCarrierProfileCompletion';
import { CarrierSearchController } from '../controllers/CarrierSearchController';
import { CarrierDetailController } from '../controllers/CarrierDetailController';
import { CarrierDashboardController } from '../controllers/CarrierDashboardController';

const router = Router();
const authController = new CarrierAuthController();
const profileController = new CarrierProfileController();
const documentController = new CarrierDocumentController();
const searchController = new CarrierSearchController();
const detailController = new CarrierDetailController();
const dashboardController = new CarrierDashboardController();


// Public auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/search', searchController.search);
router.get('/:carrierId/detail', detailController.getDetail);

// Authenticated carrier routes
router.get('/me', authCarrier, authController.me);
router.get('/me/stats', authCarrier, dashboardController.getStats);
router.get('/:carrierId/stats', authCarrier, dashboardController.getStats); // Alias for ID access

router.get('/me/profile-status', authCarrier, profileController.getProfileStatus);
router.put('/me/profile-status', authCarrier, profileController.refreshProfileStatus);
router.put('/me/company-info', authCarrier, profileController.updateCompanyInfo);
router.get('/me/activity', authCarrier, profileController.getActivityInfo);
router.put('/me/activity', authCarrier, profileController.updateActivityInfo);
router.put('/me/vehicle-types', authCarrier, profileController.updateVehicleTypes);
router.put('/me/service-types', authCarrier, profileController.updateServiceTypes);
router.put('/me/vehicles', authCarrier, profileController.upsertVehicles);
router.get('/me/documents', authCarrier, documentController.getDocuments);
router.put('/me/documents', authCarrier, documentController.updateDocuments);
router.put('/me/earnings', authCarrier, profileController.updateEarnings);
router.put('/me/profile-picture', authCarrier, profileController.updateProfilePicture);
router.put('/me/security', authCarrier, profileController.updateSecurity);
router.get('/me/notifications', authCarrier, profileController.getNotifications);
router.put('/me/notifications/toggle', authCarrier, profileController.toggleNotification);

// ID-based aliases (frontend currently uses /carriers/:carrierId/*)
router.put('/profile/:carrierId', authCarrier, profileController.updateCompanyInfo);
router.get('/:carrierId/activity', authCarrier, profileController.getActivityInfo);
router.put('/:carrierId/activity', authCarrier, profileController.updateActivityInfo);
router.get('/:carrierId/vehicles', authCarrier, profileController.listVehicles);
router.put('/:carrierId/vehicles', authCarrier, profileController.upsertVehicles);
router.put('/:carrierId/service-types', authCarrier, profileController.updateServiceTypes);
router.get('/:carrierId/documents', authCarrier, documentController.getDocuments);
router.put('/:carrierId/documents', authCarrier, documentController.updateDocuments);
router.put('/:carrierId/profile-picture', authCarrier, profileController.updateProfilePicture);
router.put('/:carrierId/security', authCarrier, profileController.updateSecurity);
router.get('/:carrierId', authCarrier, profileController.getCarrierProfile);

// Example restricted action protected by completion middleware
router.post(
	'/me/priority-actions/demo',
	authCarrier,
	checkCarrierProfileCompletion(70),
	(req, res) => {
		res.status(200).json({ success: true, message: 'Profil tamamlandığı için bu işlemi yapabilirsiniz.' });
	}
);

export default router;
