import { Router } from 'express';
import customerRoutes from './customerRoutes';
import carrierRoutes from './carrierRoutes';
import vehicleTypeRoutes from './vehicleTypeRoutes';
import commonRoutes from './commonRoutes';

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
router.use('/customers', customerRoutes);
router.use('/carriers', carrierRoutes);
router.use('/vehicle-types', vehicleTypeRoutes);

export default router;