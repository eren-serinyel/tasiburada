import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CustomerRepository } from '../../infrastructure/repositories/CustomerRepository';
import { CarrierRepository } from '../../infrastructure/repositories/CarrierRepository';
import { AppDataSource } from '../../infrastructure/database/data-source';
import { Customer } from '../../domain/entities/Customer';
import { Carrier } from '../../domain/entities/Carrier';
import { emailService } from './EmailService';

export class AuthService {
  private customerRepository = new CustomerRepository();
  private carrierRepository = new CarrierRepository();

  private generateToken(): string {
    // 32 byte = 64 hex karakter — kriptografik olarak güvenli
    return crypto.randomBytes(32).toString('hex');
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
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 60 dakika

    await repo.update(user.id, {
      resetToken,
      resetTokenExpiry,
    } as any);

    // Geliştirme ortamında token konsola basılır (test edilebilirlik için)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Reset token (${userType} — ${email}):`, resetToken);
    }

    // E-posta gönderimini arka planda yap (fire-and-forget)
    emailService.sendPasswordReset(email, resetToken, userType).catch((err) => {
      console.error('[EmailService] sendPasswordReset failed:', err);
    });

    return { success: true, message: 'Şifre sıfırlama talebi alındı. E-posta adresinizi kontrol edin.' };
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

    // Geliştirme ortamında token konsola basılır (test edilebilirlik için)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Verification token (${userType} — ${email}):`, verificationToken);
    }

    // E-posta gönderimini arka planda yap (fire-and-forget)
    emailService.sendVerificationEmail(email, verificationToken, userType).catch((err) => {
      console.error('[EmailService] sendVerificationEmail failed:', err);
    });

    return { success: true, message: 'Yeni doğrulama kodu oluşturuldu. E-posta adresinizi kontrol edin.' };
  }

  async checkEmailUserType(email: string): Promise<'customer' | 'carrier' | null> {
    const customer = await this.customerRepository.findByEmail(email);
    if (customer) return 'customer';
    const carrier = await this.carrierRepository.findByEmail(email);
    if (carrier) return 'carrier';
    return null;
  }
}
