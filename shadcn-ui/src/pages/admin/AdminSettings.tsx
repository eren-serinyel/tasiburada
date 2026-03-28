import { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/admin/shared';
import { Save, Settings, Percent, Bell, Shield } from 'lucide-react';

/* Platform ayarları henüz backend entity'si olmadığı için
   bu sayfa local state ile form görünümü sunar.
   Backend entegrasyonu eklendiğinde GET/PUT /admin/settings çağrılacak. */

interface PlatformSettings {
  siteName: string;
  supportEmail: string;
  commissionRate: number;
  minOfferPrice: number;
  maxOfferPrice: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  requireEmailVerification: boolean;
}

const defaultSettings: PlatformSettings = {
  siteName: 'TaşıBurada',
  supportEmail: 'destek@tasiburada.com',
  commissionRate: 10,
  minOfferPrice: 100,
  maxOfferPrice: 100000,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  maxLoginAttempts: 5,
  sessionTimeout: 60,
  requireEmailVerification: true,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: POST /admin/settings when backend entity is ready
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Ayarlar kaydedildi.');
    setSaving(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <PageHeader title="Platform Ayarları" description="Genel platform yapılandırması" />

      {/* Genel */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Genel</CardTitle>
          </div>
          <CardDescription className="text-xs">Site adı ve iletişim bilgileri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Site Adı</Label>
              <Input value={settings.siteName} onChange={(e) => update('siteName', e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Destek E-posta</Label>
              <Input value={settings.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} className="mt-1 h-9 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Komisyon */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Komisyon & Fiyat</CardTitle>
          </div>
          <CardDescription className="text-xs">Komisyon oranı ve teklif limitleri</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Komisyon Oranı (%)</Label>
              <Input type="number" value={settings.commissionRate} onChange={(e) => update('commissionRate', Number(e.target.value))} className="mt-1 h-9 text-sm" min={0} max={100} />
            </div>
            <div>
              <Label className="text-xs">Min Teklif (₺)</Label>
              <Input type="number" value={settings.minOfferPrice} onChange={(e) => update('minOfferPrice', Number(e.target.value))} className="mt-1 h-9 text-sm" min={0} />
            </div>
            <div>
              <Label className="text-xs">Max Teklif (₺)</Label>
              <Input type="number" value={settings.maxOfferPrice} onChange={(e) => update('maxOfferPrice', Number(e.target.value))} className="mt-1 h-9 text-sm" min={0} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bildirim */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Bildirimler</CardTitle>
          </div>
          <CardDescription className="text-xs">Bildirim kanallarını yönetin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">E-posta Bildirimleri</p>
              <p className="text-xs text-slate-400">Kullanıcılara e-posta ile bildirim gönder</p>
            </div>
            <Switch checked={settings.emailNotifications} onCheckedChange={(v) => update('emailNotifications', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Push Bildirimleri</p>
              <p className="text-xs text-slate-400">Tarayıcı bildirimleri</p>
            </div>
            <Switch checked={settings.pushNotifications} onCheckedChange={(v) => update('pushNotifications', v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">SMS Bildirimleri</p>
              <p className="text-xs text-slate-400">Telefona SMS gönder</p>
            </div>
            <Switch checked={settings.smsNotifications} onCheckedChange={(v) => update('smsNotifications', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Güvenlik</CardTitle>
          </div>
          <CardDescription className="text-xs">Oturum ve kimlik doğrulama ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Maks Giriş Deneme</Label>
              <Input type="number" value={settings.maxLoginAttempts} onChange={(e) => update('maxLoginAttempts', Number(e.target.value))} className="mt-1 h-9 text-sm" min={1} />
            </div>
            <div>
              <Label className="text-xs">Oturum Süresi (dk)</Label>
              <Input type="number" value={settings.sessionTimeout} onChange={(e) => update('sessionTimeout', Number(e.target.value))} className="mt-1 h-9 text-sm" min={5} />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">E-posta Doğrulama Zorunlu</p>
              <p className="text-xs text-slate-400">Yeni kayıtlarda e-posta doğrulaması iste</p>
            </div>
            <Switch checked={settings.requireEmailVerification} onCheckedChange={(v) => update('requireEmailVerification', v)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  );
}
