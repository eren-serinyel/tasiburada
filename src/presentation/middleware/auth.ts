import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  customerId?: string;
  carrierId?: string;
  adminId?: string;
  email: string;
  type: 'customer' | 'carrier' | 'admin';
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      carrierId?: string;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
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
    req.user = decoded;
    if (decoded.carrierId) {
      req.carrierId = decoded.carrierId;
    }
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
      res.status(403).json({
        success: false,
        message: 'Geçersiz token.'
      });
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Geçersiz token.'
    });
  }
};

export const authenticateCustomer = (req: Request, res: Response, next: NextFunction): void => {
  authenticateToken(req, res, () => {
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

export const authenticateCarrier = (req: Request, res: Response, next: NextFunction): void => {
  authenticateToken(req, res, () => {
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

export const authCarrier = authenticateCarrier;

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

    req.user = decoded;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Admin oturumunuz sona erdi.' });
      return;
    }
    res.status(403).json({ success: false, message: 'Geçersiz admin token.' });
  }
};

export const requireSuperadmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'superadmin') {
    res.status(403).json({ success: false, message: 'Bu işlem için süper admin yetkisi gereklidir.' });
    return;
  }
  next();
};