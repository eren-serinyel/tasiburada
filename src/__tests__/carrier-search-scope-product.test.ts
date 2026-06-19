import { CarrierSearchService } from '../application/services/carrier/CarrierSearchService';
import { PRODUCT_SCOPE_OF_WORK_NAMES } from '../infrastructure/repositories/ScopeOfWorkRepository';

describe('Carrier search product scope filters', () => {
  const captureFilters = async (query: Record<string, unknown>) => {
    const service = new CarrierSearchService();
    const searchCarriers = jest.fn(async (filters) => ({
      total: 0,
      items: [],
      filters,
    }));

    (service as any).carrierRepository = { searchCarriers };

    await service.search(query);
    return searchCarriers.mock.calls[0][0];
  };

  test('maps supported product scope slug to scope name', async () => {
    const filters = await captureFilters({ scopes: 'sehirlerarasi' });

    expect(filters.scopeNames).toEqual(['Şehirler Arası']);
  });

  test('maps international scope slug to unsupported filter', async () => {
    const filters = await captureFilters({ scopes: 'uluslararasi' });

    expect(filters.scopeNames).toEqual(['__unsupported_scope__']);
  });

  test('maps singular route scope param to scope name', async () => {
    const filters = await captureFilters({ scope: 'sehirici' });

    expect(filters.scopeNames).toEqual([PRODUCT_SCOPE_OF_WORK_NAMES[0]]);
  });

  test('uses real reviewCount instead of carrier totalOffers', async () => {
    const service = new CarrierSearchService();
    const searchCarriers = jest.fn(async (filters) => ({
      total: 1,
      items: [{
        carrier: {
          id: 'carrier-1',
          companyName: 'Test Nakliyat',
          activity: { city: 'Istanbul', serviceAreasJson: [] },
          rating: 5,
          totalOffers: 55,
          vehicleTypeLinks: [],
          pictureUrl: null,
          verifiedByAdmin: true,
          scopeLinks: [{ scope: { name: PRODUCT_SCOPE_OF_WORK_NAMES[1] } }],
        },
        minPrice: null,
        offerCount: 55,
        reviewCount: 2,
      }],
      filters,
    }));

    (service as any).carrierRepository = { searchCarriers };

    const result = await service.search({});

    expect(result.items[0].reviewCount).toBe(2);
    expect(result.items[0].scopes).toEqual(['sehirlerarasi']);
  });
});
