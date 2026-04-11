import { FavoriteCarrierRepository } from '../../infrastructure/repositories/FavoriteCarrierRepository';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { NotFoundError } from '../../domain/errors/AppError';

export class FavoriteCarrierService {
  private favoriteRepo = new FavoriteCarrierRepository();
  private carrierRepo = new CarrierRepository();

  async getFavorites(customerId: string) {
    return this.favoriteRepo.findByCustomerId(customerId);
  }

  async toggle(customerId: string, carrierId: string) {
    const carrier = await this.carrierRepo.findById(carrierId);
    if (!carrier) throw new NotFoundError('Nakliyeci bulunamadı');
    return this.favoriteRepo.toggle(customerId, carrierId);
  }

  async isFavorite(customerId: string, carrierId: string): Promise<boolean> {
    return this.favoriteRepo.isFavorite(customerId, carrierId);
  }

  async getFavoriteIds(customerId: string): Promise<string[]> {
    const favorites = await this.favoriteRepo.findByCustomerId(customerId);
    return favorites.map(f => f.carrierId);
  }
}
