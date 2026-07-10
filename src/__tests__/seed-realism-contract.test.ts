import fs from 'node:fs';
import path from 'node:path';
import { OFFER_MESSAGE_TEMPLATES } from '../database/seed/data/constants';

describe('professional seed realism contract', () => {
  const carrierSeeder = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/seed/seeders/carrierSeeder.ts'),
    'utf8',
  );
  const offerSeeder = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/seed/seeders/offerSeeder.ts'),
    'utf8',
  );
  const completedFlowSeeder = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/seed/seeders/completedFlowSeeder.ts'),
    'utf8',
  );
  const clearDatabase = fs.readFileSync(
    path.resolve(process.cwd(), 'src/database/seed/clearDatabase.ts'),
    'utf8',
  );

  test('carrier availability seed spans at least 120 days and includes weekend diversity', () => {
    expect(carrierSeeder).toContain('const AVAILABILITY_SEED_DAYS = 120;');
    expect(carrierSeeder).toContain('shouldCarrierWorkOnDate(tierProfile.tier, date, offset)');
    expect(carrierSeeder).toContain('const isSaturday = dayOfWeek === 6;');
    expect(carrierSeeder).toContain('const isSunday = dayOfWeek === 0;');
    expect(carrierSeeder).toContain("if (tier === 'established') {");
    expect(carrierSeeder).toContain("if (tier === 'growing') {");
    expect(carrierSeeder).toContain("if (tier === 'new') {");
    expect(carrierSeeder).toContain('AppDataSource.getRepository(CarrierAvailableDate)');
    expect(carrierSeeder).toContain('availableDateRepo.save(availableDates.map((date)');
    expect(clearDatabase).toContain("'carrier_available_dates'");
  });

  test('offer seed keeps capability invariants while varying price, message, and duration', () => {
    expect(OFFER_MESSAGE_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(OFFER_MESSAGE_TEMPLATES).size).toBe(OFFER_MESSAGE_TEMPLATES.length);
    expect(offerSeeder).toContain('ensureAssignedCarrierIsCapable(shipment, capabilityFilteredCarriers, shipmentRepo)');
    expect(offerSeeder).toContain('await shipmentRepo.update(shipment.id, { carrierId: replacement.id });');
    expect(offerSeeder).toContain('buildOfferPrice(basePrice, shipment, carrier, index)');
    expect(offerSeeder).toContain('const weightMultiplier = weight > 5000');
    expect(offerSeeder).toContain('estimateDuration(shipment, carrier)');
  });

  test('carrier rating and completed jobs are seeded from real completed shipments and reviews', () => {
    expect(completedFlowSeeder).toContain('const acceptedOfferCounts = offers.reduce<Record<string, number>>');
    expect(completedFlowSeeder).toContain('const completedJobs = completedShipmentCounts[carrier.id] ?? 0;');
    expect(completedFlowSeeder).toContain('const averageRating = ratings.length > 0 ? calcAvgRating(ratings) : 0;');
    expect(completedFlowSeeder).toContain('acceptedOffers,');
    expect(completedFlowSeeder).toContain('successRate: acceptedOffers > 0');
    expect(completedFlowSeeder).not.toContain('ratings.length > 0 ? calcAvgRating(ratings) : carrier.rating');
  });
});
