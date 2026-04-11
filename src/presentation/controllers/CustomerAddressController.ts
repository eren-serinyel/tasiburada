import { Request, Response } from 'express';
import { CustomerAddressService } from '../../application/services/CustomerAddressService';
import { AppError } from '../../domain/errors/AppError';

export class CustomerAddressController {
  private service = new CustomerAddressService();

  getAddresses = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = (req as any).user?.customerId as string;
      const addresses = await this.service.getAddresses(customerId);
      res.json({ success: true, data: addresses });
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  addAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = (req as any).user?.customerId as string;
      const { addressLine1, city, district } = req.body;
      if (!addressLine1 || !city || !district) {
        res.status(400).json({ success: false, message: 'Adres satırı, şehir ve ilçe zorunludur.' });
        return;
      }
      if (typeof addressLine1 === 'string' && addressLine1.trim().length < 5) {
        res.status(400).json({ success: false, message: 'Adres en az 5 karakter olmalıdır.' });
        return;
      }
      const address = await this.service.addAddress(customerId, req.body);
      res.status(201).json({ success: true, data: address });
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  updateAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = (req as any).user?.customerId as string;
      const addressId = Number(req.params.id);
      const address = await this.service.updateAddress(customerId, addressId, req.body);
      res.json({ success: true, data: address });
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  deleteAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = (req as any).user?.customerId as string;
      const addressId = Number(req.params.id);
      await this.service.deleteAddress(customerId, addressId);
      res.json({ success: true, message: 'Adres silindi.' });
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };

  setDefault = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = (req as any).user?.customerId as string;
      const addressId = Number(req.params.id);
      await this.service.setDefault(customerId, addressId);
      res.json({ success: true, message: 'Varsayılan adres güncellendi.' });
    } catch (error: any) {
      const status = error instanceof AppError ? error.statusCode : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  };
}
