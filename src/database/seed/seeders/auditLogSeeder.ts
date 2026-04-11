import { AppDataSource } from '../../../infrastructure/database/data-source';
import { AuditLog } from '../../../domain/entities/AuditLog';
import { Admin } from '../../../domain/entities/Admin';
import { Carrier } from '../../../domain/entities/Carrier';
import { randomPastDate } from '../helpers/seedHelpers';

export async function seedAuditLogs(
  admins: Admin[],
  carriers: Carrier[],
) {
  const repo = AppDataSource.getRepository(AuditLog);
  const created: AuditLog[] = [];
  const superadmin = admins[0];

  // ── Nakliyeci onay logları ──
  for (const carrier of carriers.filter(c => c.verifiedByAdmin)) {
    const log = repo.create({
      adminId: superadmin.id,
      action: 'CARRIER_APPROVED',
      targetType: 'carrier',
      targetId: carrier.id,
      details: {
        companyName: carrier.companyName,
        message: `${carrier.companyName} onaylandı`,
      },
    });
    const saved = await repo.save(log);

    // createdAt'i gerçekçi bir tarihe ayarla
    const pastDate = randomPastDate(60);
    await repo.update(saved.id, { createdAt: pastDate });

    created.push(saved);
  }

  // ── Platform ayar değişiklik logları ──
  const settingChanges = [
    {
      action: 'SETTINGS_UPDATED',
      details: { field: 'platform_commission', oldValue: '15', newValue: '10', message: 'Platform komisyonu %10 olarak güncellendi' },
    },
    {
      action: 'SETTINGS_UPDATED',
      details: { field: 'min_offer_price', oldValue: '50', newValue: '100', message: 'Minimum teklif fiyatı 100₺ olarak ayarlandı' },
    },
    {
      action: 'SETTINGS_UPDATED',
      details: { field: 'auto_approve_carriers', oldValue: 'true', newValue: 'false', message: 'Otomatik nakliyeci onayı kapatıldı' },
    },
    {
      action: 'SETTINGS_UPDATED',
      details: { field: 'contact_email', oldValue: 'info@tasiburada.com', newValue: 'destek@tasiburada.com', message: 'İletişim e-postası güncellendi' },
    },
  ];

  for (const change of settingChanges) {
    const log = repo.create({
      adminId: superadmin.id,
      action: change.action,
      targetType: 'platform_settings',
      targetId: 'global',
      details: change.details,
    });
    const saved = await repo.save(log);

    const pastDate = randomPastDate(30);
    await repo.update(saved.id, { createdAt: pastDate });

    created.push(saved);
  }

  // ── Admin giriş logları ──
  for (const admin of admins) {
    const log = repo.create({
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      targetType: 'admin',
      targetId: admin.id,
      details: { email: admin.email, message: `${admin.email} oturum açtı` },
    });
    const saved = await repo.save(log);

    const pastDate = randomPastDate(7);
    await repo.update(saved.id, { createdAt: pastDate });

    created.push(saved);
  }

  console.log(`  ✓ ${created.length} audit log kaydı`);
  return created;
}
