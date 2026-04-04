import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Channels, NotifState } from './types';

export const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className={className}>
    {children}
  </motion.div>
);

export const gradientBg = { background: 'linear-gradient(to bottom right, #F9FAFB, #EFF6FF)' };

export const API_BASE = '/api/v1';

export const defaultChannels = (): Channels => ({ email: true, sms: false, app: true, browser: true });

export const defaultNotif = (): NotifState => ({
  groups: [
    {
      id: 'offers-ops', title: 'Teklif ve İşlem Bildirimleri', description: 'Teklif, taşıma ve ödeme süreçleri.',
      items: [
        { id: 'offers.new', title: 'Yeni Teklif Bildirimi', description: 'Yeni teklif aldığınızda bilgilendirme.', enabled: true, channels: defaultChannels() },
        { id: 'shipment.updates', title: 'Taşıma Güncellemeleri', description: 'Nakliyat süreci değişimlerinde bilgi.', enabled: true, channels: defaultChannels() },
        { id: 'payment.status', title: 'Ödeme Onayı / Reddedilmesi', description: 'Ödeme durumu değişimleri.', enabled: true, channels: defaultChannels() },
      ],
    },
    {
      id: 'marketing', title: 'Kampanyalar ve Tanıtımlar', description: 'Fırsatlar, iş birlikleri ve özetler.',
      items: [
        { id: 'marketing.campaigns', title: 'Kampanya Bildirimleri', description: 'Yeni kampanyalar, indirim fırsatları.', enabled: false, channels: defaultChannels() },
        { id: 'marketing.partners', title: 'Partner İş Birlikleri', description: 'Sponsorlu kampanyalar ve markalı duyurular.', enabled: false, channels: defaultChannels() },
        { id: 'marketing.weekly', title: 'Haftalık Özetler', description: 'E-posta ile kısa rapor özeti.', enabled: true, channels: { ...defaultChannels(), app: false, browser: false } },
      ],
    },
    {
      id: 'security', title: 'Güvenlik Bildirimleri', description: 'Hesabınız için kritik güvenlik uyarıları.',
      items: [
        { id: 'security.login', title: 'Giriş Denemesi Uyarısı', description: 'Bilinmeyen girişlerde uyarı.', enabled: true, channels: { email: true, sms: true, app: true, browser: true } },
        { id: 'security.password', title: 'Şifre Değişikliği Bildirimi', description: 'Şifre değişiminde bilgilendirme.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'security.2fa', title: 'İki Aşamalı Doğrulama Hatırlatması', description: '2FA etkin değilse hatırlatma.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'in-app', title: 'Uygulama İçi Bildirimler', description: 'Platform içindeki etkileşimler.',
      items: [
        { id: 'app.message', title: 'Yeni Mesaj Geldiğinde', description: 'Sohbette yeni mesaj.', enabled: true, channels: { email: false, sms: false, app: true, browser: true } },
        { id: 'app.review', title: 'Nakliyeci Yorum Bıraktığında', description: 'Yeni yorum bildirimi.', enabled: true, channels: defaultChannels() },
        { id: 'app.feedback', title: 'İş Tamamlandıktan Sonra Geri Bildirim Hatırlatması', description: 'Tamamlanan işler için hatırlatma.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
  ],
  extras: { quietMode: false, timeWindow: { start: '09:00', end: '22:00' }, dailySummary: false, smsLimit: 3 },
});

export const defaultCarrierNotif = (): NotifState => ({
  groups: [
    {
      id: 'process', title: 'Teklif ve Taşıma Süreci', description: 'Nakliyeciye özel teklif, rota ve ödeme akışı bildirimleri.',
      items: [
        { id: 'offer.received', title: 'Yeni Teklif Alındı', description: 'Müşteriden gelen yeni taşıma teklifi.', enabled: true, channels: { email: true, sms: true, app: true, browser: true } },
        { id: 'offer.accepted', title: 'Teklif Kabul Edildi', description: 'Teklifiniz müşteri tarafından kabul edildi.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'shipment.schedule.update', title: 'Yeni Rota / Tarih Güncellemesi', description: 'Tarih veya adres değişikliği olduğunda.', enabled: true, channels: { email: true, sms: false, app: true, browser: true } },
        { id: 'shipment.lifecycle', title: 'İş Başladı / Tamamlandı', description: 'Taşıma başlangıç ve tamamlanma bildirimleri.', enabled: true, channels: { email: false, sms: false, app: true, browser: true } },
        { id: 'payment.approved.transfered', title: 'Ödeme Onayı / Aktarım Tamamlandı', description: 'Ödeme onaylandığında veya kazanç hesabına aktarıldığında.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'reviews', title: 'Değerlendirme ve Geri Bildirim', description: 'Müşteri değerlendirmeleri ve kritik geri bildirim uyarıları.',
      items: [
        { id: 'review.new', title: 'Yeni Değerlendirme Alındı', description: 'Taşıma sonrası puanlama/yorum.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'review.negative', title: 'Olumsuz Yorum Uyarısı', description: 'Düşük puan veya olumsuz yorumda uyarı.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'security', title: 'Güvenlik Bildirimleri', description: 'Hesap, ödeme ve erişimle ilgili güvenlik uyarıları.',
      items: [
        { id: 'security.login', title: 'Bilinmeyen Giriş Denemesi', description: 'Farklı cihaz/IP giriş uyarısı.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'security.password', title: 'Şifre Değişikliği Bildirimi', description: 'Şifreniz değiştiğinde bilgilendirme.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'security.2fa', title: 'İki Aşamalı Doğrulama Hatırlatması', description: '2FA devre dışıysa etkinleştirme önerisi.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
    {
      id: 'system', title: 'Sistem Duyuruları', description: 'Platform güncellemeleri ve nakliyeciye özel kampanyalar.',
      items: [
        { id: 'system.campaigns', title: 'Yeni Kampanyalar / Premium Fırsatlar', description: 'Komisyon indirimleri, özel üyelikler.', enabled: false, channels: { email: true, sms: false, app: true, browser: false } },
        { id: 'system.updates', title: 'Platform Güncellemeleri', description: 'Yeni özellikler, bakım veya duyurular.', enabled: true, channels: { email: true, sms: false, app: true, browser: false } },
      ],
    },
  ],
  extras: { quietMode: false, timeWindow: { start: '08:00', end: '22:00' }, dailySummary: false, smsLimit: 3 },
});

export const migrateOldNotif = (oldObj: any): NotifState => {
  const base = defaultNotif();
  try {
    const map: Record<string, boolean> = oldObj || {};
    const on = (k: string) => Boolean(map[k]);
    for (const g of base.groups) {
      for (const it of g.items) {
        if (it.id.startsWith('offers.')) it.enabled = on('offers');
        if (it.id.startsWith('marketing.')) it.enabled = on('campaigns');
        if (it.id.startsWith('security.')) it.enabled = on('security');
        if (it.id === 'shipment.updates' || it.id === 'payment.status') it.enabled = on('status');
      }
    }
  } catch {}
  return base;
};

export const useInitials = (name?: string, surname?: string) =>
  useMemo(() => `${(name || '').charAt(0)}${(surname || '').charAt(0)}`.toUpperCase(), [name, surname]);
