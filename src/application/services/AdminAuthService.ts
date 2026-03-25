import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AdminRepository } from '../../infrastructure/repositories/AdminRepository';
import { Admin } from '../../domain/entities/Admin';

export class AdminAuthService {
  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  async login(email: string, password: string): Promise<{ token: string; admin: Partial<Admin> }> {
    const admin = await this.adminRepository.findByEmail(email);
    if (!admin) {
      throw new Error('E-posta veya şifre hatalı.');
    }

    if (!admin.isActive) {
      throw new Error('Hesabınız devre dışı bırakılmış. Lütfen yönetici ile iletişime geçin.');
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new Error('E-posta veya şifre hatalı.');
    }

    await this.adminRepository.updateLastLogin(admin.id);

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, type: 'admin', role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt,
      },
    };
  }

  async getProfile(adminId: string): Promise<Partial<Admin>> {
    const admin = await this.adminRepository.findById(adminId);
    if (!admin) throw new Error('Admin bulunamadı.');
    const { passwordHash: _pw, ...rest } = admin;
    return rest;
  }
}
