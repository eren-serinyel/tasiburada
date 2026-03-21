import { BaseRepository } from './BaseRepository';
import { Shipment } from '../../domain/entities/Shipment';

export class ShipmentRepository extends BaseRepository<Shipment> {
  constructor() {
    super(Shipment);
  }
}
