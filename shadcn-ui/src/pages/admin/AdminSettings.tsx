import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@/components/admin/shared';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Save, Check, Settings, Percent, Shield, Loader2,
  UserCheck, History, AlertTriangle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneralSettings {
  platformName: string;
  contactEmail: string;
  minOfferPrice: number;
  maxCancellationRate: number;
}

interface CarrierSettings {
  autoApprove: boolean;
}

interface CommissionSettings {
  platformCommission: number;
  minCommissionAmount: number;
}

interface SecuritySettings {
  minPasswordLength: number;
  sessionTimeout: number;
}

interface AuditEntry {
  id: string;
  action: string;
  targetType?: string;
  adminId?: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_GENERAL: GeneralSettings = {
  platformName: '',
  contactEmail: '',
  minOfferPrice: 100,
  maxCancellationRate: 30,
};

const DEFAULT_CARRIER: CarrierSettings = { autoApprove: false };

const DEFAULT_COMMISSION: CommissionSettings = {
  platformCommission: 10,
  minCommissionAmount: 50,
};

const DEFAULT_SECURITY: SecuritySettings = {
  minPasswordLength: 8,
  sessionTimeout: 60,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);
  const [saving, setSaving]     = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [confirmAutoApprove, setConfirmAutoApprove] = useState(false);

  // Section state
  const [general, setGeneral]       = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [carrier, setCarrier]       = useState<CarrierSettings>(DEFAULT_CARRIER);
  const [commission, setCommission] = useState<CommissionSettings>(DEFAULT_COMMISSION);
  const [security, setSecurity]     = useState<SecuritySettings>(DEFAULT_SECURITY);

  // Initial (saved) values for dirty checking
  const [initGeneral, setInitGeneral]       = useState<GeneralSettings | null>(null);
  const [initCarrier, setInitCarrier]       = useState<CarrierSettings | null>(null);
  const [initCommission, setInitCommission] = useState<CommissionSettings | null>(null);
  const [initSecurity, setInitSecurity]     = useState<SecuritySettings | null>(null);

  // Audit log
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  // Dirty flags
  const hasGeneralChanges    = initGeneral    !== null && JSON.stringify(general)    !== JSON.stringify(initGeneral);
  const hasCarrierChanges    = initCarrier    !== null && JSON.stringify(carrier)    !== JSON.stringify(initCarrier);
  const hasCommissionChanges = initCommission !== null && JSON.stringify(commission) !== JSON.stringify(initCommission);
  const hasSecurityChanges   = initSecurity   !== null && JSON.stringify(security)   !== JSON.stringify(initSecurity);

  // ── Fetch settings ────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res  = await adminApiClient('/admin/settings');
      const json = await res.json();
      if (json.success) {
        const d = json.data ?? {};

        const g: GeneralSettings = {
          platformName:        d.platform_name          ?? '',
          contactEmail:        d.contact_email          ?? '',
          minOfferPrice:       Number(d.min_offer_price ?? 100),
          maxCancellationRate: Number(d.max_cancellation_rate ?? 30),
        };
        const c: CarrierSettings = {
          autoApprove: d.auto_approve_carriers === 'true' || d.auto_approve_carriers === true,
        };
        const com: CommissionSettings = {
          platformCommission:  Number(d.platform_commission   ?? 10),
          minCommissionAmount: Number(d.min_commission_amount ?? 50),
        };
        const sec: SecuritySettings = {
          minPasswordLength: Number(d.min_password_length ?? 8),
          sessionTimeout:    Number(d.session_timeout     ?? 60),
        };

        setGeneral(g);    setInitGeneral({ ...g });
        setCarrier(c);    setInitCarrier({ ...c });
        setCommission(com); setInitCommission({ ...com });
        setSecurity(sec); setInitSecurity({ ...sec });
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

  const fetchAuditLog = useCallback(async () => {
    try {
      const res  = await adminApiClient('/admin/audit-log?limit=5&page=1');
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data?.data ?? json.data?.logs ?? []);
      }
    } catch {
      // non-critical — silent
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAuditLog();
  }, [fetchSettings, fetchAuditLog]);

  // ── Generic save ──────────────────────────────────────────────────────────

  const saveSection = useCallback(async (
    sectionKey: string,
    payload: Record<string, string | number | boolean>,
  ) => {
    setSaving(sectionKey);
    try {
      const res  = await adminApiClient('/admin/settings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success('Ayarlar kaydedildi ✓');
        setLastSaved(new Date().toISOString());
        fetchAuditLog();
      } else {
        toast.error(json.message ?? 'Kayıt başarısız.');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Hata oluştu';
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  }, [fetchAuditLog]);

  // ── Section savers ────────────────────────────────────────────────────────

  const handleSaveGeneral = () => {
    if (!general.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(general.contactEmail)) {
      toast.error('Geçerli bir e-posta adresi giriniz.');
      return;
    }
    if (!general.platformName.trim()) {
      toast.error('Platform adı boş bırakılamaz.');
      return;
    }
    saveSection('general', {
      platform_name:          general.platformName,
      contact_email:          general.contactEmail,
      min_offer_price:        general.minOfferPrice,
      max_cancellation_rate:  general.maxCancellationRate,
    }).then(() => setInitGeneral({ ...general }));
  };

  const handleSaveCarrier = () => {
    saveSection('carrier', {
      auto_approve_carriers: carrier.autoApprove,
    }).then(() => setInitCarrier({ ...carrier }));
  };

  const handleSaveCommission = () => {
    if (commission.platformCommission < 0 || commission.platformCommission > 100) {
      toast.error('Komisyon oranı 0-100 arasında olmalıdır.');
      return;
    }
    saveSection('commission', {
      platform_commission:   commission.platformCommission,
      min_commission_amount: commission.minCommissionAmount,
    }).then(() => setInitCommission({ ...commission }));
  };

  const handleSaveSecurity = () => {
    if (security.minPasswordLength < 6 || security.minPasswordLength > 32) {
      toast.error('Şifre uzunluğu 6-32 arasında olmalıdır.');
      return;
    }
    saveSection('security', {
      min_password_length: security.minPasswordLength,
      session_timeout:     security.sessionTimeout,
    }).then(() => setInitSecurity({ ...security }));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) return (
    <div className="p-6 lg:p-8">
      <ErrorState onRetry={fetchSettings} />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Platform Ayarları</h1>
          <p className="text-muted-foreground text-sm mt-1">Genel platform yapılandırması</p>
        </div>
        {lastSaved && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Son kayıt</p>
            <p className="text-sm font-medium text-slate-700">
              {new Date(lastSaved).toLocaleString('tr-TR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>

      {/* ═══ GENEL AYARLAR ═══ */}
      <SettingsSection
        title="Genel Ayarlar"
        description="Platform adı ve iletişim bilgileri"
        icon={Settings}
        onSave={handleSaveGeneral}
        saving={saving === 'general'}
        hasChanges={hasGeneralChanges}
      >
        {loading ? <SkeletonFields count={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="Platform Adı">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={general.platformName}
                placeholder="TaşıBurada"
                onChange={(e) => setGeneral((p) => ({ ...p, platformName: e.target.value }))}
              />
            </FieldGroup>

            <FieldGroup label="İletişim E-postası">
              <input
                type="email"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={general.contactEmail}
                placeholder="destek@tasiburada.com"
                onChange={(e) => setGeneral((p) => ({ ...p, contactEmail: e.target.value }))}
              />
            </FieldGroup>

            <FieldGroup
              label="Minimum Teklif Fiyatı (₺)"
              hint="Bu tutarın altında teklif verilemez"
            >
              <Input
                type="number"
                min={0}
                value={general.minOfferPrice}
                onChange={(e) => setGeneral((p) => ({ ...p, minOfferPrice: Number(e.target.value) }))}
              />
            </FieldGroup>

            <FieldGroup
              label="Maksimum İptal Oranı (%)"
              hint="Bu oranı aşan nakliyeciler otomatik askıya alınır"
            >
              <Input
                type="number"
                min={0}
                max={100}
                value={general.maxCancellationRate}
                onChange={(e) => setGeneral((p) => ({ ...p, maxCancellationRate: Number(e.target.value) }))}
              />
            </FieldGroup>
          </div>
        )}
      </SettingsSection>

      {/* ═══ NAKLİYECİ ONAY SİSTEMİ ═══ */}
      <SettingsSection
        title="Nakliyeci Onay Sistemi"
        description="Yeni kayıt olan nakliyecilerin onay süreci"
        icon={UserCheck}
        onSave={handleSaveCarrier}
        saving={saving === 'carrier'}
        hasChanges={hasCarrierChanges}
        variant="warning"
      >
        {loading ? <SkeletonFields count={1} /> : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">Otomatik Nakliyeci Onayı</p>
                {carrier.autoApprove && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    ⚠️ Aktif
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Açıkken yeni kayıt olan nakliyeciler admin onayı beklemeden sisteme girer.
                Sahte nakliyeci riskini artırır.
              </p>
            </div>
            <Switch
              checked={carrier.autoApprove}
              onCheckedChange={(checked) => {
                if (checked) {
                  setConfirmAutoApprove(true);
                } else {
                  setCarrier((p) => ({ ...p, autoApprove: false }));
                }
              }}
            />
          </div>
        )}
      </SettingsSection>

      {/* Auto-approve confirm dialog */}
      <AlertDialog open={confirmAutoApprove} onOpenChange={setConfirmAutoApprove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Otomatik Onayı Aktif Et
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu ayar açıkken nakliyeciler belge doğrulaması olmadan sisteme girebilir ve
              müşterilerle etkileşime geçebilir. Emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                setCarrier((p) => ({ ...p, autoApprove: true }));
                setConfirmAutoApprove(false);
              }}
            >
              Evet, Aktif Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ KOMİSYON AYARLARI ═══ */}
      <SettingsSection
        title="Komisyon Ayarları"
        description="Platform komisyon oranı ve kuralları"
        icon={Percent}
        onSave={handleSaveCommission}
        saving={saving === 'commission'}
        hasChanges={hasCommissionChanges}
      >
        {loading ? <SkeletonFields count={2} /> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Platform Komisyonu (%)">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={commission.platformCommission}
                    onChange={(e) => setCommission((p) => ({ ...p, platformCommission: Number(e.target.value) }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    %
                  </span>
                </div>
                {commission.platformCommission > 30 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Yüksek komisyon nakliyeci kaçmasına yol açabilir
                  </p>
                )}
              </FieldGroup>

              <FieldGroup
                label="Minimum Komisyon Tutarı (₺)"
                hint="Oran düşük çıksa bile minimum bu tutar alınır"
              >
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={commission.minCommissionAmount}
                    onChange={(e) => setCommission((p) => ({ ...p, minCommissionAmount: Number(e.target.value) }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    ₺
                  </span>
                </div>
              </FieldGroup>
            </div>

            {/* Live calculation preview */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">Örnek hesap:</p>
              <p className="font-medium mt-1">
                ₺1.000 işlemde komisyon:{' '}
                <span className="text-primary font-semibold">
                  ₺{Math.max(
                    commission.minCommissionAmount,
                    1000 * commission.platformCommission / 100,
                  ).toFixed(0)}
                </span>
              </p>
            </div>
          </>
        )}
      </SettingsSection>

      {/* ═══ GÜVENLİK ═══ */}
      <SettingsSection
        title="Güvenlik"
        description="Şifre politikası ve oturum ayarları"
        icon={Shield}
        onSave={handleSaveSecurity}
        saving={saving === 'security'}
        hasChanges={hasSecurityChanges}
      >
        {loading ? <SkeletonFields count={2} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup
              label="Minimum Şifre Uzunluğu"
              hint="Şu an sistemde: 8 karakter + büyük harf + rakam"
            >
              <Input
                type="number"
                min={6}
                max={32}
                value={security.minPasswordLength}
                onChange={(e) => setSecurity((p) => ({ ...p, minPasswordLength: Number(e.target.value) }))}
              />
            </FieldGroup>

            <FieldGroup
              label="Oturum Zaman Aşımı (dakika)"
              hint={`${security.sessionTimeout} dk = ${(security.sessionTimeout / 60).toFixed(1)} saat`}
            >
              <Input
                type="number"
                min={5}
                max={1440}
                value={security.sessionTimeout}
                onChange={(e) => setSecurity((p) => ({ ...p, sessionTimeout: Number(e.target.value) }))}
              />
            </FieldGroup>
          </div>
        )}
      </SettingsSection>

      {/* ═══ SON DEĞİŞİKLİKLER ═══ */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            Son Değişiklikler
          </h3>
          <button
            onClick={() => navigate('/admin/audit-log')}
            className="text-xs text-primary hover:underline"
          >
            Tümünü Gör →
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Henüz değişiklik kaydı yok
          </div>
        ) : (
          <div className="divide-y">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-700">{log.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.adminId ? `Admin #${log.adminId.slice(0, 8)}` : 'Admin'}
                    {log.targetType ? ` · ${log.targetType}` : ''}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {new Date(log.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── SettingsSection ────────────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
}

function SettingsSection({
  title, description, icon: Icon,
  onSave, saving, hasChanges,
  children, variant = 'default',
}: SettingsSectionProps) {
  return (
    <div className={cn(
      'border rounded-xl overflow-hidden',
      variant === 'warning' && 'border-orange-200',
      variant === 'danger'  && 'border-red-200',
    )}>
      <div className={cn(
        'px-5 py-4 border-b flex items-center justify-between',
        variant === 'warning' ? 'bg-orange-50/60' : 'bg-muted/20',
        variant === 'danger'  && 'bg-red-50/60',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            variant === 'warning' ? 'bg-orange-100' : 'bg-primary/10',
            variant === 'danger'  && 'bg-red-100',
          )}>
            <Icon className={cn(
              'h-4 w-4',
              variant === 'warning' ? 'text-orange-600' : 'text-primary',
              variant === 'danger'  && 'text-red-600',
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || !hasChanges}
          variant={hasChanges ? 'default' : 'outline'}
          className="min-w-[88px]"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : hasChanges ? (
            <>
              <Save className="h-3 w-3 mr-1.5" />
              Kaydet
            </>
          ) : (
            <>
              <Check className="h-3 w-3 mr-1.5 text-green-600" />
              Kaydedildi
            </>
          )}
        </Button>
      </div>

      <div className="p-5 bg-white">
        {children}
      </div>
    </div>
  );
}

// ─── FieldGroup ─────────────────────────────────────────────────────────────

function FieldGroup({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonFields({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

