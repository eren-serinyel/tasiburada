import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, PackagePlus, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultiSelect from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

type LoadType = 'HOME' | 'OFFICE' | 'PARTIAL' | 'STORAGE';
type PriceMode = 'NONE' | 'FIXED' | 'QUOTE';

interface CatalogService {
  id: string;
  name: string;
  description?: string | null;
}

interface Capability {
  extraServiceId: string;
  extraServiceName: string;
  loadType: LoadType;
  isActive: boolean;
  priceMode?: PriceMode | null;
  basePrice?: number | null;
  quoteMinPrice?: number | null;
  quoteMaxPrice?: number | null;
  notes?: string | null;
}

interface CapabilityProfile {
  loadTypes?: Array<{ loadType: LoadType; isActive: boolean }>;
  extraServices?: Capability[];
}

interface CustomExtraService {
  id: string;
  loadType: LoadType;
  title: string;
  description?: string | null;
  isActive: boolean;
  priceMode: PriceMode;
  basePrice?: number | null;
  quoteMinPrice?: number | null;
  quoteMaxPrice?: number | null;
}

interface ServiceDraft {
  active: boolean;
  priceMode: PriceMode;
  basePrice: string;
  quoteMinPrice: string;
  quoteMaxPrice: string;
  notes: string;
}

const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  HOME: 'Evden Eve Nakliyat',
  OFFICE: 'Ofis Taşıma',
  PARTIAL: 'Parça Eşya Taşıma',
  STORAGE: 'Eşya Depolama',
};

const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  NONE: 'Ücretsiz',
  FIXED: 'Sabit Fiyat',
  QUOTE: 'Görüşülür',
};

const FALLBACK_SERVICE_TYPES = [
  'Evden Eve Nakliyat',
  'Parça Eşya Taşıma',
  'Şehirlerarası Taşıma',
  'Şehir İçi Taşıma',
  'Ofis Taşıma',
  'Eşya Depolama',
];

const SERVICE_TYPE_TO_LOAD_TYPES: Record<string, LoadType[]> = {
  'evden eve nakliyat': ['HOME'],
  'ev tasima': ['HOME'],
  'ofis tasima': ['OFFICE'],
  'parca esya tasima': ['PARTIAL'],
  'parsiyel': ['PARTIAL'],
  'sehir ici tasima': ['PARTIAL'],
  'sehirlerarasi tasima': ['PARTIAL'],
  'esya depolama': ['STORAGE'],
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

const serviceNamesToLoadTypes = (serviceNames: string[]): LoadType[] => {
  const set = new Set<LoadType>();
  for (const name of serviceNames) {
    for (const loadType of SERVICE_TYPE_TO_LOAD_TYPES[normalizeText(name)] ?? []) {
      set.add(loadType);
    }
  }
  return Array.from(set);
};

const loadTypeFallbackServiceName = (loadType: LoadType): string => {
  const map: Record<LoadType, string> = {
    HOME: 'Evden Eve Nakliyat',
    OFFICE: 'Ofis Taşıma',
    PARTIAL: 'Parça Eşya Taşıma',
    STORAGE: 'Eşya Depolama',
  };
  return map[loadType];
};

const draftKey = (loadType: LoadType, serviceId: string) => `${loadType}:${serviceId}`;

const parseMoney = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function ServicesSection({ user, refreshProfileStatus }: SectionProps) {
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);
  const [serviceTypeOptions, setServiceTypeOptions] = useState<string[]>([]);
  const [loadTypes, setLoadTypes] = useState<LoadType[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [catalogByLoadType, setCatalogByLoadType] = useState<Record<string, CatalogService[]>>({});
  const [customServices, setCustomServices] = useState<CustomExtraService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, ServiceDraft & { title: string }>>({});
  const [newCustomDrafts, setNewCustomDrafts] = useState<Record<string, ServiceDraft & { title: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingServiceTypes, setSavingServiceTypes] = useState(false);

  const capabilityMap = useMemo(() => {
    const map = new Map<string, Capability>();
    for (const capability of capabilities) {
      map.set(draftKey(capability.loadType, capability.extraServiceId), capability);
    }
    return map;
  }, [capabilities]);

  const hydrateDrafts = (
    nextLoadTypes: LoadType[],
    nextCatalogByLoadType: Record<string, CatalogService[]>,
    nextCapabilities: Capability[],
  ) => {
    const capMap = new Map(nextCapabilities.map(cap => [draftKey(cap.loadType, cap.extraServiceId), cap]));
    const nextDrafts: Record<string, ServiceDraft> = {};

    for (const loadType of nextLoadTypes) {
      for (const service of nextCatalogByLoadType[loadType] ?? []) {
        const key = draftKey(loadType, service.id);
        const cap = capMap.get(key);
        nextDrafts[key] = {
          active: Boolean(cap?.isActive),
          priceMode: (cap?.priceMode || 'NONE') as PriceMode,
          basePrice: cap?.basePrice == null ? '' : String(Number(cap.basePrice)),
          quoteMinPrice: cap?.quoteMinPrice == null ? '' : String(Number(cap.quoteMinPrice)),
          quoteMaxPrice: cap?.quoteMaxPrice == null ? '' : String(Number(cap.quoteMaxPrice)),
          notes: cap?.notes || '',
        };
      }
    }

    setDrafts(nextDrafts);
  };

  const fetchCatalogForLoadTypes = async (nextLoadTypes: LoadType[]) => {
    const catalogEntries = await Promise.all(
      nextLoadTypes.map(async (loadType) => {
        const catalogRes = await apiClient(`${API_BASE}/extra-services?loadType=${loadType}`);
        const catalogJson = await catalogRes.json();
        return [loadType, catalogRes.ok && catalogJson?.success ? catalogJson.data ?? [] : []] as const;
      }),
    );
    return Object.fromEntries(catalogEntries) as Record<string, CatalogService[]>;
  };

  const fetchCustomServices = async () => {
    const res = await apiClient(`${API_BASE}/carriers/me/custom-extra-services`);
    const json = await res.json();
    if (!res.ok || !json?.success) return [];
    return Array.isArray(json.data) ? json.data as CustomExtraService[] : [];
  };

  const hydrateCustomDrafts = (services: CustomExtraService[]) => {
    const next: Record<string, ServiceDraft & { title: string }> = {};
    for (const service of services) {
      next[service.id] = {
        title: service.title || '',
        active: Boolean(service.isActive),
        priceMode: service.priceMode || 'QUOTE',
        basePrice: service.basePrice == null ? '' : String(Number(service.basePrice)),
        quoteMinPrice: service.quoteMinPrice == null ? '' : String(Number(service.quoteMinPrice)),
        quoteMaxPrice: service.quoteMaxPrice == null ? '' : String(Number(service.quoteMaxPrice)),
        notes: service.description || '',
      };
    }
    setCustomDrafts(next);
  };

  const fetchCapabilities = async () => {
    const [serviceTypeRes, profileRes, capabilityRes] = await Promise.all([
      apiClient(`${API_BASE}/service-types`),
      apiClient(`${API_BASE}/carriers/me`),
      apiClient(`${API_BASE}/carriers/me/capabilities`),
    ]);

    const serviceTypeJson = await serviceTypeRes.json();
    const profileJson = await profileRes.json();
    const capabilityJson = await capabilityRes.json();

    if (!capabilityRes.ok || !capabilityJson?.success) {
      throw new Error(capabilityJson?.message || 'Hizmetler alınamadı.');
    }

    const options = serviceTypeJson?.success && Array.isArray(serviceTypeJson.data)
      ? serviceTypeJson.data.map((item: any) => item.name).filter(Boolean)
      : FALLBACK_SERVICE_TYPES;
    setServiceTypeOptions(options);

    const profileServiceNames = Array.isArray(profileJson?.data?.serviceTypes)
      ? profileJson.data.serviceTypes.map((item: any) => item?.serviceType?.name || item?.name).filter(Boolean)
      : [];

    const data = capabilityJson.data as CapabilityProfile;
    const activeCapabilityLoadTypes = (data.loadTypes ?? []).filter(item => item.isActive).map(item => item.loadType);
    const names = profileServiceNames.length
      ? profileServiceNames
      : activeCapabilityLoadTypes.map(loadTypeFallbackServiceName);
    const nextLoadTypes = serviceNamesToLoadTypes(names);
    const [catalog, custom] = await Promise.all([
      fetchCatalogForLoadTypes(nextLoadTypes),
      fetchCustomServices(),
    ]);

    setSelectedServiceNames(names);
    setLoadTypes(nextLoadTypes);
    setCapabilities(data.extraServices ?? []);
    setCustomServices(custom);
    setCatalogByLoadType(catalog);
    hydrateDrafts(nextLoadTypes, catalog, data.extraServices ?? []);
    hydrateCustomDrafts(custom);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchCapabilities();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Hizmetler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = (key: string, patch: Partial<ServiceDraft>) => {
    setDrafts(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const syncLoadTypes = async (previousLoadTypes: LoadType[], nextLoadTypes: LoadType[]) => {
    const previous = new Set(previousLoadTypes);
    const next = new Set(nextLoadTypes);
    const toAdd = nextLoadTypes.filter(loadType => !previous.has(loadType));
    const toRemove = previousLoadTypes.filter(loadType => !next.has(loadType));

    for (const loadType of toAdd) {
      const res = await apiClient(`${API_BASE}/carriers/me/capabilities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_load_type', loadType }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || json?.error?.details || 'Taşıma türü eklenemedi.');
    }

    for (const loadType of toRemove) {
      const existingForLoadType = capabilities.filter(cap => cap.loadType === loadType);
      for (const cap of existingForLoadType) {
        await apiClient(`${API_BASE}/carriers/me/capabilities`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'remove_extra_service', extraServiceId: cap.extraServiceId, loadType }),
        });
      }

      const res = await apiClient(`${API_BASE}/carriers/me/capabilities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_load_type', loadType }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || json?.error?.details || 'Taşıma türü kaldırılamadı.');
    }
  };

  const persistServiceTypes = async (names: string[]) => {
    const previousLoadTypes = loadTypes;
    const nextLoadTypes = serviceNamesToLoadTypes(names);
    setSavingServiceTypes(true);
    try {
      await apiClient(`${API_BASE}/carriers/me/company-info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceTypeNames: names }),
      });

      await syncLoadTypes(previousLoadTypes, nextLoadTypes);
      const catalog = await fetchCatalogForLoadTypes(nextLoadTypes);
      const capabilityRes = await apiClient(`${API_BASE}/carriers/me/capabilities`);
      const capabilityJson = await capabilityRes.json();
      const nextCapabilities = capabilityJson?.success ? capabilityJson.data.extraServices ?? [] : [];
      const nextCustom = await fetchCustomServices();

      setSelectedServiceNames(names);
      setLoadTypes(nextLoadTypes);
      setCapabilities(nextCapabilities);
      setCustomServices(nextCustom);
      setCatalogByLoadType(catalog);
      hydrateDrafts(nextLoadTypes, catalog, nextCapabilities);
      hydrateCustomDrafts(nextCustom);
      await refreshProfileStatus?.();
      toast.success('Hizmet türleri kaydedildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hizmet türleri kaydedilemedi.');
    } finally {
      setSavingServiceTypes(false);
    }
  };

  const persistExtraService = async (loadType: LoadType, service: CatalogService) => {
    const key = draftKey(loadType, service.id);
    const draft = drafts[key] ?? {
      active: false,
      priceMode: 'NONE',
      basePrice: '',
      quoteMinPrice: '',
      quoteMaxPrice: '',
      notes: '',
    };

    setSavingKey(key);
    try {
      if (!draft.active) {
        const existing = capabilityMap.get(key);
        if (existing) {
          const res = await apiClient(`${API_BASE}/carriers/me/capabilities`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove_extra_service', extraServiceId: service.id, loadType }),
          });
          const json = await res.json();
          if (!res.ok || !json?.success) throw new Error(json?.message || json?.error?.details || 'Kaydedilemedi.');
          setCapabilities(json.data?.extraServices ?? []);
        }
        return;
      }

      const basePrice = parseMoney(draft.basePrice);
      const quoteMinPrice = parseMoney(draft.quoteMinPrice);
      const quoteMaxPrice = parseMoney(draft.quoteMaxPrice);

      if (draft.priceMode === 'FIXED' && (basePrice == null || Number.isNaN(basePrice) || basePrice < 0)) {
        toast.error('Sabit fiyat için geçerli bir tutar girin.');
        return;
      }

      if (
        draft.priceMode === 'QUOTE' &&
        (quoteMinPrice == null || quoteMaxPrice == null || Number.isNaN(quoteMinPrice) || Number.isNaN(quoteMaxPrice) || quoteMinPrice < 0 || quoteMaxPrice < quoteMinPrice)
      ) {
        toast.error('Görüşülür için geçerli min-max fiyat aralığı girin.');
        return;
      }

      const res = await apiClient(`${API_BASE}/carriers/me/capabilities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_extra_service',
          extraServiceId: service.id,
          loadType,
          priceMode: draft.priceMode,
          basePrice: draft.priceMode === 'FIXED' ? basePrice : undefined,
          quoteMinPrice: draft.priceMode === 'QUOTE' ? quoteMinPrice : undefined,
          quoteMaxPrice: draft.priceMode === 'QUOTE' ? quoteMaxPrice : undefined,
          notes: draft.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || json?.error?.details || 'Kaydedilemedi.');

      setCapabilities(json.data?.extraServices ?? []);
      await refreshProfileStatus?.();
      toast.success('Ek hizmet kaydedildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kaydedilemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const updateCustomDraft = (key: string, patch: Partial<ServiceDraft & { title: string }>) => {
    setCustomDrafts(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const updateNewCustomDraft = (loadType: LoadType, patch: Partial<ServiceDraft & { title: string }>) => {
    setNewCustomDrafts(prev => ({
      ...prev,
      [loadType]: {
        title: '',
        active: true,
        priceMode: 'QUOTE',
        basePrice: '',
        quoteMinPrice: '',
        quoteMaxPrice: '',
        notes: '',
        ...prev[loadType],
        ...patch,
      },
    }));
  };

  const buildCustomPayload = (loadType: LoadType, draft: ServiceDraft & { title: string }) => {
    const basePrice = parseMoney(draft.basePrice);
    const quoteMinPrice = parseMoney(draft.quoteMinPrice);
    const quoteMaxPrice = parseMoney(draft.quoteMaxPrice);

    if (!draft.title.trim()) {
      throw new Error('Özel hizmet başlığı zorunludur.');
    }
    if (draft.priceMode === 'FIXED' && (basePrice == null || Number.isNaN(basePrice) || basePrice < 0)) {
      throw new Error('Sabit fiyat için geçerli bir tutar girin.');
    }
    if (
      draft.priceMode === 'QUOTE' &&
      (quoteMinPrice == null || quoteMaxPrice == null || Number.isNaN(quoteMinPrice) || Number.isNaN(quoteMaxPrice) || quoteMinPrice < 0 || quoteMaxPrice < quoteMinPrice)
    ) {
      throw new Error('Görüşülür için geçerli min-max fiyat aralığı girin.');
    }

    return {
      loadType,
      title: draft.title.trim(),
      description: draft.notes.trim() || undefined,
      isActive: draft.active,
      priceMode: draft.priceMode,
      basePrice: draft.priceMode === 'FIXED' ? basePrice : undefined,
      quoteMinPrice: draft.priceMode === 'QUOTE' ? quoteMinPrice : undefined,
      quoteMaxPrice: draft.priceMode === 'QUOTE' ? quoteMaxPrice : undefined,
    };
  };

  const createCustomService = async (loadType: LoadType) => {
    const draft = newCustomDrafts[loadType] ?? {
      title: '',
      active: true,
      priceMode: 'QUOTE',
      basePrice: '',
      quoteMinPrice: '',
      quoteMaxPrice: '',
      notes: '',
    };

    setSavingKey(`custom-new:${loadType}`);
    try {
      const payload = buildCustomPayload(loadType, draft);
      const res = await apiClient(`${API_BASE}/carriers/me/custom-extra-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Özel hizmet eklenemedi.');

      const nextCustom = await fetchCustomServices();
      setCustomServices(nextCustom);
      hydrateCustomDrafts(nextCustom);
      setNewCustomDrafts(prev => ({
        ...prev,
        [loadType]: { title: '', active: true, priceMode: 'QUOTE', basePrice: '', quoteMinPrice: '', quoteMaxPrice: '', notes: '' },
      }));
      toast.success('Özel ek hizmet eklendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Özel hizmet eklenemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveCustomService = async (service: CustomExtraService) => {
    const draft = customDrafts[service.id];
    if (!draft) return;

    setSavingKey(`custom:${service.id}`);
    try {
      const payload = buildCustomPayload(service.loadType, draft);
      const res = await apiClient(`${API_BASE}/carriers/me/custom-extra-services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Özel hizmet kaydedilemedi.');

      const nextCustom = await fetchCustomServices();
      setCustomServices(nextCustom);
      hydrateCustomDrafts(nextCustom);
      toast.success('Özel ek hizmet kaydedildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Özel hizmet kaydedilemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  const deleteCustomService = async (service: CustomExtraService) => {
    setSavingKey(`custom:${service.id}`);
    try {
      const res = await apiClient(`${API_BASE}/carriers/me/custom-extra-services/${service.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Özel hizmet silinemedi.');

      const nextCustom = customServices.filter(item => item.id !== service.id);
      setCustomServices(nextCustom);
      hydrateCustomDrafts(nextCustom);
      toast.success('Özel ek hizmet silindi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Özel hizmet silinemedi.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Hizmetler yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Hizmetlerim
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Taşıma türlerinizi burada seçin; her tür için ek hizmet başlığı, açıklaması ve fiyat bilgisini tanımlayın.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          {loadTypes.length} taşıma türü aktif
        </div>
      </div>

      <div className="h-px bg-slate-100 mt-4 mb-6" />

      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <Label>Hizmet Türü</Label>
        <p className="mb-3 mt-1 text-xs text-slate-500">Firma Bilgileri yerine hizmet türü seçimini buradan yönetin.</p>
        <MultiSelect
          label=" "
          placeholder="Hizmet türü seçin"
          options={serviceTypeOptions.length ? serviceTypeOptions : FALLBACK_SERVICE_TYPES}
          selectedValues={selectedServiceNames}
          onSelectionChange={(names) => persistServiceTypes(names)}
        />
        {savingServiceTypes && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Hizmet türleri kaydediliyor...
          </div>
        )}
      </div>

      {loadTypes.length === 0 ? (
        <div className="py-10 text-center">
          <PackagePlus className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Henüz taşıma türü seçmediniz</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            Üstteki Hizmet Türü alanından seçim yapınca, her tür için ek hizmet kartları burada oluşur.
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {loadTypes.map((loadType) => {
            const catalog = catalogByLoadType[loadType] ?? [];
            const customForLoadType = customServices.filter(service => service.loadType === loadType);
            const newDraft = newCustomDrafts[loadType] ?? {
              title: '',
              active: true,
              priceMode: 'QUOTE' as PriceMode,
              basePrice: '',
              quoteMinPrice: '',
              quoteMaxPrice: '',
              notes: '',
            };
            const newSaving = savingKey === `custom-new:${loadType}`;
            return (
              <section key={loadType} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{LOAD_TYPE_LABELS[loadType]}</h3>
                    <p className="text-xs text-slate-500">{catalog.length} katalog ek hizmeti, {customForLoadType.length} özel ek hizmet</p>
                  </div>
                  <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">aktif taşıma türü</span>
                </div>

                {catalog.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-400">Bu tür için tanımlı ek hizmet yok.</div>
                ) : (
                  <div className="grid gap-4 p-4 xl:grid-cols-2">
                    {catalog.map((service) => {
                      const key = draftKey(loadType, service.id);
                      const draft = drafts[key] ?? {
                        active: false,
                        priceMode: 'NONE',
                        basePrice: '',
                        quoteMinPrice: '',
                        quoteMaxPrice: '',
                        notes: '',
                      };
                      const saving = savingKey === key;

                      return (
                        <article
                          key={service.id}
                          className={cn(
                            'rounded-xl border bg-white p-4 shadow-sm transition',
                            draft.active ? 'border-blue-200 ring-1 ring-blue-50' : 'border-slate-200 opacity-80',
                          )}
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Başlık</p>
                              <h4 className="mt-1 truncate text-sm font-bold text-slate-900">{service.name}</h4>
                              {service.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{service.description}</p>}
                            </div>
                            <Switch
                              checked={draft.active}
                              disabled={saving}
                              onCheckedChange={(checked) => updateDraft(key, { active: checked })}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <Label>Açıklama</Label>
                              <Textarea
                                value={draft.notes}
                                disabled={!draft.active || saving}
                                onChange={(event) => updateDraft(key, { notes: event.target.value })}
                                placeholder="Bu ek hizmetin kapsamını kısa anlatın."
                                className="mt-1 min-h-[76px] resize-none"
                              />
                            </div>

                            <div className="grid gap-3 md:grid-cols-[150px_1fr]">
                              <div>
                                <Label>Fiyat Tipi</Label>
                                <Select
                                  value={draft.priceMode}
                                  disabled={!draft.active || saving}
                                  onValueChange={(value) => updateDraft(key, { priceMode: value as PriceMode })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PRICE_MODE_LABELS).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {draft.priceMode === 'FIXED' ? (
                                <div>
                                  <Label>Sabit Fiyat</Label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={draft.basePrice}
                                      disabled={!draft.active || saving}
                                      onChange={(event) => updateDraft(key, { basePrice: event.target.value })}
                                      placeholder="Orn. 750"
                                    />
                                    <span className="text-sm text-slate-500">TL</span>
                                  </div>
                                </div>
                              ) : draft.priceMode === 'QUOTE' ? (
                                <div>
                                  <Label>Fiyat Aralığı</Label>
                                  <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={draft.quoteMinPrice}
                                      disabled={!draft.active || saving}
                                      onChange={(event) => updateDraft(key, { quoteMinPrice: event.target.value })}
                                      placeholder="Min"
                                    />
                                    <span className="text-xs text-slate-400">-</span>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={draft.quoteMaxPrice}
                                      disabled={!draft.active || saving}
                                      onChange={(event) => updateDraft(key, { quoteMaxPrice: event.target.value })}
                                      placeholder="Max"
                                    />
                                    <span className="text-sm text-slate-500">TL</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                  Bu ek hizmet ücretsiz olarak gösterilir.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={() => persistExtraService(loadType, service)}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Kaydet
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Özel Ek Hizmetler</h4>
                      <p className="text-xs text-slate-500">
                        Katalogda olmayan, bu taşıma türüne özel kendi ek hizmetlerinizi buradan ekleyin.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {customForLoadType.length} manuel hizmet
                    </span>
                  </div>

                  {customForLoadType.length > 0 && (
                    <div className="mb-4 grid gap-4 xl:grid-cols-2">
                      {customForLoadType.map((service) => {
                        const customKey = `custom:${service.id}`;
                        const draft = customDrafts[service.id] ?? {
                          title: service.title || '',
                          active: service.isActive,
                          priceMode: service.priceMode || 'QUOTE',
                          basePrice: service.basePrice == null ? '' : String(Number(service.basePrice)),
                          quoteMinPrice: service.quoteMinPrice == null ? '' : String(Number(service.quoteMinPrice)),
                          quoteMaxPrice: service.quoteMaxPrice == null ? '' : String(Number(service.quoteMaxPrice)),
                          notes: service.description || '',
                        };
                        const saving = savingKey === customKey;

                        return (
                          <article key={service.id} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Manuel Hizmet</p>
                                <p className="mt-1 text-xs text-slate-500">Sadece {LOAD_TYPE_LABELS[loadType]} için geçerli.</p>
                              </div>
                              <Switch
                                checked={draft.active}
                                disabled={saving}
                                onCheckedChange={(checked) => updateCustomDraft(service.id, { active: checked })}
                                className="data-[state=checked]:bg-indigo-600"
                              />
                            </div>

                            <div className="space-y-3">
                              <div>
                                <Label>Başlık</Label>
                                <Input
                                  value={draft.title}
                                  disabled={saving}
                                  onChange={(event) => updateCustomDraft(service.id, { title: event.target.value })}
                                  placeholder="Örn. Avize sökme ve paketleme"
                                  className="mt-1 bg-white"
                                />
                              </div>

                              <div>
                                <Label>Açıklama</Label>
                                <Textarea
                                  value={draft.notes}
                                  disabled={saving}
                                  onChange={(event) => updateCustomDraft(service.id, { notes: event.target.value })}
                                  placeholder="Hizmetin kapsamını ve varsa sınırlarını yazın."
                                  className="mt-1 min-h-[84px] resize-none bg-white"
                                />
                              </div>

                              <div className="grid gap-3 md:grid-cols-[150px_1fr]">
                                <div>
                                  <Label>Fiyat Tipi</Label>
                                  <Select
                                    value={draft.priceMode}
                                    disabled={saving}
                                    onValueChange={(value) => updateCustomDraft(service.id, { priceMode: value as PriceMode })}
                                  >
                                    <SelectTrigger className="mt-1 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(PRICE_MODE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {draft.priceMode === 'FIXED' ? (
                                  <div>
                                    <Label>Sabit Fiyat</Label>
                                    <div className="mt-1 flex items-center gap-2">
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={draft.basePrice}
                                        disabled={saving}
                                        onChange={(event) => updateCustomDraft(service.id, { basePrice: event.target.value })}
                                        placeholder="Örn. 600"
                                        className="bg-white"
                                      />
                                      <span className="text-sm text-slate-500">TL</span>
                                    </div>
                                  </div>
                                ) : draft.priceMode === 'QUOTE' ? (
                                  <div>
                                    <Label>Fiyat Aralığı</Label>
                                    <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={draft.quoteMinPrice}
                                        disabled={saving}
                                        onChange={(event) => updateCustomDraft(service.id, { quoteMinPrice: event.target.value })}
                                        placeholder="Min"
                                        className="bg-white"
                                      />
                                      <span className="text-xs text-slate-400">-</span>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={draft.quoteMaxPrice}
                                        disabled={saving}
                                        onChange={(event) => updateCustomDraft(service.id, { quoteMaxPrice: event.target.value })}
                                        placeholder="Max"
                                        className="bg-white"
                                      />
                                      <span className="text-sm text-slate-500">TL</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                    Bu özel hizmet ücretsiz olarak gösterilir.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={saving}
                                onClick={() => deleteCustomService(service)}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={saving}
                                onClick={() => saveCustomService(service)}
                                className="bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Kaydet
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">Yeni özel hizmet ekle</h5>
                        <p className="text-xs text-slate-500">Başlık, açıklama ve fiyat bilgisini girip bu taşıma türüne bağlayın.</p>
                      </div>
                      <Switch
                        checked={newDraft.active}
                        disabled={newSaving}
                        onCheckedChange={(checked) => updateNewCustomDraft(loadType, { active: checked })}
                        className="data-[state=checked]:bg-indigo-600"
                      />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      <div>
                        <Label>Başlık</Label>
                        <Input
                          value={newDraft.title}
                          disabled={newSaving}
                          onChange={(event) => updateNewCustomDraft(loadType, { title: event.target.value })}
                          placeholder="Örn. Klima sökme takma"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label>Fiyat Tipi</Label>
                        <Select
                          value={newDraft.priceMode}
                          disabled={newSaving}
                          onValueChange={(value) => updateNewCustomDraft(loadType, { priceMode: value as PriceMode })}
                        >
                          <SelectTrigger className="mt-1 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRICE_MODE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label>Açıklama</Label>
                      <Textarea
                        value={newDraft.notes}
                        disabled={newSaving}
                        onChange={(event) => updateNewCustomDraft(loadType, { notes: event.target.value })}
                        placeholder="Bu hizmette neler dahil, hangi durumlar ayrıca konuşulur?"
                        className="mt-1 min-h-[84px] resize-none bg-white"
                      />
                    </div>

                    <div className="mt-3">
                      {newDraft.priceMode === 'FIXED' ? (
                        <div>
                          <Label>Sabit Fiyat</Label>
                          <div className="mt-1 flex max-w-sm items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={newDraft.basePrice}
                              disabled={newSaving}
                              onChange={(event) => updateNewCustomDraft(loadType, { basePrice: event.target.value })}
                              placeholder="Örn. 600"
                              className="bg-white"
                            />
                            <span className="text-sm text-slate-500">TL</span>
                          </div>
                        </div>
                      ) : newDraft.priceMode === 'QUOTE' ? (
                        <div>
                          <Label>Fiyat Aralığı</Label>
                          <div className="mt-1 grid max-w-md grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={newDraft.quoteMinPrice}
                              disabled={newSaving}
                              onChange={(event) => updateNewCustomDraft(loadType, { quoteMinPrice: event.target.value })}
                              placeholder="Min"
                              className="bg-white"
                            />
                            <span className="text-xs text-slate-400">-</span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={newDraft.quoteMaxPrice}
                              disabled={newSaving}
                              onChange={(event) => updateNewCustomDraft(loadType, { quoteMaxPrice: event.target.value })}
                              placeholder="Max"
                              className="bg-white"
                            />
                            <span className="text-sm text-slate-500">TL</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          Ücretsiz özel hizmet olarak kaydedilir.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        disabled={newSaving}
                        onClick={() => createCustomService(loadType)}
                        className="bg-slate-900 text-white hover:bg-slate-800"
                      >
                        {newSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Özel Hizmet Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
