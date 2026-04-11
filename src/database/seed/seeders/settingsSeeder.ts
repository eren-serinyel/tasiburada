import { AppDataSource } from '../../../infrastructure/database/data-source';
import { PlatformSetting } from '../../../domain/entities/PlatformSetting';

export async function seedPlatformSettings() {
  const repo = AppDataSource.getRepository(PlatformSetting);

  const settings: Array<{
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
  }> = [
    { key: 'platform_name', value: 'TaşıBurada', type: 'string', description: 'Platform adı' },
    { key: 'contact_email', value: 'destek@tasiburada.com', type: 'string', description: 'İletişim e-posta adresi' },
    { key: 'min_offer_price', value: '100', type: 'number', description: 'Minimum teklif fiyatı (₺)' },
    { key: 'max_cancellation_rate', value: '30', type: 'number', description: 'Maksimum iptal oranı (%)' },
    { key: 'auto_approve_carriers', value: 'false', type: 'boolean', description: 'Nakliyeci otomatik onay' },
    { key: 'platform_commission', value: '10', type: 'number', description: 'Platform komisyonu (%)' },
    { key: 'min_commission_amount', value: '50', type: 'number', description: 'Minimum komisyon tutarı (₺)' },
    { key: 'min_password_length', value: '8', type: 'number', description: 'Minimum şifre uzunluğu' },
    { key: 'session_timeout', value: '60', type: 'number', description: 'Oturum zaman aşımı (dk)' },
  ];

  for (const s of settings) {
    const existing = await repo.findOne({ where: { key: s.key } });
    if (!existing) {
      await repo.save(repo.create(s));
    }
  }

  console.log(`  ✓ ${settings.length} platform ayarı`);
}
