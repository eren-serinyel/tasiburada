import { Request, Response } from 'express';
import { CarrierDashboardService } from '../../application/services/CarrierDashboardService';

export class CarrierDashboardController {
    private dashboardService: CarrierDashboardService;

    constructor() {
        this.dashboardService = new CarrierDashboardService();
    }

    getEarningsHistory = async (req: Request, res: Response) => {
        try {
            const carrierId = req.user?.carrierId;
            if (!carrierId) {
                return res.status(400).json({ success: false, message: 'Carrier ID gerekli' });
            }
            const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
            const history = await this.dashboardService.getEarningsHistory(carrierId, limit);
            return res.json({ success: true, data: history });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    getStats = async (req: Request, res: Response) => {
        try {
            const carrierId = req.params.carrierId || req.user?.carrierId;
            
            if (!carrierId) {
                return res.status(400).json({ success: false, message: "Carrier ID is required" });
            }

            const stats = await this.dashboardService.getDashboardStats(carrierId);
            
            return res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            console.error("Dashboard stats error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
