import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';
import type { SectionProps, VehicleType } from './types';
import { API_BASE } from './helpers';

interface CompanySectionProps extends SectionProps {
  onCompanyNameChange?: (name: string) => void;
}

export default function CompanySection({ user, refreshProfileStatus, onCompanyNameChange }: CompanySectionProps) {
  const [company, setCompany] = useState({
    email: user.email || '', name: '', type: '', taxNumber: '', year: '',
    services: [] as string[], scopes: [] as string[],
    vehicleType: '', vehicleTypes: [] as string[],
    vehicleCapacities: {} as Record<string, string>,
    vehicleBrand: '', vehicleModel: '', vehicleYear: '' as number | '',
    vehicleCapacityM3: '' as number | '',
  });
  const [vehicleTypesList, setVehicleTypesList] = useState<VehicleType[]>([]);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [scopeOptions, setScopeOptions] = useState<{ id: string; name: string }[]>([]);
  const nameToId = useMemo(() => Object.fromEntries(vehicleTypesList.map(v => [v.name, v.id])), [vehicleTypesList]);

  // Load master data + drafts + backend prefill
  useEffect(() => {
    apiClient(`${API_BASE}/service-types`).then(r => r.json()).then(d => { if (d.success) setServiceTypeOptions(d.data); }).catch(() => {});
    apiClient(`${API_BASE}/scope-of-works`).then(r => r.json()).then(d => { if (d.success) setScopeOptions(d.data); }).catch(() => {});
    apiClient(`${API_BASE}/vehicle-types`).then(r => r.json()).then(d => { if (d.success && Array.isArray(d.data)) setVehicleTypesList(d.data); }).catch(() => {});

    // Restore localStorage draft
    try {
      const c = localStorage.getItem(`carrier_company_${user.id}`);
      if (c) {
        const parsed = JSON.parse(c);
        if (parsed && !parsed.vehicleTypes) parsed.vehicleTypes = parsed.vehicleType ? [parsed.vehicleType] : [];
        if (parsed && parsed.vehicleCapacity && (!parsed.vehicleCapacities || Object.keys(parsed.vehicleCapacities || {}).length === 0)) {
          const first = (parsed.vehicleTypes && parsed.vehicleTypes[0]) || parsed.vehicleType;
          if (first) parsed.vehicleCapacities = { [first]: String(parsed.vehicleCapacity) };
        }
        setCompany(parsed);
        onCompanyNameChange?.(parsed.name || '');
      }
    } catch {}

    // Prefill from backend
    (async () => {
      try {
        const res = await apiClient(`${API_BASE}/carriers/${user.id}`);
        const json = await res.json();
        if (!res.ok || !json?.success || !json?.data) return;
        const carrierData = json.data?.carrier;
        if (!carrierData) return;
        const activity = json.data?.activity;

        const resolveServiceNames = (): string[] => {
          const fromTopLevel = Array.isArray(json.data?.serviceTypes) ? json.data.serviceTypes.map((item: any) => item?.serviceType?.name || item?.name).filter(Boolean) : null;
          if (fromTopLevel?.length) return fromTopLevel;
          const fromCarrier = Array.isArray(carrierData?.serviceTypeLinks) ? carrierData.serviceTypeLinks.map((link: any) => link?.serviceType?.name || link?.name).filter(Boolean) : null;
          if (fromCarrier?.length) return fromCarrier;
          return [];
        };

        const resolveScopeNames = (): string[] => {
          const fromTopLevel = Array.isArray(json.data?.scopeOfWorks) ? json.data.scopeOfWorks.map((item: any) => item?.scope?.name || item?.name).filter(Boolean) : null;
          if (fromTopLevel?.length) return fromTopLevel;
          const fromCarrier = Array.isArray(carrierData?.scopeLinks) ? carrierData.scopeLinks.map((link: any) => link?.scope?.name || link?.name).filter(Boolean) : null;
          if (fromCarrier?.length) return fromCarrier;
          return [];
        };

        const vehicleSource = (() => {
          if (Array.isArray(json.data?.vehicleTypes) && json.data.vehicleTypes.length) return json.data.vehicleTypes;
          if (Array.isArray(carrierData?.vehicleTypeLinks) && carrierData.vehicleTypeLinks.length) return carrierData.vehicleTypeLinks;
          return null;
        })();

        const vehicleEntries = (vehicleSource || []).map((entry: any) => {
          const name = entry?.vehicleType?.name || entry?.name || entry?.vehicleTypeName;
          if (!name) return null;
          return { name, capacityValue: entry?.capacityKg ?? entry?.capacity ?? null };
        }).filter(Boolean) as Array<{ name: string; capacityValue: number | string | null }>;

        const vehicleNames = vehicleEntries.map(i => i.name);
        const backendCaps = vehicleEntries.reduce((acc, item) => {
          const num = item.capacityValue == null ? undefined : Number(item.capacityValue);
          if (num !== undefined && Number.isFinite(num)) acc[item.name] = String(num);
          return acc;
        }, {} as Record<string, string>);

        setCompany(prev => {
          const next = {
            ...prev,
            email: carrierData.email || prev.email,
            name: carrierData.companyName || prev.name,
            taxNumber: carrierData.taxNumber || prev.taxNumber,
            year: carrierData.foundedYear ? String(carrierData.foundedYear) : prev.year,
            services: resolveServiceNames().length ? resolveServiceNames() : prev.services,
            scopes: resolveScopeNames().length ? resolveScopeNames() : prev.scopes,
            vehicleType: vehicleNames.length ? vehicleNames[0] : prev.vehicleType,
            vehicleTypes: vehicleNames.length ? vehicleNames : prev.vehicleTypes,
            vehicleCapacities: vehicleNames.length ? { ...(prev.vehicleCapacities || {}), ...backendCaps } : prev.vehicleCapacities,
            vehicleBrand: carrierData.vehicleBrand || prev.vehicleBrand,
            vehicleModel: carrierData.vehicleModel || prev.vehicleModel,
            vehicleYear: carrierData.vehicleYear || prev.vehicleYear,
            vehicleCapacityM3: carrierData.vehicleCapacityM3 || prev.vehicleCapacityM3,
          };
          onCompanyNameChange?.(next.name);
          try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(next)); } catch {}
          return next;
        });
      } catch {}
    })();

    // Prefill vehicle capacities from dedicated endpoint
    (async () => {
      try {
        const res = await apiClient(`${API_BASE}/carriers/${user.id}/vehicles`);
        const json = await res.json();
        if (!res.ok || !json?.success || !Array.isArray(json.data)) return;
        const caps: Record<string, string> = {};
        for (const v of json.data) { if (v.vehicleTypeName) caps[v.vehicleTypeName] = String(v.capacityKg ?? ''); }
        if (Object.keys(caps).length > 0) {
          setCompany(prev => {
            const next = { ...prev, vehicleCapacities: { ...(prev.vehicleCapacities || {}), ...caps } };
            try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(next)); } catch {}
            return next;
          });
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const parseCapacity = (v: string | number | undefined) => {
    if (v == null || v === '') return undefined;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const persistDrafts = () => {
    try { localStorage.setItem(`carrier_company_${user.id}`, JSON.stringify(company)); } catch {}
    try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
  };

  const save = async () => {
    const capacityOverrides = (company.vehicleTypes || []).reduce((acc, name) => {
      const parsed = parseCapacity((company.vehicleCapacities || {})[name]);
      if (parsed !== undefined) acc[name] = parsed;
      return acc;
    }, {} as Record<string, number>);

    const selectedVehicles = (company.vehicleTypes || []).map(name => ({
      vehicleTypeId: nameToId[name], customCapacity: parseCapacity((company.vehicleCapacities || {})[name]),
    })).filter(v => !!v.vehicleTypeId);

    try {
      await apiClient(`${API_BASE}/carriers/profile/${user.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name || undefined, taxNumber: company.taxNumber || undefined,
          email: company.email || undefined, foundedYear: company.year ? Number(company.year) : undefined,
          vehicleTypeNames: company.vehicleTypes || [], vehicleTypeCapacities: Object.keys(capacityOverrides).length ? capacityOverrides : undefined,
          serviceTypeNames: company.services || [], scopeOfWorkNames: company.scopes || [],
          vehicleBrand: company.vehicleBrand || undefined,
          vehicleModel: company.vehicleModel || undefined,
          vehicleYear: company.vehicleYear || undefined,
          vehicleCapacityM3: company.vehicleCapacityM3 || undefined,
        }),
      });
      if (selectedVehicles.length > 0) {
        await apiClient(`${API_BASE}/carriers/${user.id}/vehicles`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedVehicles }),
        });
      }
    } catch {}

    persistDrafts();
    onCompanyNameChange?.(company.name);
    toast.success('Firma bilgileri ve araç kapasiteleri kaydedildi.');
    await refreshProfileStatus?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Firma Bilgileri</h2>
      <p className="text-sm text-slate-500 mt-1">Firma kartınızda gösterilecek temel bilgiler.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><Label>E-posta (kayıtlı)</Label><Input className="mt-1" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} placeholder="ornek@firma.com" /></div>
        <div><Label>Firma Adı / Ünvanı</Label><Input className="mt-1" value={company.name} onChange={(e) => { setCompany({ ...company, name: e.target.value }); onCompanyNameChange?.(e.target.value); }} placeholder="Örn. ABC Lojistik A.Ş." /></div>
        <div>
          <Label>Şirket Türü</Label>
          <Select value={company.type} onValueChange={(v) => setCompany({ ...company, type: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
            <SelectContent>{['Şahıs', 'Limited', 'A.Ş.', 'Kooperatif'].map(x => (<SelectItem key={x} value={x}>{x}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div><Label>Vergi Numarası</Label><Input className="mt-1" inputMode="numeric" maxLength={10} value={company.taxNumber} onChange={(e) => setCompany({ ...company, taxNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 haneli" /></div>
        <div>
          <Label>Kuruluş Yılı</Label>
          <Select value={company.year} onValueChange={(v) => setCompany({ ...company, year: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Yıl seçiniz" /></SelectTrigger>
            <SelectContent>{Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => 1990 + i).reverse().map(y => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Hizmet Türü</Label>
          <MultiSelect label=" " placeholder="Seçiniz" options={serviceTypeOptions.length ? serviceTypeOptions.map(x => x.name) : ['Şehir içi', 'Şehirler arası', 'Parsiyel', 'Ofis taşıma', 'Ev taşıma', 'Eşya depolama']} selectedValues={company.services} onSelectionChange={(vals) => setCompany({ ...company, services: vals })} />
        </div>
        <div className="md:col-span-2">
          <Label>Çalışma Kapsamı</Label>
          <MultiSelect label=" " placeholder="Seçiniz" options={scopeOptions.length ? scopeOptions.map(x => x.name) : ['Şehir İçi', 'Şehirler Arası']} selectedValues={company.scopes || []} onSelectionChange={(vals) => setCompany({ ...company, scopes: vals })} />
        </div>
        <div className="md:col-span-2">
          <Label>Araç Türü</Label>
          <MultiSelect label=" " placeholder="Seçiniz" options={vehicleTypesList.map(v => v.name)} selectedValues={company.vehicleTypes?.length ? company.vehicleTypes : (company.vehicleType ? [company.vehicleType] : [])} onSelectionChange={(vals) => {
            const keep = new Set(vals);
            const nextCaps: Record<string, string> = {};
            Object.entries(company.vehicleCapacities || {}).forEach(([k, v]) => { if (keep.has(k)) nextCaps[k] = v; });
            setCompany({ ...company, vehicleTypes: vals, vehicleType: vals[0] || '', vehicleCapacities: nextCaps });
          }} />
          {company.vehicleTypes?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {company.vehicleTypes.map(t => (
                <div key={t}>
                  <Label>{t} Kapasite (kg)</Label>
                  <Input className="mt-1" inputMode="numeric" value={(company.vehicleCapacities || {})[t] || ''} onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setCompany(prev => ({ ...prev, vehicleCapacities: { ...(prev.vehicleCapacities || {}), [t]: v } }));
                  }} placeholder="Örn. 3500" />
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Araç detay alanları */}
        <div>
          <Label>Araç Markası</Label>
          <Input
            className="mt-1"
            placeholder="Mercedes, Ford, MAN..."
            value={company.vehicleBrand}
            onChange={(e) => setCompany({ ...company, vehicleBrand: e.target.value })}
          />
        </div>
        <div>
          <Label>Model</Label>
          <Input
            className="mt-1"
            placeholder="Sprinter, Transit, TGX..."
            value={company.vehicleModel}
            onChange={(e) => setCompany({ ...company, vehicleModel: e.target.value })}
          />
        </div>
        <div>
          <Label>Model Yılı</Label>
          <Input
            type="number"
            className="mt-1"
            placeholder="2020"
            min={1990}
            max={new Date().getFullYear()}
            value={company.vehicleYear}
            onChange={(e) => setCompany({ ...company, vehicleYear: e.target.value ? parseInt(e.target.value) : '' })}
          />
        </div>
        <div>
          <Label>Kapasite (m³)</Label>
          <Input
            type="number"
            className="mt-1"
            placeholder="20"
            min={1}
            max={200}
            value={company.vehicleCapacityM3}
            onChange={(e) => setCompany({ ...company, vehicleCapacityM3: e.target.value ? parseFloat(e.target.value) : '' })}
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
