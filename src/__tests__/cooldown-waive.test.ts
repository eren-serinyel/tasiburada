import { PlatformPolicyService } from '../application/services/PlatformPolicyService';
import { AdminService } from '../application/services/AdminService';
import { AppDataSource } from '../infrastructure/database/data-source';
import { MatchCooldownStatus } from '../domain/entities/MatchCooldown';
import { NotFoundError, ConflictError } from '../domain/errors/AppError';

// ─── PlatformPolicyService.waiveCooldown ──────────────────────────────────────

describe('PlatformPolicyService.waiveCooldown', () => {
  let service: PlatformPolicyService;

  beforeEach(() => {
    service = new PlatformPolicyService();
  });

  function buildActiveCooldown(overrides: Partial<Record<string, any>> = {}) {
    return {
      id: 1,
      customerId: 'customer-1',
      carrierId: 'carrier-1',
      shipmentId: 'shipment-1',
      reason: 'tek taraflı iptal',
      status: MatchCooldownStatus.ACTIVE,
      activeUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 gün sonra
      ...overrides,
    };
  }

  test('ACTIVE cooldown waive edilir → status WAIVED döner', async () => {
    const cooldown = buildActiveCooldown();
    const savedCooldown = { ...cooldown, status: MatchCooldownStatus.WAIVED };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(cooldown),
      save: jest.fn().mockResolvedValue(savedCooldown),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const result = await service.waiveCooldown(1);

    expect(result.status).toBe(MatchCooldownStatus.WAIVED);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: MatchCooldownStatus.WAIVED }));
    repoSpy.mockRestore();
  });

  test('note verilirse reason güncellenir', async () => {
    const cooldown = buildActiveCooldown({ reason: 'eski not' });
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(cooldown),
      save: jest.fn().mockImplementation(async (c: any) => c),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await service.waiveCooldown(1, 'admin notu');

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'admin notu', status: MatchCooldownStatus.WAIVED })
    );
    repoSpy.mockRestore();
  });

  test('note verilmezse reason değişmez', async () => {
    const cooldown = buildActiveCooldown({ reason: 'eski neden' });
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(cooldown),
      save: jest.fn().mockImplementation(async (c: any) => c),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await service.waiveCooldown(1);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'eski neden' })
    );
    repoSpy.mockRestore();
  });

  test('bulunamayan ID → NotFoundError', async () => {
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await expect(service.waiveCooldown(999)).rejects.toBeInstanceOf(NotFoundError);
    expect(mockRepo.save).not.toHaveBeenCalled();
    repoSpy.mockRestore();
  });

  test('EXPIRED cooldown waive edilemez → ConflictError', async () => {
    const cooldown = buildActiveCooldown({ status: MatchCooldownStatus.EXPIRED });
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(cooldown),
      save: jest.fn(),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await expect(service.waiveCooldown(1)).rejects.toBeInstanceOf(ConflictError);
    expect(mockRepo.save).not.toHaveBeenCalled();
    repoSpy.mockRestore();
  });

  test('WAIVED cooldown tekrar waive edilemez → ConflictError', async () => {
    const cooldown = buildActiveCooldown({ status: MatchCooldownStatus.WAIVED });
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(cooldown),
      save: jest.fn(),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    await expect(service.waiveCooldown(1)).rejects.toBeInstanceOf(ConflictError);
    expect(mockRepo.save).not.toHaveBeenCalled();
    repoSpy.mockRestore();
  });

  test('waive sonrası hasActiveCooldown false döner', async () => {
    // Simulate: after waive, the active query finds nothing (status filter)
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null), // ACTIVE + future → null after waive
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const result = await service.hasActiveCooldown('customer-1', 'carrier-1');

    expect(result).toBe(false);
    repoSpy.mockRestore();
  });
});

// ─── AdminService.getCooldowns ─────────────────────────────────────────────────

describe('AdminService.getCooldowns', () => {
  test('filtre olmadan tüm kayıtları döner', async () => {
    const rows = [
      { id: 1, customerId: 'c1', carrierId: 'cr1', status: MatchCooldownStatus.ACTIVE },
      { id: 2, customerId: 'c2', carrierId: 'cr2', status: MatchCooldownStatus.EXPIRED },
    ];
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, 2]),
    };
    const mockRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const service = new AdminService();
    const result = await service.getCooldowns({});

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(qb.andWhere).not.toHaveBeenCalled();
    repoSpy.mockRestore();
  });

  test('status filtresi andWhere çağırır', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const mockRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const service = new AdminService();
    await service.getCooldowns({ status: 'active' });

    expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', { status: 'active' });
    repoSpy.mockRestore();
  });

  test('carrierId + customerId filtreleri uygulanır', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const mockRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const service = new AdminService();
    await service.getCooldowns({ carrierId: 'carrier-1', customerId: 'customer-1' });

    expect(qb.andWhere).toHaveBeenCalledWith('c.carrierId = :carrierId', { carrierId: 'carrier-1' });
    expect(qb.andWhere).toHaveBeenCalledWith('c.customerId = :customerId', { customerId: 'customer-1' });
    repoSpy.mockRestore();
  });

  test('limit 100 ile sınırlıdır', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const mockRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const repoSpy = jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepo as any);

    const service = new AdminService();
    await service.getCooldowns({ limit: 9999 });

    expect(qb.take).toHaveBeenCalledWith(100);
    repoSpy.mockRestore();
  });
});
