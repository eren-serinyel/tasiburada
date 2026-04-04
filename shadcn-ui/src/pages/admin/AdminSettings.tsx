import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, ErrorState } from '@/components/admin/shared';
import { Save, Settings, Percent, Shield, Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type SettingsMap = Record<string, string>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [originalSettings, setOriginalSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await adminApiClient('/admin/settings');
      const json = await res.json();
      if (json.success) {
        const data: SettingsMap = json.data ?? {};
        setSettings(data);
        setOriginalSettings(data);
      } else {
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const logAudit = async (action: string, details: string) => {
    try {
      await adminApiClient('/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  };

  const validateSetting = (key: string, value: string): string | null => {
    if (!value || value.trim() === '') return 'Bu alan boş bırakılamaz';

    // Percent fields (0-100)
    if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('commission')) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 100) return 'Yüzde değeri 0-100 arasında olmalıdır';
    }

    // Numeric fields
    const numericPatterns = ['price', 'timeout', 'length', 'count', 'size', 'fee'];
    if (numericPatterns.some(p => key.toLowerCase().includes(p))) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return 'Geçerli bir sayı giriniz (0 veya üzeri)';
    }

    // URL fields
    if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
      try { new URL(value); } catch { return 'Geçerli bir URL giriniz (https://...)'; }
    }

    // Email fields
    if (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Geçerli bir e-posta adresi giriniz';
    }

    return null;
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSwitch = (key: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked ? 'true' : 'false' }));
  };

  const handleSave = async () => {
    // Validate all settings before saving
    for (const [key, value] of Object.entries(settings)) {
      if (key === 'auto_approve_carriers') continue; // boolean switch
      const err = validateSetting(key, value);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await adminApiClient('/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Ayarlar başarıyla kaydedildi ✓');
        // Log changed settings (non-blocking)
        for (const [key, value] of Object.entries(settings)) {
          if (originalSettings[key] !== value) {
            logAudit('SETTING_UPDATED', `"${key}" ayarı güncellendi → "${value}"`);
          }
        }
        setOriginalSettings({ ...settings });
      } else {
        toast.error(json.message || 'Ayarlar kaydedilemedi. Tekrar deneyin.');
      }
    } catch {
      toast.error('Ayarlar kaydedilemedi. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <div className="p-6 lg:p-8">
      <ErrorState onRetry={fetchSettings} />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Platform Ayarları" description="Genel platform yapılandırması" />
        <Button onClick={handleSave} disabled={!isDirty || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      {/* BÖLÜM 1: Genel Ayarlar */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Genel Ayarlar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <SkeletonFields count={4} /> : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Platform Adı</Label>
                  <Input
                    value={settings.platform_name ?? ''}
                    onChange={(e) => handleChange('platform_name', e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">İletişim E-postası</Label>
                  <Input
                    value={settings.contact_email ?? ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Min. Teklif Fiyatı (₺)</Label>
                  <Input
                    type="number"
                    value={settings.min_offer_price ?? ''}
                    onChange={(e) => handleChange('min_offer_price', e.target.value)}
                    className="mt-1 h-9 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <Label className="text-xs">Maks. İptal Oranı (%)</Label>
                  <Input
                    type="number"
                    value={settings.max_cancel_rate ?? ''}
                    onChange={(e) => handleChange('max_cancel_rate', e.target.value)}
                    className="mt-1 h-9 text-sm"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm text-slate-700">Otomatik Nakliyeci Onayı</p>
                  <p className="text-xs text-slate-400">Yeni kayıtlarda nakliyecileri otomatik onayla</p>
                </div>
                <Switch
                  checked={settings.auto_approve_carriers === 'true'}
                  onCheckedChange={(v) => handleSwitch('auto_approve_carriers', v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* BÖLÜM 2: Komisyon Ayarları */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Komisyon Ayarları</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonFields count={1} /> : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Platform Komisyonu (%)</Label>
                <Input
                  type="number"
                  value={settings.commission_rate ?? ''}
                  onChange={(e) => handleChange('commission_rate', e.target.value)}
                  className="mt-1 h-9 text-sm"
                  min={0}
                  max={50}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BÖLÜM 3: Güvenlik */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Güvenlik</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <SkeletonFields count={2} /> : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Minimum Şifre Uzunluğu</Label>
                <Input
                  type="number"
                  value={settings.min_password_length ?? ''}
                  onChange={(e) => handleChange('min_password_length', e.target.value)}
                  className="mt-1 h-9 text-sm"
                  min={6}
                  max={32}
                />
              </div>
              <div>
                <Label className="text-xs">Oturum Zaman Aşımı (dk)</Label>
                <Input
                  type="number"
                  value={settings.session_timeout ?? ''}
                  onChange={(e) => handleChange('session_timeout', e.target.value)}
                  className="mt-1 h-9 text-sm"
                  min={1}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Skeleton Fields ────────────────────────────────────────────────────────

function SkeletonFields({ count }: { count: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
