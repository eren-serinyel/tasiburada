import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { CITIES_TR } from '@/lib/locations';
import { resolveSuggestedServiceAreas } from '@/lib/serviceAreaSuggestions';
import { Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MultiSelect from '@/components/ui/multi-select';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(item => String(item).trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

const WORK_SCOPE_OPTIONS = ['Şehir İçi', 'Şehirler Arası'];
const SCOPE_LABEL_BY_VALUE: Record<string, string> = {
  sehirici: 'Şehir İçi',
  'şehir içi': 'Şehir İçi',
  'şehiriçi': 'Şehir İçi',
  sehirlerarasi: 'Şehirler Arası',
  'şehirler arası': 'Şehirler Arası',
  'şehirlerarası': 'Şehirler Arası',
};

const normalizeScopeNames = (values: string[]): string[] => Array.from(new Set(
  values
    .map(value => SCOPE_LABEL_BY_VALUE[value.trim().toLocaleLowerCase('tr-TR')] || value.trim())
    .filter(value => WORK_SCOPE_OPTIONS.includes(value)),
));

const sanitizeServiceAreas = (values: string[]): string[] => Array.from(new Set(
  values.map(value => value.trim()).filter(value => CITIES_TR.includes(value)),
));

const resolveActivityServiceAreas = (activity: any): string[] => {
  const explicit = parseStringArray(activity?.serviceAreas);
  if (explicit.length) return sanitizeServiceAreas(explicit);

  const fromJson = parseStringArray(activity?.serviceAreasJson);
  if (fromJson.length) return sanitizeServiceAreas(fromJson);

  return activity ? [] : resolveSuggestedServiceAreas(activity?.city);
};

const resolveScopeNames = (data: any): string[] => {
  const topLevel = Array.isArray(data?.scopeOfWorks)
    ? data.scopeOfWorks.map((item: any) => item?.scope?.name || item?.name).filter(Boolean)
    : [];
  const carrierLinks = Array.isArray(data?.carrier?.scopeLinks)
    ? data.carrier.scopeLinks.map((item: any) => item?.scope?.name || item?.name).filter(Boolean)
    : [];
  return normalizeScopeNames(topLevel.length ? topLevel : carrierLinks);
};

export default function OperationsSection({ user, refreshProfileStatus }: SectionProps) {
  const [ops, setOps] = useState({ address1: '', address2: '', district: '', city: '', scopes: [] as string[], serviceAreas: [] as string[], mapLat: '', mapLng: '' });

  useEffect(() => {
    // Restore from localStorage
    try {
      const o = localStorage.getItem(`carrier_ops_${user.id}`);
      if (o) {
        const parsed = JSON.parse(o);
        const rawServiceAreas = parseStringArray(parsed?.serviceAreas);
        setOps(prev => ({
          ...prev,
          ...parsed,
          scopes: normalizeScopeNames([
            ...parseStringArray(parsed?.scopes),
            ...rawServiceAreas,
          ]),
          serviceAreas: sanitizeServiceAreas(rawServiceAreas),
        }));
      }
    } catch {}

    // Prefill from backend
    (async () => {
      try {
        const res = await apiClient(`${API_BASE}/carriers/me`);
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        const activity = json.data?.activity;
        setOps(prev => {
          const serviceAreas = resolveActivityServiceAreas(activity);
          const next = {
            ...prev,
            address1: activity?.address || prev.address1,
            district: activity?.district || prev.district,
            city: activity?.city || prev.city,
            scopes: resolveScopeNames(json.data),
            serviceAreas,
          };
          try { localStorage.setItem(`carrier_ops_${user.id}`, JSON.stringify(next)); } catch {}
          return next;
        });
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const save = async () => {
    if (!ops.city) {
      toast.error('Şehir seçmelisiniz.');
      return;
    }
    if (ops.serviceAreas.length === 0) {
      toast.error('Hizmet verdiğiniz bölgelerden en az bir şehir seçmelisiniz.');
      return;
    }
    if (ops.scopes.length === 0) {
      toast.error('En az bir iş kapsamı seçmelisiniz.');
      return;
    }

    try {
      const scopeResponse = await apiClient(`${API_BASE}/carriers/me/company-info`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeOfWorkNames: ops.scopes }),
      });
      const scopeJson = await scopeResponse.json().catch(() => null);
      if (!scopeResponse.ok || !scopeJson?.success) {
        throw new Error(scopeJson?.message || 'İş kapsamı kaydedilemedi.');
      }

      const res = await apiClient(`${API_BASE}/carriers/me/activity`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: ops.city || undefined, district: ops.district || undefined, address: ops.address1 || undefined, serviceAreas: ops.serviceAreas || undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Faaliyet bilgileri kaydedilemedi.');
      }
      const savedServiceAreas = resolveActivityServiceAreas(json.data);
      const nextOps = savedServiceAreas.length ? { ...ops, serviceAreas: savedServiceAreas } : ops;
      setOps(nextOps);
      try { localStorage.setItem(`carrier_ops_${user.id}`, JSON.stringify(nextOps)); } catch {}
      try { localStorage.removeItem(`fastRegPending_${user.id}`); localStorage.removeItem('profileCompletion'); } catch {}
      toast.success('Faaliyet bilgileri kaydedildi.');
      await refreshProfileStatus?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Faaliyet bilgileri kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Faaliyet Bilgileri</h2>
      <p className="text-sm text-slate-500 mt-1">Yakın konumdaki müşterilerle eşleşmenizi sağlar.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label>Şehir</Label>
          <Select
            value={ops.city}
            onValueChange={(v) => setOps(prev => ({
              ...prev,
              city: v,
              serviceAreas: prev.serviceAreas.length ? prev.serviceAreas : resolveSuggestedServiceAreas(v),
            }))}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
            <SelectContent>{CITIES_TR.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div><Label>İlçe</Label><Input className="mt-1" value={ops.district} onChange={(e) => setOps({ ...ops, district: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Adres</Label><Input className="mt-1" value={ops.address1} onChange={(e) => setOps({ ...ops, address1: e.target.value })} placeholder="Mahalle, Cadde/Sokak No" /></div>
        <div className="md:col-span-2">
          <Label>İş Kapsamı <span className="text-red-500">*</span></Label>
          <MultiSelect label=" " placeholder="İş kapsamı seçin" options={WORK_SCOPE_OPTIONS} selectedValues={ops.scopes} onSelectionChange={(values) => setOps({ ...ops, scopes: normalizeScopeNames(values) })} />
          {ops.scopes.length === 0 && (
            <p className="mt-1 text-xs text-red-500">En az bir iş kapsamı seçmelisiniz.</p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label>Hizmet Verdiğiniz Bölgeler <span className="text-red-500">*</span></Label>
          <MultiSelect label=" " placeholder="İl/ilçe seçin" options={CITIES_TR} selectedValues={ops.serviceAreas} onSelectionChange={(vals) => setOps({ ...ops, serviceAreas: vals })} />
          {ops.serviceAreas.length === 0 && (
            <p className="mt-1 text-xs text-red-500">En az bir hizmet bölgesi seçmelisiniz.</p>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" onClick={save}><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
