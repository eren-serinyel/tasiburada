import { SeedDataSource as AppDataSource } from '../seedDataSource';
import { Admin } from '../../../domain/entities/Admin';
import { hashPassword } from '../helpers/seedHelpers';

export async function seedAdmins(): Promise<Admin[]> {
  const repo = AppDataSource.getRepository(Admin);

  const admins = [
    {
      email: 'superadmin@tasiburadan.com',
      password: 'Maviface2141',
      role: 'superadmin' as const,
      firstName: 'Süper',
      lastName: 'Admin',
    },
    {
      email: 'admin@tasiburadan.com',
      password: 'Maviface2141',
      role: 'admin' as const,
      firstName: 'Platform',
      lastName: 'Yöneticisi',
    },
  ];

  const created: Admin[] = [];
  for (const a of admins) {
    const existing = await repo.findOne({ where: { email: a.email } });
    if (existing) { created.push(existing); continue; }
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
  console.log('  📧 superadmin@tasiburadan.com / [seed şifresi]');
  console.log('  📧 admin@tasiburadan.com / [seed şifresi]');
  return created;
}
