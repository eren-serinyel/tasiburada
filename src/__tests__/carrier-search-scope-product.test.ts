import { CarrierSearchService } from '../application/services/carrier/CarrierSearchService';

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
});
