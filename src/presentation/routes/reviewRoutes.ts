import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth';
import { ReviewController } from '../controllers/ReviewController';

const router = Router();
const reviewController = new ReviewController();

router.post('/reviews', authenticateCustomer, reviewController.create);
router.get('/shipments/:id/reviews', reviewController.getShipmentReviews);
router.get('/customers/me/reviews', authenticateCustomer, reviewController.getMyCustomerReviews);

export default router;
