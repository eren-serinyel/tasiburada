import { CarrierScopeOfWorkService } from '../application/services/carrier/CarrierScopeOfWorkService';

describe('Carrier scope validation', () => {
  test('rejects empty working scope selections', async () => {
    const service = new CarrierScopeOfWorkService();

    await expect(service.replaceSelectedTypeNames('carrier-id', [])).rejects.toThrow(
      'En az bir çalışma kapsamı seçmelisiniz.',
    );
    await expect(service.replaceSelectedTypes('carrier-id', [])).rejects.toThrow(
      'En az bir çalışma kapsamı seçmelisiniz.',
    );
  });

  test('rejects unsupported international working scope', async () => {
    const service = new CarrierScopeOfWorkService();

    await expect(service.replaceSelectedTypeNames('carrier-id', ['Uluslararası'])).rejects.toThrow(
      'Desteklenmeyen çalışma kapsamı seçilemez.',
    );
  });
});
