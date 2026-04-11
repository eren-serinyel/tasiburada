import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Shield, Save, Eye, EyeOff } from 'lucide-react';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

export default function SecuritySection({ user }: SectionProps) {
  const isCarrier = user.type === 'carrier';
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showNewPwdRepeat, setShowNewPwdRepeat] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(false);
  const [securityDefaults, setSecurityDefaults] = useState({ twoFactorEnabled: false, suspiciousLoginAlertsEnabled: false });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch security settings for carrier
  useEffect(() => {
    if (!isCarrier) return;
    (async () => {
      try {
        const res = await apiClient(`${API_BASE}/carriers/${user.id}`);
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        const sec = json.data?.carrier?.securitySettings || json.data?.securitySettings;
        if (sec) {
          const norm = { twoFactorEnabled: Boolean(sec.twoFactorEnabled), suspiciousLoginAlertsEnabled: Boolean(sec.suspiciousLoginAlertsEnabled) };
          setTwoFA(norm.twoFactorEnabled);
          setSuspiciousAlerts(norm.suspiciousLoginAlertsEnabled);
          setSecurityDefaults(norm);
        }
      } catch {}
    })();
  }, [isCarrier, user.id]);

  const dirty = useMemo(() => {
    if (!isCarrier) return Boolean(currentPwd || newPwd || newPwd2);
    return Boolean(currentPwd || newPwd || newPwd2 || twoFA !== securityDefaults.twoFactorEnabled || suspiciousAlerts !== securityDefaults.suspiciousLoginAlertsEnabled);
  }, [isCarrier, currentPwd, newPwd, newPwd2, twoFA, suspiciousAlerts, securityDefaults]);

  const pwdStrength = useMemo(() => {
    if (!newPwd) return { level: 0, label: '', color: '' };
    let s = 0;
    if (newPwd.length >= 6) s++;
    if (newPwd.length >= 10) s++;
    if (/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd)) s++;
    if (/\d/.test(newPwd)) s++;
    if (/[^A-Za-z0-9]/.test(newPwd)) s++;
    if (s <= 1) return { level: 1, label: 'Zayıf', color: 'bg-red-500' };
    if (s <= 2) return { level: 2, label: 'Orta', color: 'bg-amber-500' };
    if (s <= 3) return { level: 3, label: 'İyi', color: 'bg-blue-500' };
    return { level: 4, label: 'Güçlü', color: 'bg-emerald-500' };
  }, [newPwd]);

  const save = async () => {
    if (!dirty) return;
    if ((newPwd || newPwd2) && newPwd !== newPwd2) { toast.error('Şifreler eşleşmiyor.'); return; }
    if ((newPwd || newPwd2) && !currentPwd) { toast.error('Mevcut şifrenizi girin.'); return; }

    setIsSaving(true);
    try {
      if (isCarrier) {
        const res = await apiClient(`${API_BASE}/carriers/${user.id}/security`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ twoFactorEnabled: twoFA, suspiciousLoginAlertsEnabled: suspiciousAlerts, currentPassword: currentPwd || undefined, newPassword: newPwd || undefined }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Güvenlik ayarları güncellenemedi.');
        setSecurityDefaults({ twoFactorEnabled: twoFA, suspiciousLoginAlertsEnabled: suspiciousAlerts });
      } else {
        if (!currentPwd || !newPwd) { toast.error('Mevcut şifre ve yeni şifre zorunludur.'); return; }
        const res = await apiClient(`${API_BASE}/customers/change-password`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.message || 'Şifre güncellenemedi.');
      }
      setCurrentPwd(''); setNewPwd(''); setNewPwd2('');
      toast.success(isCarrier ? 'Güvenlik ayarları güncellendi.' : 'Şifreniz güncellendi.');
    } catch (err: any) {
      toast.error(err?.message || 'Güvenlik ayarları kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle>Güvenlik</CardTitle><CardDescription>Şifrenizi güncelleyin ve iki aşamalı doğrulamayı yönetin.</CardDescription></CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label>Mevcut Şifre</Label>
            <div className="relative mt-1 mb-3">
              <Input type={showCurrentPwd ? 'text' : 'password'} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="pr-12" placeholder="*******" />
              <button type="button" aria-label="Mevcut şifreyi göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={() => setShowCurrentPwd(p => !p)}>
                {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Yeni Şifre</Label>
            <div className="relative mt-1 mb-3">
              <Input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="pr-12" placeholder="En az 8 karakter, 1 büyük harf, 1 rakam" />
              <button type="button" aria-label="Yeni şifreyi göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={() => setShowNewPwd(p => !p)}>
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPwd && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= pwdStrength.level ? pwdStrength.color : 'bg-slate-200')} />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-slate-500">{pwdStrength.label}</span>
              </div>
            )}
          </div>
          <div>
            <Label>Yeni Şifre Tekrar</Label>
            <div className="relative mt-1 mb-3">
              <Input type={showNewPwdRepeat ? 'text' : 'password'} value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} className="pr-12" />
              <button type="button" aria-label="Yeni şifre tekrarı göster" className="absolute inset-y-0 right-2 flex items-center text-slate-500" onClick={() => setShowNewPwdRepeat(p => !p)}>
                {showNewPwdRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl flex items-center justify-between">
            <div><div className="font-medium text-slate-800 flex items-center gap-2"><Shield className="h-4 w-4" /> İki Aşamalı Doğrulama (2FA)</div><div className="text-sm text-slate-600">Hesabınızı SMS veya Authenticator ile koruyabilirsiniz.</div></div>
            <Switch checked={twoFA} onCheckedChange={(v) => setTwoFA(Boolean(v))} />
          </div>
          <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
            <div><div className="font-medium text-slate-800">Şüpheli Giriş Uyarıları</div><div className="text-sm text-slate-600">Farklı cihaz/IP giriş denemelerinde e-posta al.</div></div>
            <Switch checked={suspiciousAlerts} onCheckedChange={(v) => setSuspiciousAlerts(Boolean(v))} />
          </div>
        </div>
        <div className="flex justify-end pt-6">
          <Button onClick={save} disabled={!dirty || isSaving} className="h-[42px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60">
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </div>
        <div className="mt-8 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-600 mb-1">Tehlikeli Bölge</h3>
          <p className="text-xs text-slate-500 mb-4">Bu işlem geri alınamaz. Hesabınız kalıcı olarak silinir.</p>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-9">Hesabımı Sil</Button>
        </div>
      </CardContent>
    </Card>
  );
}
