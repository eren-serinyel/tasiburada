import { AppDataSource } from '../database/data-source';
import { CustomerCarrierRelation } from '../../domain/entities/CustomerCarrierRelation';

export const CustomerCarrierRelationRepository = AppDataSource
  .getRepository(CustomerCarrierRelation)
  .extend({
    async upsertRelation(
      customerId: string,
      carrierId: string,
      shipmentId: string
    ): Promise<CustomerCarrierRelation> {
      const existing = await this.findOne({
        where: { customerId, carrierId },
      });

      if (existing) {
        existing.lastShipmentId = shipmentId;
        existing.completedJobsCount += 1;
        return this.save(existing);
      }

      const relation = this.create({
        customerId,
        carrierId,
        firstShipmentId: shipmentId,
        lastShipmentId: shipmentId,
        completedJobsCount: 1,
      });
      return this.save(relation);
    },

    async findPreviousCarriers(customerId: string): Promise<CustomerCarrierRelation[]> {
      return this.find({
        where: { customerId },
        relations: ['carrier'],
        order: { updatedAt: 'DESC' },
      });
    },
  });
