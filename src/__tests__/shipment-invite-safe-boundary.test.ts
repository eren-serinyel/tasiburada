import { ShipmentInviteService } from '../application/services/ShipmentInviteService';
import { ShipmentInviteRepository } from '../infrastructure/repositories/ShipmentInviteRepository';
import { ShipmentInviteController } from '../presentation/controllers/ShipmentInviteController';

describe('ShipmentInvite carrier response boundary', () => {
  test('service maps repository entities to new allowlisted response objects', async () => {
    const rawInvite = {
      id: 'invite-1',
      shipmentId: 'shipment-1',
      carrierId: 'carrier-1',
      status: 'pending',
      createdAt: new Date('2026-07-18T10:00:00.000Z'),
      requestedServices: null,
      shipment: {
        id: 'shipment-1',
        status: 'pending',
        shipmentCategory: null,
        originCity: 'Ankara',
        originDistrict: 'Çankaya',
        destinationCity: 'İstanbul',
        destinationDistrict: 'Kadıköy',
        shipmentDate: new Date('2026-08-01T00:00:00.000Z'),
        customerId: 'customer-secret',
        customer: {
          phone: '+905551112233',
          email: 'secret@example.com',
        },
        contactPhone: '+905559998877',
        originAddressText: 'Secret origin address',
      },
    };
    const findByCarrierId = jest.fn().mockResolvedValue([rawInvite]);
    const service = new ShipmentInviteService();
    (service as any).inviteRepo = { findByCarrierId };

    const result = await service.getCarrierInvites('carrier-1');

    expect(findByCarrierId).toHaveBeenCalledWith('carrier-1', 'pending');
    expect(result[0]).not.toBe(rawInvite);
    expect(result[0].shipment).not.toBe(rawInvite.shipment);
    expect(JSON.stringify(result)).not.toContain('customer-secret');
    expect(JSON.stringify(result)).not.toContain('+90555');
    expect(JSON.stringify(result)).not.toContain('secret@example.com');
    expect(JSON.stringify(result)).not.toContain('Secret origin address');
  });

  test('repository scopes by carrier and loads no Customer or raw nested relations', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const repository = Object.create(
      ShipmentInviteRepository.prototype,
    ) as ShipmentInviteRepository;
    Object.defineProperty(repository, 'repository', {
      configurable: true,
      get: () => ({ find }),
    });

    await repository.findByCarrierId('authenticated-carrier', 'pending');

    const options = find.mock.calls[0][0];
    expect(options.where).toEqual({
      carrierId: 'authenticated-carrier',
      status: 'pending',
    });
    expect(options.relations).toEqual({ shipment: true });
    expect(JSON.stringify(options.relations)).not.toContain('customer');
    expect(JSON.stringify(options.relations)).not.toContain('extraServices');
    expect(JSON.stringify(options.relations)).not.toContain('customExtraServices');
    expect(JSON.stringify(options.select)).not.toContain('customer');
    expect(JSON.stringify(options.select)).not.toContain('contactPhone');
    expect(JSON.stringify(options.select)).not.toContain('Address');
  });

  test('controller uses only the authenticated carrier identity and preserves wrapper', async () => {
    const getCarrierInvites = jest.fn().mockResolvedValue([]);
    const controller = new ShipmentInviteController();
    (controller as any).service = { getCarrierInvites };
    const req = {
      user: { carrierId: 'authenticated-carrier' },
      body: { carrierId: 'other-carrier' },
      query: { carrierId: 'other-carrier' },
    } as any;
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await controller.getCarrierInvites(req, res);

    expect(getCarrierInvites).toHaveBeenCalledWith('authenticated-carrier');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
