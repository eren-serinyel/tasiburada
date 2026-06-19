import fs from 'node:fs';
import path from 'node:path';

describe('carrier success rate contract', () => {
  const repositoryPath = path.resolve(process.cwd(), 'src/infrastructure/repositories/CarrierRepository.ts');
  const shipmentServicePath = path.resolve(process.cwd(), 'src/application/services/ShipmentService.ts');
  const offerServicePath = path.resolve(process.cwd(), 'src/application/services/OfferService.ts');
  const carrierEntityPath = path.resolve(process.cwd(), 'src/domain/entities/Carrier.ts');

  test('successRate uses accepted offers as denominator, not total offer volume', () => {
    const repository = fs.readFileSync(repositoryPath, 'utf8');
    const shipmentService = fs.readFileSync(shipmentServicePath, 'utf8');

    expect(repository).toContain('completedShipments / acceptedOffers');
    expect(shipmentService).toContain('completedShipments / acceptedOffers');
    expect(repository).not.toContain('completedShipments / totalOffers');
    expect(shipmentService).not.toContain('completedShipments / totalOffers');
  });

  test('accepting an offer increments acceptedOffers', () => {
    const offerService = fs.readFileSync(offerServicePath, 'utf8');
    const carrierEntity = fs.readFileSync(carrierEntityPath, 'utf8');

    expect(carrierEntity).toContain('acceptedOffers: number');
    expect(offerService).toContain('acceptedOffers + 1');
    expect(offerService).toContain('autoRejectedOffers');
  });
});
