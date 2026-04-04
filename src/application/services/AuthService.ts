import * as bcrypt from 'bcryptjs';
import { CustomerRepository } from '../../infrastructure/repositories/CustomerRepository';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Customer } from '../../domain/entities/Customer';
import { Carrier } from '../../domain/entities/Carrier';

export class AuthService {
  private customerRepository = new CustomerRepository();
  private carrierRepository = new CarrierRepository();

  private generateToken(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private getRepository(userType: 'customer' | 'carrier') {
    return userType === 'customer' ? this.customerRepository : this.carrierRepository;
  }

  private getTypeORMRepository(userType: 'customer' | 'carrier') {
    return userType === 'customer'
      ? AppDataSource.getRepository(Customer)
      : AppDataSource.getRepository(Carrier);
  }

  async requestPasswordReset(email: string, userType: 'customer' | 'carrier') {
    const repo = this.getRepository(userType);
    const user = await repo.findByEmail(email);
    if (!user) {
      throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
    }

    const resetToken = this.generateToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await repo.update(user.id, {
      resetToken,
      resetTokenExpiry,
    } as any);

    return { success: true, resetToken, message: 'Token oluşturuldu.' };
  }

  async resetPassword(token: string, newPassword: string, userType: 'customer' | 'carrier') {
    const typeormRepo = this.getTypeORMRepository(userType);
    const repo = this.getRepository(userType);

    const user = await typeormRepo.findOne({
      where: { resetToken: token } as any,
    });

    if (!user) {
      throw new Error('Geçersiz sıfırlama kodu.');
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new Error('Sıfırlama kodunun süresi dolmuş.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await repo.update(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    } as any);

    return { success: true, message: 'Şifre başarıyla sıfırlandı.' };
  }

  async verifyEmail(token: string, userType: 'customer' | 'carrier') {
    const typeormRepo = this.getTypeORMRepository(userType);
    const repo = this.getRepository(userType);

    const user = await typeormRepo.findOne({
      where: { verificationToken: token } as any,
    });

    if (!user) {
      throw new Error('Geçersiz veya süresi dolmuş doğrulama kodu.');
    }

    await repo.update(user.id, {
      isVerified: true,
      verificationToken: null,
    } as any);

    return { success: true, message: 'E-posta adresi başarıyla doğrulandı.' };
  }

  async resendVerification(email: string, userType: 'customer' | 'carrier') {
    const repo = this.getRepository(userType);
    const user = await repo.findByEmail(email);
    if (!user) {
      throw new Error('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
    }

    if ((user as any).isVerified) {
      throw new Error('Bu hesap zaten doğrulanmış.');
    }

    const verificationToken = this.generateToken();

    await repo.update(user.id, {
      verificationToken,
    } as any);

    return { success: true, verificationToken, message: 'Yeni doğrulama kodu oluşturuldu.' };
  }
}
