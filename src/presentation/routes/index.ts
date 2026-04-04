import { Router } from 'express';
import customerRoutes from './customerRoutes';
import carrierRoutes from './carrierRoutes';
import vehicleTypeRoutes from './vehicleTypeRoutes';
import commonRoutes from './commonRoutes';
import shipmentRoutes from './shipmentRoutes';
import offerRoutes from './offerRoutes';
import reviewRoutes from './reviewRoutes';
import adminRoutes from './adminRoutes';
import notificationRoutes from './notificationRoutes';
import authRoutes from './authRoutes';
import paymentRoutes from './paymentRoutes';

const router = Router();
router.use('/', commonRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Taşıburada API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/carriers', carrierRoutes);
router.use('/vehicle-types', vehicleTypeRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/offers', offerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/', reviewRoutes);
router.use('/admin', adminRoutes);

export default router;