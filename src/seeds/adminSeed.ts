import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Admin } from '../domain/entities/Admin';

async function seedAdmin() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const adminRepo = AppDataSource.getRepository(Admin);

  const email = process.env.ADMIN_EMAIL ?? 'admin@tasiburada.com';
  const rawPassword = process.env.ADMIN_PASSWORD ?? 'Maviface2141';

  if (process.env.NODE_ENV === 'production' && rawPassword === 'Maviface2141') {
    throw new Error('Üretim ortamında varsayılan admin şifresi kullanılamaz. ADMIN_PASSWORD ortam değişkenini ayarlayın.');
  }

  const existing = await adminRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin zaten mevcut: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const                            admin = adminRepo.create({
    email,
    passwordHash,
    role: 'superadmin',
    isActive: true,
  });

  await adminRepo.save(admin);
  console.log(`Admin oluşturuldu: ${email}`);
}

seedAdmin()
  .then(() => {
    console.log('Admin seed tamamlandı.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Admin seed hatası:', err);
    process.exit(1);
  });
