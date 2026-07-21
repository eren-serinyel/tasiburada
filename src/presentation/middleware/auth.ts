import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Admin } from '../../domain/entities/Admin';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Customer } from '../../domain/entities/Customer';

interface JwtPayload {
  customerId?: string;
  carrierId?: string;
  adminId?: string;
  email: string;
  type: 'customer' | 'carrier' | 'admin';
  role?: string;
  isActive?: boolean;
  verifiedByAdmin?: boolean;
  approvalState?: CarrierApprovalState;
}

type FreshAuthResult =
  | { status: 'ok'; user: JwtPayload }
  | { status: 'missing' }
  | { status: 'inactive' };

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      carrierId?: string;
    }
  }
}

const loadFreshAuthContext = async (decoded: JwtPayload): Promise<FreshAuthResult> => {
  if (decoded.type === 'customer') {
    if (!decoded.customerId) {
      return { status: 'missing' };
    }

    const customer = await AppDataSource.getRepository(Customer).findOne({
      where: { id: decoded.customerId },
      select: ['id', 'isActive'],
    });

    if (!customer) {
      return { status: 'missing' };
    }
    if (!customer.isActive) {
      return { status: 'inactive' };
    }

    return {
      status: 'ok',
      user: {
        customerId: customer.id,
        email: decoded.email,
        type: 'customer',
        isActive: customer.isActive,
      },
    };
  }

  if (decoded.type === 'carrier') {
    if (!decoded.carrierId) {
      return { status: 'missing' };
    }

    const carrier = await AppDataSource.getRepository(Carrier).findOne({
      where: { id: decoded.carrierId },
      select: ['id', 'isActive', 'verifiedByAdmin', 'approvalState'],
    });

    if (!carrier) {
      return { status: 'missing' };
    }
    if (!carrier.isActive) {
      return { status: 'inactive' };
    }

    return {
      status: 'ok',
      user: {
        carrierId: carrier.id,
        email: decoded.email,
        type: 'carrier',
        isActive: carrier.isActive,
        verifiedByAdmin: carrier.verifiedByAdmin,
        approvalState: carrier.approvalState,
      },
    };
  }

  if (decoded.type === 'admin') {
    if (!decoded.adminId) {
      return { status: 'missing' };
    }

    const admin = await AppDataSource.getRepository(Admin).findOne({
      where: { id: decoded.adminId },
      select: ['id', 'isActive', 'role', 'deletedAt'],
      withDeleted: true,
    });

    if (!admin || admin.deletedAt) {
      return { status: 'missing' };
    }
    if (!admin.isActive) {
      return { status: 'inactive' };
    }

    return {
      status: 'ok',
      user: {
        adminId: admin.id,
        email: decoded.email,
        type: 'admin',
        role: admin.role,
        isActive: admin.isActive,
      },
    };
  }

  return { status: 'missing' };
};

const assignFreshAuthContext = (req: Request, user: JwtPayload): void => {
  req.user = user;
  if (user.type === 'carrier' && user.carrierId) {
    req.carrierId = user.carrierId;
  }
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Erişim token gereklidir.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const freshAuth = await loadFreshAuthContext(decoded);

    if (freshAuth.status === 'missing') {
      res.status(401).json({
        success: false,
        message: 'Oturum geçersiz.'
      });
      return;
    }
    if (freshAuth.status === 'inactive') {
      res.status(403).json({
        success: false,
        message: 'Hesap kullanıma uygun değil.'
      });
      return;
    }

    assignFreshAuthContext(req, freshAuth.user);
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Oturumunuz sona erdi.'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Geçersiz token.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Kimlik doğrulama kontrolü yapılamadı.'
    });
  }
};

export const optionalAuthenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const freshAuth = await loadFreshAuthContext(decoded);

    if (freshAuth.status === 'missing') {
      res.status(401).json({
        success: false,
        message: 'Oturum geçersiz.'
      });
      return;
    }
    if (freshAuth.status === 'inactive') {
      res.status(403).json({
        success: false,
        message: 'Hesap kullanıma uygun değil.'
      });
      return;
    }

    assignFreshAuthContext(req, freshAuth.user);
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Oturumunuz sona erdi.'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Geçersiz token.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Kimlik doğrulama kontrolü yapılamadı.'
    });
  }
};

export const authenticateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticateToken(req, res, () => {
    if (req.user?.type !== 'customer') {
      res.status(403).json({
        success: false,
        message: 'Bu işlem için müşteri hesabı gereklidir.'
      });
      return;
    }
    next();
  });
};

export const authenticateCarrier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await authenticateToken(req, res, () => {
    if (req.user?.type !== 'carrier') {
      res.status(403).json({
        success: false,
        message: 'Bu işlem için nakliyeci hesabı gereklidir.'
      });
      return;
    }
    next();
  });
};

export const requireVerifiedCarrier = (req: Request, res: Response, next: NextFunction): void => {
  const carrier = req.user;
  if (carrier?.type !== 'carrier' || !carrier.carrierId) {
    res.status(401).json({
      success: false,
      message: 'Kimlik dogrulamasi gerekli.',
    });
    return;
  }

  if (!carrier.isActive) {
    res.status(403).json({
      success: false,
      message: 'Hesabiniz aktif degil. Lutfen destekle iletisime gecin.',
    });
    return;
  }

  if (!carrier.verifiedByAdmin || carrier.approvalState !== CarrierApprovalState.APPROVED) {
    res.status(403).json({
      success: false,
      code: 'CARRIER_VERIFICATION_REQUIRED',
      message: 'Marketplace islemleri icin belgelerinizin yuklenmis ve admin tarafindan onaylanmis olmasi gerekir.',
    });
    return;
  }

  next();
};


export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Admin token gereklidir.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (decoded.type !== 'admin') {
      res.status(403).json({ success: false, message: 'Bu alana erişim yetkiniz yok.' });
      return;
    }

    const freshAuth = await loadFreshAuthContext(decoded);
    if (freshAuth.status === 'missing') {
      res.status(401).json({ success: false, message: 'Geçersiz admin oturumu.' });
      return;
    }
    if (freshAuth.status === 'inactive') {
      res.status(403).json({ success: false, message: 'Admin hesabı kullanıma uygun değil.' });
      return;
    }

    assignFreshAuthContext(req, freshAuth.user);
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Admin oturumunuz sona erdi.' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Geçersiz admin token.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Admin doğrulama kontrolü yapılamadı.' });
  }
};

export const requireSuperadmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Bu işlem için süper admin yetkisi gereklidir.' });
    return;
  }
  next();
};
