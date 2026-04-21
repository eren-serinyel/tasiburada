import { AppDataSource } from "../../infrastructure/database/data-source";
import { CarrierStats } from "../../domain/entities/CarrierStats";
import { CarrierEarningsLog } from "../../domain/entities/CarrierEarningsLog";
import { Shipment, ShipmentStatus } from "../../domain/entities/Shipment";
import { Offer, OfferStatus } from "../../domain/entities/Offer";
import { Review } from "../../domain/entities/Review";
import { Carrier } from "../../domain/entities/Carrier";

export class CarrierDashboardService {
    private statsRepo = AppDataSource.getRepository(CarrierStats);
    private shipmentRepo = AppDataSource.getRepository(Shipment);
    private offerRepo = AppDataSource.getRepository(Offer);
    private reviewRepo = AppDataSource.getRepository(Review);
    private earningsRepo = AppDataSource.getRepository(CarrierEarningsLog);

    /**
     * Retrieves dashboard statistics for a carrier.
     * Calculates them in real-time if a summary record doesn't exist or is stale,
     * but for this design, we will try to read from CarrierStats first.
     */
    async getDashboardStats(carrierId: string) {
        try {
            console.log('Getting dashboard stats for carrierId:', carrierId);
            
            let stats = await this.statsRepo.findOne({ where: { carrierId } }).catch(err => {
                console.error('Stats repository error:', err);
                return null;
            });

            if (!stats) {
                console.log('No existing stats found, recalculating for carrierId:', carrierId);
                // If no stats record exists, create one from scratch by aggregating data
                stats = await this.recalculateStats(carrierId);
            }

            // We also want to know "Active Jobs" count dynamically because it changes often
            const activeJobsCount = await this.shipmentRepo.count({
                where: [
                    { carrierId, status: ShipmentStatus.MATCHED },
                    { carrierId, status: ShipmentStatus.IN_TRANSIT }
                ]
            }).catch(err => {
                console.error('Active jobs count error:', err);
                return stats?.activeJobs || 0;
            });
            
            // Update the cached value just in case
            if (stats.activeJobs !== activeJobsCount) {
                stats.activeJobs = activeJobsCount;
                await this.statsRepo.save(stats).catch(err => {
                    console.error('Failed to update active jobs count:', err);
                });
            }

            return {
                totalEarnings: stats.totalEarnings || 0,
                activeJobs: stats.activeJobs || 0,
                completedJobs: stats.totalJobs || 0,
                rating: stats.averageRating || 0,
                totalReviews: stats.totalReviews || 0
            };
        } catch (error: any) {
            console.error('Dashboard stats service error:', error);
            throw new Error(`Dashboard istatistikleri alınamadı: ${error.message}`);
        }
    }

    /**
     * Recalculates all stats from ledger/history tables and saves to CarrierStats.
     */
    async recalculateStats(carrierId: string): Promise<CarrierStats> {
        // First verify the carrier exists to avoid FK constraint violation
        const carrierExists = await AppDataSource.getRepository(Carrier)
            .findOne({ where: { id: carrierId }, select: ['id'] });

        if (!carrierExists) {
            console.error(`recalculateStats: Carrier ${carrierId} not found in carriers table`);
            // Return a default in-memory stats object without saving
            const empty = new CarrierStats();
            empty.carrierId = carrierId;
            empty.totalEarnings = 0;
            empty.totalJobs = 0;
            empty.activeJobs = 0;
            empty.averageRating = 0;
            empty.totalReviews = 0;
            return empty;
        }

        // 1. Calculate Total Earnings from Earnings Log (completed jobs)
        const { sum } = await this.earningsRepo
            .createQueryBuilder("earnings")
            .select("SUM(earnings.amount)", "sum")
            .where("earnings.carrierId = :carrierId", { carrierId })
            .getRawOne();
        
        const totalEarnings = parseFloat(sum || "0");

        // 2. Count Completed Jobs
        const completedJobs = await this.shipmentRepo.count({
            where: {
                carrierId,
                status: ShipmentStatus.COMPLETED
            }
        });

        // 3. Count Active Jobs (Matched/In-Transit)
        const activeJobs = await this.shipmentRepo.count({
            where: [
                { carrierId, status: ShipmentStatus.MATCHED },
                { carrierId, status: ShipmentStatus.IN_TRANSIT }
            ]
        });

        // 4. Calculate Average Rating
        const { avgRating, countReviews } = await this.reviewRepo
            .createQueryBuilder("review")
            .select("AVG(review.rating)", "avgRating")
            .addSelect("COUNT(review.id)", "countReviews")
            .where("review.carrierId = :carrierId", { carrierId })
            .getRawOne();

        const averageRating = parseFloat(avgRating || "0");
        const totalReviews = parseInt(countReviews || "0");

        // 5. Upsert Stats
        let stats = await this.statsRepo.findOne({ where: { carrierId } });
        if (!stats) {
            stats = new CarrierStats();
            stats.carrierId = carrierId;
        }

        stats.totalEarnings = totalEarnings;
        stats.totalJobs = completedJobs;
        stats.activeJobs = activeJobs;
        stats.averageRating = averageRating;
        stats.totalReviews = totalReviews;

        return await this.statsRepo.save(stats);
    }

    async getEarningsHistory(carrierId: string, limit: number = 50) {
        const logs = await this.earningsRepo.find({
            where: { carrierId },
            order: { earnedAt: 'DESC' },
            take: limit,
        });

        if (logs.length > 0) {
            return logs.map(log => ({
                id: log.id,
                shipmentId: log.shipmentId,
                amount: Number(log.amount),
                earnedAt: log.earnedAt,
            }));
        }

        // Fallback: derive from completed shipments when no log entries exist yet
        const completedShipments = await this.shipmentRepo.find({
            where: { carrierId, status: ShipmentStatus.COMPLETED },
            order: { updatedAt: 'DESC' } as any,
            take: limit,
        });

        return completedShipments
            .filter(s => s.price && Number(s.price) > 0)
            .map(s => ({
                id: s.id,
                shipmentId: s.id,
                amount: Number(s.price),
                earnedAt: (s as any).updatedAt ?? (s as any).createdAt,
            }));
    }
}
