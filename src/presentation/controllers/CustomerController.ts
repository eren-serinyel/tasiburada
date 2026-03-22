import { Request, Response } from 'express';
import { CustomerService } from '../../application/services/CustomerService';
import { 
  CreateCustomerDto, 
  UpdateCustomerDto, 
  LoginDto, 
  ChangePasswordDto 
} from '../../application/dto/CustomerDto';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚀 POST /api/v1/customers/register endpoint called');
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
      
      const createCustomerDto: CreateCustomerDto = req.body;
      const customer = await this.customerService.createCustomer(createCustomerDto);

      res.status(201).json({
        success: true,
        message: 'Müşteri başarıyla oluşturuldu.',
        data: customer
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Müşteri oluşturulurken hata oluştu.',
        error: error
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const loginDto: LoginDto = req.body;
      const result = await this.customerService.login(loginDto);

      res.status(200).json({
        success: true,
        message: 'Giriş başarılı.',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Giriş yapılırken hata oluştu.',
        error: error
      });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const customer = await this.customerService.getCustomerById(customerId);

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Müşteri profili bulunamadı.',
        error: error
      });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const updateCustomerDto: UpdateCustomerDto = req.body;
      const customer = await this.customerService.updateCustomer(customerId, updateCustomerDto);

      res.status(200).json({
        success: true,
        message: 'Profil başarıyla güncellendi.',
        data: customer
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Profil güncellenirken hata oluştu.',
        error: error
      });
    }
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const changePasswordDto: ChangePasswordDto = req.body;
      await this.customerService.changePassword(customerId, changePasswordDto);

      res.status(200).json({
        success: true,
        message: 'Şifre başarıyla değiştirildi.'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Şifre değiştirilirken hata oluştu.',
        error: error
      });
    }
  };

  getShipments = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const shipments = await this.customerService.getCustomerWithShipments(customerId);

      res.status(200).json({
        success: true,
        data: shipments
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Müşteri taşıma istekleri bulunamadı.',
        error: error
      });
    }
  };

  searchCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { searchTerm } = req.query;
      if (!searchTerm || typeof searchTerm !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Arama terimi gereklidir.'
        });
        return;
      }

      const customers = await this.customerService.searchCustomers(searchTerm);

      res.status(200).json({
        success: true,
        data: customers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Müşteri arama işleminde hata oluştu.',
        error: error
      });
    }
  };
}