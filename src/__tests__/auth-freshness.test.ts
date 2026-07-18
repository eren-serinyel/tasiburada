import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { CarrierApprovalState } from '../domain/entities/Carrier';
import { AppDataSource } from '../infrastructure/database/data-source';
import {
  authenticateAdmin,
  authenticateCarrier,
  authenticateCustomer,
  requireSuperadmin,
  requireVerifiedCarrier,
} from '../presentation/middleware/auth';

jest.mock('../infrastructure/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => {
  const actual = jest.requireActual('jsonwebtoken');
  return {
    ...actual,
    verify: jest.fn(),
  };
});

const verifyMock = jwt.verify as unknown as jest.Mock;
const getRepositoryMock = AppDataSource.getRepository as unknown as jest.Mock;
const findOneMock = jest.fn();

const createRequest = (body: Record<string, unknown> = {}, query: Record<string, unknown> = {}): Request =>
  ({
    headers: { authorization: 'Bearer valid-token' },
    body,
    query,
  }) as unknown as Request;

const createResponse = (): Response => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response;
  (response.status as jest.Mock).mockReturnValue(response);
  return response;
};

describe('auth freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRepositoryMock.mockReturnValue({ findOne: findOneMock });
  });

  test('accepts an active customer and builds request identity from the database result', async () => {
    verifyMock.mockReturnValue({
      customerId: 'customer-1',
      email: 'customer@example.com',
      type: 'customer',
      isActive: false,
    });
    findOneMock.mockResolvedValue({ id: 'customer-1', isActive: true });
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await authenticateCustomer(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      customerId: 'customer-1',
      email: 'customer@example.com',
      type: 'customer',
      isActive: true,
    });
  });

  test('rejects a valid customer token when the database account is missing', async () => {
    verifyMock.mockReturnValue({
      customerId: 'missing-customer',
      email: 'customer@example.com',
      type: 'customer',
    });
    findOneMock.mockResolvedValue(null);
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await authenticateCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an inactive customer even when the JWT is valid', async () => {
    verifyMock.mockReturnValue({
      customerId: 'customer-1',
      email: 'customer@example.com',
      type: 'customer',
    });
    findOneMock.mockResolvedValue({ id: 'customer-1', isActive: false });
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await authenticateCustomer(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts an active, verified and approved carrier', async () => {
    verifyMock.mockReturnValue({
      carrierId: 'carrier-1',
      email: 'carrier@example.com',
      type: 'carrier',
    });
    findOneMock.mockResolvedValue({
      id: 'carrier-1',
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    const req = createRequest();
    const res = createResponse();
    const authenticated = jest.fn();
    const verified = jest.fn();

    await authenticateCarrier(req, res, authenticated);
    requireVerifiedCarrier(req, res, verified);

    expect(authenticated).toHaveBeenCalledTimes(1);
    expect(verified).toHaveBeenCalledTimes(1);
  });

  test('rejects a suspended carrier despite stale approved JWT claims', async () => {
    verifyMock.mockReturnValue({
      carrierId: 'carrier-1',
      email: 'carrier@example.com',
      type: 'carrier',
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    findOneMock.mockResolvedValue({
      id: 'carrier-1',
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.SUSPENDED,
    });
    const req = createRequest();
    const res = createResponse();

    await authenticateCarrier(req, res, jest.fn());
    requireVerifiedCarrier(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'CARRIER_VERIFICATION_REQUIRED',
    }));
  });

  test('rejects an unverified carrier despite a stale verified JWT claim', async () => {
    verifyMock.mockReturnValue({
      carrierId: 'carrier-1',
      email: 'carrier@example.com',
      type: 'carrier',
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    findOneMock.mockResolvedValue({
      id: 'carrier-1',
      isActive: true,
      verifiedByAdmin: false,
      approvalState: CarrierApprovalState.APPROVED,
    });
    const req = createRequest();
    const res = createResponse();

    await authenticateCarrier(req, res, jest.fn());
    requireVerifiedCarrier(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('rejects an inactive carrier before verified-carrier authorization', async () => {
    verifyMock.mockReturnValue({
      carrierId: 'carrier-1',
      email: 'carrier@example.com',
      type: 'carrier',
    });
    findOneMock.mockResolvedValue({
      id: 'carrier-1',
      isActive: false,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await authenticateCarrier(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('does not let body or query carrier IDs replace the authenticated identity', async () => {
    verifyMock.mockReturnValue({
      carrierId: 'carrier-1',
      email: 'carrier@example.com',
      type: 'carrier',
    });
    findOneMock.mockResolvedValue({
      id: 'carrier-1',
      isActive: true,
      verifiedByAdmin: true,
      approvalState: CarrierApprovalState.APPROVED,
    });
    const req = createRequest(
      { carrierId: 'carrier-from-body' },
      { carrierId: 'carrier-from-query' },
    );

    await authenticateCarrier(req, createResponse(), jest.fn());

    expect(req.user?.carrierId).toBe('carrier-1');
    expect(req.carrierId).toBe('carrier-1');
  });

  test('accepts an active admin and uses the current database role', async () => {
    verifyMock.mockReturnValue({
      adminId: 'admin-1',
      email: 'admin@example.com',
      type: 'admin',
      role: 'admin',
    });
    findOneMock.mockResolvedValue({
      id: 'admin-1',
      isActive: true,
      role: 'superadmin',
      deletedAt: null,
    });
    const req = createRequest();
    const next = jest.fn();

    await authenticateAdmin(req, createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.role).toBe('superadmin');
  });

  test('rejects an inactive admin and enforces a changed role from the database', async () => {
    verifyMock.mockReturnValue({
      adminId: 'admin-1',
      email: 'admin@example.com',
      type: 'admin',
      role: 'superadmin',
    });
    findOneMock.mockResolvedValueOnce({
      id: 'admin-1',
      isActive: false,
      role: 'superadmin',
      deletedAt: null,
    });
    const inactiveReq = createRequest();
    const inactiveRes = createResponse();

    await authenticateAdmin(inactiveReq, inactiveRes, jest.fn());

    expect(inactiveRes.status).toHaveBeenCalledWith(403);

    findOneMock.mockResolvedValueOnce({
      id: 'admin-1',
      isActive: true,
      role: 'admin',
      deletedAt: null,
    });
    const changedRoleReq = createRequest();
    const changedRoleRes = createResponse();

    await authenticateAdmin(changedRoleReq, changedRoleRes, jest.fn());
    requireSuperadmin(changedRoleReq, changedRoleRes, jest.fn());

    expect(changedRoleReq.user?.role).toBe('admin');
    expect(changedRoleRes.status).toHaveBeenCalledWith(403);
  });

  test('selects only minimal security fields for customer, carrier and admin freshness', async () => {
    verifyMock
      .mockReturnValueOnce({
        customerId: 'customer-1',
        email: 'customer@example.com',
        type: 'customer',
      })
      .mockReturnValueOnce({
        carrierId: 'carrier-1',
        email: 'carrier@example.com',
        type: 'carrier',
      })
      .mockReturnValueOnce({
        adminId: 'admin-1',
        email: 'admin@example.com',
        type: 'admin',
      });
    findOneMock
      .mockResolvedValueOnce({ id: 'customer-1', isActive: true })
      .mockResolvedValueOnce({
        id: 'carrier-1',
        isActive: true,
        verifiedByAdmin: true,
        approvalState: CarrierApprovalState.APPROVED,
      })
      .mockResolvedValueOnce({
        id: 'admin-1',
        isActive: true,
        role: 'admin',
        deletedAt: null,
      });

    await authenticateCustomer(createRequest(), createResponse(), jest.fn());
    await authenticateCarrier(createRequest(), createResponse(), jest.fn());
    await authenticateAdmin(createRequest(), createResponse(), jest.fn());

    expect(findOneMock).toHaveBeenNthCalledWith(1, {
      where: { id: 'customer-1' },
      select: ['id', 'isActive'],
    });
    expect(findOneMock).toHaveBeenNthCalledWith(2, {
      where: { id: 'carrier-1' },
      select: ['id', 'isActive', 'verifiedByAdmin', 'approvalState'],
    });
    expect(findOneMock).toHaveBeenNthCalledWith(3, {
      where: { id: 'admin-1' },
      select: ['id', 'isActive', 'role', 'deletedAt'],
      withDeleted: true,
    });
    expect(JSON.stringify(findOneMock.mock.calls)).not.toMatch(
      /password|token|shipment|offer|payment|earnings/i,
    );
  });

  test('does not expose internal database errors', async () => {
    verifyMock.mockReturnValue({
      customerId: 'customer-1',
      email: 'customer@example.com',
      type: 'customer',
    });
    findOneMock.mockRejectedValue(new Error('mysql password secret'));
    const res = createResponse();

    await authenticateCustomer(createRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const responseBody = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseBody).toEqual({
      success: false,
      message: 'Kimlik doğrulama kontrolü yapılamadı.',
    });
    expect(JSON.stringify(responseBody)).not.toContain('mysql password secret');
  });
});
