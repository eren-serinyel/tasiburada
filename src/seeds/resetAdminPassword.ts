import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../infrastructure/database/data-source';
import { Admin } from '../domain/entities/Admin';

async function resetAdminPassword() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const adminRepo = AppDataSource.getRepository(Admin);
  const email = process.env.ADMIN_EMAIL ?? 'admin@tasiburada.com';
  const newPassword = process.env.ADMIN_PASSWORD ?? 'Maviface2141';

  const admin = await adminRepo.findOne({ where: { email } });
  if (!admin) {
    console.error(`Admin bulunamadı: ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await adminRepo.update(admin.id, { passwordHash });
  console.log(`Admin şifresi güncellendi: ${email}`);
}

resetAdminPassword()
  .then(() => {
    console.log('Tamamlandı.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Hata:', err);
    process.exit(1);
  });
