import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Admin } from '../../../domain/entities/Admin';
import { hashPassword } from '../helpers/seedHelpers';

export async function seedAdmins(): Promise<Admin[]> {
  const repo = AppDataSource.getRepository(Admin);

  const admins = [
    {
      email: 'superadmin@tasiburada.com',
      password: 'Admin1234!',
      role: 'superadmin' as const,
      firstName: 'Süper',
      lastName: 'Admin',
    },
    {
      email: 'admin@tasiburada.com',
      password: 'Admin1234!',
      role: 'admin' as const,
      firstName: 'Platform',
      lastName: 'Yöneticisi',
    },
  ];

  const created: Admin[] = [];
  for (const a of admins) {
    const admin = repo.create({
      email: a.email,
      passwordHash: await hashPassword(a.password),
      role: a.role,
      firstName: a.firstName,
      lastName: a.lastName,
      isActive: true,
      lastLogin: new Date(),
    });
    created.push(await repo.save(admin));
  }

  console.log(`  ✓ ${created.length} admin`);
  console.log('  📧 superadmin@tasiburada.com / Admin1234!');
  console.log('  📧 admin@tasiburada.com / Admin1234!');
  return created;
}
