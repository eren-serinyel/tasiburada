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
        let stats = await this.statsRepo.findOne({ where: { carrierId } });

        if (!stats) {
            // If no stats record exists, create one from scratch by aggregating data
            stats = await this.recalculateStats(carrierId);
        }

        // We also want to know "Active Jobs" count dynamically because it changes often
        // stats.activeJobs might be eventually consistent, let's query it fresh to be sure
        const activeJobsCount = await this.offerRepo.count({
            where: {
                carrierId,
                status: OfferStatus.ACCEPTED,
                shipment: {
                    status: ShipmentStatus.MATCHED // Or IN_TRANSIT
                }
            },
            relations: ["shipment"]
        });
        
        // Update the cached value just in case
        if (stats.activeJobs !== activeJobsCount) {
             stats.activeJobs = activeJobsCount;
             await this.statsRepo.save(stats);
        }

        return {
            totalEarnings: stats.totalEarnings,
            activeJobs: stats.activeJobs,
            completedJobs: stats.totalJobs,
            rating: stats.averageRating,
            totalReviews: stats.totalReviews
        };
    }

    /**
     * Recalculates all stats from ledger/history tables and saves to CarrierStats.
     */
    async recalculateStats(carrierId: string): Promise<CarrierStats> {
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
        // Active means: Shipment is not pending, not completed, not cancelled, and assigned to this carrier
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
