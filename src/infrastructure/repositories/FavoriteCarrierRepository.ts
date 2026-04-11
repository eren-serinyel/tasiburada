import { BaseRepository } from './BaseRepository';
import { FavoriteCarrier } from '../../domain/entities/FavoriteCarrier';

export class FavoriteCarrierRepository extends BaseRepository<FavoriteCarrier> {
  constructor() {
    super(FavoriteCarrier);
  }

  async findByCustomerId(customerId: string): Promise<FavoriteCarrier[]> {
    return this.repository.find({
      where: { customerId },
      relations: ['carrier'],
      order: { createdAt: 'DESC' },
    });
  }

  async isFavorite(customerId: string, carrierId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { customerId, carrierId },
    });
    return count > 0;
  }

  async toggle(customerId: string, carrierId: string): Promise<{ added: boolean }> {
    const existing = await this.repository.findOne({
      where: { customerId, carrierId },
    });
    if (existing) {
      await this.repository.remove(existing);
      return { added: false };
    }
    const favorite = this.repository.create({ customerId, carrierId });
    await this.repository.save(favorite);
    return { added: true };
  }
}
