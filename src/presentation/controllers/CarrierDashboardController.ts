import { Request, Response } from 'express';
import { CarrierDashboardService } from '../../application/services/CarrierDashboardService';

export class CarrierDashboardController {
    private dashboardService: CarrierDashboardService;

    constructor() {
        this.dashboardService = new CarrierDashboardService();
    }

    getStats = async (req: Request, res: Response) => {
        try {
            const carrierId = req.params.id || (req as any).user?.id;
            
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
