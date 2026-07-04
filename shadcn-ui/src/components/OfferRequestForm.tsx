import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Shield, Award, Eye, Star,
  CheckCircle2, XCircle, Info, Lock, X, ArrowRight,
  Phone, Check, Loader2, UserCheck, LogIn, ChevronDown,
  Home, Building2, Package, Archive, MapPin, CalendarDays,
  ShieldCheck, Zap, Megaphone, Truck, AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Carrier, LOAD_TYPES, type CarrierDetail, type CarrierDetailServiceGroup, type CarrierDetailServiceItem } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { CITIES_TR, getDistrictsForCity, formatDateYYYYMMDD } from '@/lib/locations';
import FileUpload from '@/components/ui/file-upload';
import { SPECIAL_SERVICES } from '@/lib/carrierFormConstants';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isAuthenticated as hasValidAuthSession } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';
import { mapPlaceTypeToConverterPropertyType } from '@/lib/placeType';
import VolumeCalculatorModal from '@/components/converter/VolumeCalculatorModal';
import type { VolumeCalculatorDraftValues, VolumeCalculatorInitialValues } from '@/components/converter/VolumeCalculatorModal';
import type { EstimateConverterResponse } from '@/lib/converterApi';
import {
  clearGuestOfferDraft,
  clearGuestOfferPendingIntent,
  hasGuestOfferPendingIntent,
  loadGuestOfferDraft,
  loadGuestOfferFiles,
  markGuestOfferPendingIntent,
  saveGuestOfferDraft,
  saveGuestOfferFiles,
} from '@/lib/guestOfferDraft';
import {
  getExtraServiceLoadType,
  estimateServicesTotal,
  formatServicePrice,
  mapSelectedExtraServiceNames,
  mergeSuggestedExtraServiceIds,
  reconcileSelectedExtraServiceIds,
  type ExtraServiceOption,
} from '@/lib/extraServices';
import {
  CONTACT_SAFETY_WARNING,
  buildShipmentPayloadFromForm,
  getConverterAppliedSummary,
  normalizePlaceTypeForBackend,
  type ConverterAppliedSummary,
} from '@/lib/customerShipmentForm';
import {
  normalizeRequestedCarrierServices,
  normalizeServiceId,
  reconcileRequestedCarrierServices,
  type RequestedCarrierServices,
} from '@/lib/offerRequestServices';
import { normalizeOfferRequestDraftFormData } from '@/lib/offerRequestHydration';

type Step = 1 | 2 | 3 | 4;

interface CustomerAddress {
  id: number;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  isDefault: boolean;
}

type SelectedCarrierServices = {
  carrierId: string;
  carrierName: string;
  services: CarrierDetailServiceGroup[];
};

const FORM_DRAFT_FIELDS = [
  'originCity',
  'originDistrict',
  'originAddressText',
  'destinationCity',
  'destinationDistrict',
  'destinationAddressText',
  'date',
  'scope',
  'transportType',
  'placeType',
  'loadType',
  'weightKg',
  'floor',
  'hasElevator',
  'destinationFloor',
  'destinationHasElevator',
  'dateFlexibility',
  'timeWindow',
  'extras',
  'serviceOptions',
  'extraServices',
  'note',
] as const;

const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatCalendarDate = (value: string) => {
  const date = parseCalendarDate(value);
  return date ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : value;
};

const normalizeServiceName = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

const filterAndDedupeServiceGroups = (
  services: CarrierDetailServiceGroup[],
  targetLoadType: string,
): CarrierDetailServiceGroup[] => {
  if (!targetLoadType) return [];

  const byNameAndSource = new Map<string, CarrierDetailServiceItem>();

  for (const group of services) {
    if (group.loadType !== targetLoadType) continue;

    for (const service of group.items ?? []) {
      const key = `${normalizeServiceName(service.name)}|${service.source}`;
      if (!byNameAndSource.has(key)) byNameAndSource.set(key, service);
    }
  }

  const items = Array.from(byNameAndSource.values());
  return items.length > 0 ? [{ loadType: targetLoadType, items }] : [];
};

const CONVERTER_TO_VEHICLE_TYPE_NAME: Record<EstimateConverterResponse['recommendedVehicle'], string> = {
  panelvan: 'Panel Van',
  short_chassis_van: 'Kamyonet',
  long_chassis_van: 'Kamyonet',
  small_truck: 'Kamyon',
  large_truck: 'Kamyon',
};

export default function OfferRequestForm({ showHeader = false }: { showHeader: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const carrierIdParam = searchParams.get('carrierId');
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [authRedirecting, setAuthRedirecting] = useState<null | 'login' | 'register'>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [inviteCarrierId, setInviteCarrierId] = useState<string | null>(null);
  const [inviteCarrierName, setInviteCarrierName] = useState<string | null>(null);
  const [isVolumeCalculatorOpen, setIsVolumeCalculatorOpen] = useState(false);
  const [appliedConverterSummary, setAppliedConverterSummary] = useState<ConverterAppliedSummary | null>(null);
  const [converterDraftValues, setConverterDraftValues] = useState<VolumeCalculatorDraftValues | null>(null);
  const [weightEditMode, setWeightEditMode] = useState(false);
  const formShellRef = useRef<HTMLDivElement | null>(null);
  const keepFormInViewOnStepChangeRef = useRef(false);
  const landingEstimateAppliedRef = useRef(false);
  const draftRestoreRef = useRef(false);
  const restoredDraftRef = useRef(false);
  const carrierReconcileRef = useRef(false);
  const [availableExtraServices, setAvailableExtraServices] = useState<ExtraServiceOption[]>([]);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<string[]>([]);
  const [reviewCarrierId, setReviewCarrierId] = useState<string | null>(null);
  const [reviewCarrierDetail, setReviewCarrierDetail] = useState<CarrierDetail | null>(null);
  const [reviewCarrierLoading, setReviewCarrierLoading] = useState(false);
  const [selectedCarrierServices, setSelectedCarrierServices] = useState<SelectedCarrierServices[]>([]);
  const [carrierServicesLoading, setCarrierServicesLoading] = useState(false);
  const [requestedServicesByCarrier, setRequestedServicesByCarrier] = useState<RequestedCarrierServices>({});
  const [expandedCarrierServices, setExpandedCarrierServices] = useState<Record<string, boolean>>({});
  const [showAllCarrierServices, setShowAllCarrierServices] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    originCity: '',
    originDistrict: '',
    originAddressText: '',
    destinationCity: '',
    destinationDistrict: '',
    destinationAddressText: '',
    date: '',
    scope: (localStorage.getItem('auto_scope') as 'sehirici' | 'sehirlerarasi' | null) || '' as '' | 'sehirici' | 'sehirlerarasi',
    transportType: '',
    placeType: '',
    loadType: '',
    weightKg: '',
    floor: '',
    hasElevator: false,
    destinationFloor: '',
    destinationHasElevator: false,
    dateFlexibility: 'EXACT' as 'EXACT' | 'PLUS_MINUS_1_DAY' | 'PLUS_MINUS_3_DAYS',
    timeWindow: '',
    extras: { asansor: false, sigorta: false, ambalaj: false },
    serviceOptions: {} as Record<string, string[]>,
    extraServices: [] as string[],
    photos: [] as File[],
    note: '',
  });

  const VOLUME_ESTIMATE_DRAFT_KEY = 'tasiburada:volume-calculator-estimate:v1';

  const [availabilitySummary, setAvailabilitySummary] = useState<{ total: number; available: number } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const availabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedScope = useMemo<'' | 'sehirici' | 'sehirlerarasi'>(() => {
    if (!form.originCity || !form.destinationCity) return form.scope;
    return form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
  }, [form.originCity, form.destinationCity, form.scope]);

  useEffect(() => {
    if (!form.date) {
      setAvailabilitySummary(null);
      return;
    }
    if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    setIsCheckingAvailability(true);
    setAvailabilitySummary(null);
    availabilityTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ date: form.date });
        if (form.originCity) params.set('serviceCity', form.originCity);
        if (requestedScope) params.set('scope', requestedScope);
        if (form.dateFlexibility && form.dateFlexibility !== 'EXACT') params.set('dateFlexibility', form.dateFlexibility);
        const res = await fetch(`/api/v1/carriers/availability-summary?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setAvailabilitySummary(json.data);
        }
      } catch {
        // silently ignore
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 400);
    return () => {
      if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    };
  }, [form.date, form.originCity, form.dateFlexibility, requestedScope]);

  // Load saved addresses for authenticated customers
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/me/addresses')
        .then((r) => r.json())
        .then((d) => { if (d.success) setSavedAddresses(d.data ?? []); })
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Load profile phone for pre-fill
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/profile')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const profilePhone = String(d.data?.phone ?? '').trim();
            if (!profilePhone) {
              setNeedsPhone(true);
            } else {
              setPhone((prev) => prev.trim() ? prev : profilePhone);
            }
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.type]);

  // Handle URL "type" parameter mappings
  useEffect(() => {
    if (typeParam) {
      setForm((prev) => {
        let mapped = prev.transportType;
        if (typeParam === 'residential') mapped = 'evden-eve';
        else if (typeParam === 'office') mapped = 'ofis-tasima';
        else if (typeParam === 'partial') mapped = 'parca';
        else if (typeParam === 'storage') mapped = 'depolama';
        return mapped !== prev.transportType ? { ...prev, transportType: mapped } : prev;
      });
    }
  }, [typeParam]);

  useEffect(() => {
    if (!carrierIdParam) return;
    setInviteCarrierId(carrierIdParam);
    setSelectedCarrierIds(prev => prev.includes(carrierIdParam) ? prev : [...prev, carrierIdParam]);
  }, [carrierIdParam]);

  // Repeat shipment: prefill from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('repeatShipment');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem('repeatShipment');

      setForm(prev => {
        const next = { ...prev };
        if (data.origin) {
          const parts = data.origin.split(', ');
          next.originCity = parts[0] ?? '';
          next.originDistrict = parts[1] ?? '';
        }
        if (data.destination) {
          const parts = data.destination.split(', ');
          next.destinationCity = parts[0] ?? '';
          next.destinationDistrict = parts[1] ?? '';
        }
        if (data.transportType) next.transportType = data.transportType;
        if (data.weight) next.weightKg = String(data.weight);
        if (data.placeType) next.placeType = data.placeType;
        if (data.floor) next.floor = String(data.floor);
        if (data.hasElevator !== undefined) next.hasElevator = data.hasElevator;
        if (data.extraServices) next.extraServices = data.extraServices;
        return next;
      });

      if (data.inviteCarrierId) {
        setInviteCarrierId(data.inviteCarrierId);
        setInviteCarrierName(data.inviteCarrierName ?? null);
        setSelectedCarrierIds(prev =>
          prev.includes(data.inviteCarrierId) ? prev : [...prev, data.inviteCarrierId]
        );
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const ALT_OPTIONS_BY_TRANSPORT: Record<string, string[]> = {
    'evden-eve': ['1+1 ev','2+1 ev','3+1 ev','4+1 ev','5+1 ev','5+2 ev','Dubleks / Müstakil','Diğer / Emin değilim'],
    'ofis-tasima': ['Küçük ofis','Orta ofis','Büyük ofis'],
    'parca': ['sadece beyaz eşya','sadece mobilya','tek parça eşya'],
    'depolama': ['Küçük depo','Orta depo','Büyük depo'],
  };
  const altOptions = useMemo(() => ALT_OPTIONS_BY_TRANSPORT[form.transportType] || [], [form.transportType]);

  const SERVICE_GROUP_BY_TRANSPORT_TYPE: Record<string, string> = {
    'evden-eve': 'evden-eve',
    'parca': 'parca',
    'ofis-tasima': 'ofis',
    'depolama': 'depolama',
  };
  const currentServiceGroup = useMemo(() => SERVICE_GROUP_BY_TRANSPORT_TYPE[form.transportType] || '', [form.transportType]);
  const currentExtraServiceLoadType = useMemo(
    () => getExtraServiceLoadType((form.transportType as any) || ''),
    [form.transportType],
  );

  useEffect(() => {
    setForm(prev => {
      if (!currentServiceGroup) return { ...prev, serviceOptions: {} };
      const keep = prev.serviceOptions?.[currentServiceGroup] || [];
      return { ...prev, serviceOptions: { [currentServiceGroup]: keep } };
    });
  }, [currentServiceGroup]);

  useEffect(() => {
    let cancelled = false;

    if (!currentExtraServiceLoadType || !currentServiceGroup) {
      setAvailableExtraServices([]);
      setForm((prev) => ({ ...prev, serviceOptions: {}, extraServices: [] }));
      return;
    }

    apiClient(`/extra-services?loadType=${currentExtraServiceLoadType}`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        const nextOptions = Array.isArray(json.data) ? json.data as ExtraServiceOption[] : [];
        setAvailableExtraServices(nextOptions);

        setForm((prev) => {
          const currentIds = Array.isArray(prev.serviceOptions?.[currentServiceGroup])
            ? prev.serviceOptions[currentServiceGroup]
            : [];
          const fallbackIds = currentIds.length
            ? currentIds
            : nextOptions
                .filter((option) => (prev.extraServices || []).includes(option.name))
                .map((option) => option.id);
          const { keptIds, removedIds } = reconcileSelectedExtraServiceIds(fallbackIds, nextOptions);

          if (removedIds.length > 0) {
            toast({
              title: 'Ek hizmetler güncellendi',
              description: 'Yük türü değiştiği için artık geçerli olmayan seçimler temizlendi.',
            });
          }

          return {
            ...prev,
            serviceOptions: { [currentServiceGroup]: keptIds },
            extraServices: mapSelectedExtraServiceNames(keptIds, nextOptions),
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableExtraServices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentExtraServiceLoadType, currentServiceGroup, toast]);

  useEffect(() => {
    if (!currentServiceGroup) return;
    const selectedIds = form.serviceOptions?.[currentServiceGroup] || [];
    const selectedNames = mapSelectedExtraServiceNames(selectedIds, availableExtraServices);
    const prevNames = form.extraServices || [];
    if (JSON.stringify(prevNames) === JSON.stringify(selectedNames)) return;

    setForm((prev) => ({ ...prev, extraServices: selectedNames }));
  }, [availableExtraServices, currentServiceGroup, form.extraServices, form.serviceOptions]);

  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destinationDistricts, setDestinationDistricts] = useState<string[]>([]);

  const displayStep = showSummaryModal ? 5 : step;
  const progress = useMemo(() => {
    const per = 100 / 5;
    return Math.min(100, Math.max(0, Math.round(per * displayStep)));
  }, [displayStep]);

  const handleChange = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  // Misafir kullanici formu serbestce doldurabilir; giris yalnizca
  // yayinlama aninda istenir. Taslak auth akisi icin sessionStorage/IndexedDB ile saklanir.
  const requireLoginForSelection = (_message?: string) => true;

  const getResumeReturnPath = () => {
    const params = new URLSearchParams();
    if (typeParam) params.set('type', typeParam);
    if (carrierIdParam) params.set('carrierId', carrierIdParam);
    params.set('resumeGuestDraft', '1');
    return `/teklif-talebi?${params.toString()}`;
  };

  const hasMeaningfulDraftData = () => Boolean(
    form.originCity ||
    form.originDistrict ||
    form.originAddressText ||
    form.destinationCity ||
    form.destinationDistrict ||
    form.destinationAddressText ||
    form.date ||
    form.transportType ||
    form.placeType ||
    form.loadType ||
    form.weightKg ||
    form.floor ||
    form.hasElevator ||
    form.timeWindow ||
    form.note ||
    form.photos.length ||
    selectedCarrierIds.length ||
    Object.values(requestedServicesByCarrier).some((item) => item.catalogServiceIds.length || item.customServiceIds.length) ||
    converterDraftValues ||
    appliedConverterSummary
  );

  const getSafeRestoreTarget = (
    draftStep: number,
    showSummary: boolean,
    data: Record<string, unknown>,
    restoredConverterSummary?: ConverterAppliedSummary | null,
  ) => {
    const routeReady = Boolean(data.originCity && data.originDistrict && data.destinationCity && data.destinationDistrict && data.date && data.transportType);
    const hasLoadDetail = Boolean(data.placeType || data.loadType || data.weightKg || restoredConverterSummary);
    if (!routeReady) return { nextStep: 1 as Step, nextSummary: false };
    if (showSummary && hasLoadDetail) return { nextStep: 4 as Step, nextSummary: true };
    const boundedStep = ([1, 2, 3, 4].includes(draftStep) ? draftStep : 1) as Step;
    if (boundedStep >= 3 && !hasLoadDetail) return { nextStep: 2 as Step, nextSummary: false };
    return { nextStep: boundedStep, nextSummary: false };
  };

  const saveCurrentGuestDraft = async ({ markIntent = false }: { markIntent?: boolean } = {}) => {
    const formData = FORM_DRAFT_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      acc[field] = (form as Record<string, unknown>)[field];
      return acc;
    }, {});

    await saveGuestOfferFiles(form.photos);
    const draft = saveGuestOfferDraft({
      activeStep: step,
      showSummaryModal,
      returnPath: getResumeReturnPath(),
      pendingAction: 'submit-offer-request',
      formData,
      phone: phone.trim(),
      converterData: {
        draftValues: converterDraftValues,
        appliedSummary: appliedConverterSummary,
      },
      selectedCarrierIds,
      requestedServicesByCarrier,
      expandedCarrierServices,
      showAllCarrierServices,
      inviteCarrierId,
      inviteCarrierName,
    });

    if (markIntent) markGuestOfferPendingIntent('submit-offer-request');
    return draft;
  };

  useEffect(() => {
    if (draftRestoreRef.current) return;
    draftRestoreRef.current = true;

    const shouldResume = searchParams.get('resumeGuestDraft') === '1' || hasGuestOfferPendingIntent();
    if (!shouldResume) {
      loadGuestOfferDraft();
      return;
    }

    const draft = loadGuestOfferDraft();
    if (!draft) {
      clearGuestOfferPendingIntent();
      return;
    }

    const rawRestoredFormData = FORM_DRAFT_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(draft.formData, field)) {
        acc[field] = draft.formData[field];
      }
      return acc;
    }, {});
    const converterData = draft.converterData as {
      draftValues?: VolumeCalculatorDraftValues | null;
      appliedSummary?: ConverterAppliedSummary | null;
    } | null | undefined;
    const { formData: restoredFormData, warnings } = normalizeOfferRequestDraftFormData(rawRestoredFormData);
    const restoredConverterSummary = converterData?.appliedSummary ?? null;
    const { nextStep, nextSummary } = getSafeRestoreTarget(
      draft.activeStep,
      Boolean(draft.showSummaryModal),
      restoredFormData,
      restoredConverterSummary,
    );

    setForm(prev => ({ ...prev, ...restoredFormData, photos: [] }));
    setConverterDraftValues(converterData?.draftValues ?? null);
    setAppliedConverterSummary(restoredConverterSummary);
    setPhone(draft.phone?.trim() ?? '');
    setSelectedCarrierIds(Array.isArray(draft.selectedCarrierIds) ? draft.selectedCarrierIds : []);
    setRequestedServicesByCarrier(normalizeRequestedCarrierServices(draft.requestedServicesByCarrier));
    setExpandedCarrierServices(draft.expandedCarrierServices ?? {});
    setShowAllCarrierServices(draft.showAllCarrierServices ?? {});
    setInviteCarrierId(draft.inviteCarrierId ?? null);
    setInviteCarrierName(draft.inviteCarrierName ?? null);
    setStep(nextStep);
    setShowSummaryModal(nextSummary);
    restoredDraftRef.current = true;

    loadGuestOfferFiles()
      .then((files) => {
        if (files.length) setForm(prev => ({ ...prev, photos: files }));
      })
      .catch(() => {
        toast({
          title: 'FotoÄŸraflar geri yÃ¼klenemedi',
          description: 'Form bilgileriniz korundu; fotoÄŸraflarÄ± tekrar ekleyebilirsiniz.',
          variant: 'destructive',
        });
      });

    clearGuestOfferPendingIntent();
    if (searchParams.get('resumeGuestDraft') === '1') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('resumeGuestDraft');
      const nextSearch = nextParams.toString();
      navigate(`/teklif-talebi${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    }
    toast({
      title: 'Bilgileriniz geri yÃ¼klendi',
      description: 'Talebinizi kontrol ederek gÃ¶nderebilirsiniz.',
    });
    if (warnings.length > 0) {
      toast({
        title: 'Rota bilgileri kontrol edilmeli',
        description: warnings.join(' '),
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMeaningfulDraftData()) return;
    const t = setTimeout(() => {
      saveCurrentGuestDraft().catch(() => {
        // Debounced guest draft errors should not interrupt form filling.
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form,
    step,
    showSummaryModal,
    selectedCarrierIds,
    requestedServicesByCarrier,
    expandedCarrierServices,
    showAllCarrierServices,
    converterDraftValues,
    appliedConverterSummary,
    inviteCarrierId,
    inviteCarrierName,
  ]);

  const converterInitialValues = useMemo<VolumeCalculatorInitialValues>(() => {
    return {
      moveType: form.transportType === 'parca' ? 'partial_load' : 'household',
      propertyType: mapPlaceTypeToConverterPropertyType(form.placeType),
    };
  }, [form.placeType, form.transportType]);

  const applyConverterEstimateToForm = (result: EstimateConverterResponse) => {
    const weightKg = result.estimatedWeightKg;
    const recommendedVehicleLabel = CONVERTER_TO_VEHICLE_TYPE_NAME[result.recommendedVehicle] || result.recommendedVehicle;
    setForm((prev) => {
      const currentIds = currentServiceGroup ? (prev.serviceOptions?.[currentServiceGroup] || []) : [];
      const mergedIds = currentServiceGroup
        ? mergeSuggestedExtraServiceIds(currentIds, result.suggestedExtraServiceIds, availableExtraServices)
        : currentIds;

      return {
        ...prev,
        weightKg: String(weightKg),
        serviceOptions: currentServiceGroup ? { [currentServiceGroup]: mergedIds } : prev.serviceOptions,
        extraServices: mapSelectedExtraServiceNames(mergedIds, availableExtraServices),
      };
    });
    setAppliedConverterSummary({
      estimatedVolumeMin: result.estimatedVolumeMin,
      estimatedVolumeMax: result.estimatedVolumeMax,
      estimatedWeightKg: result.estimatedWeightKg,
      recommendedVehicle: recommendedVehicleLabel,
    });
    setWeightEditMode(false);
    toast({
      title: 'Ağırlık güncellendi',
      description: `Tahmini ağırlık ${weightKg} kg olarak forma uygulandı. Araç önerisi bilgi olarak kaldı.`,
    });
  };

  useEffect(() => {
    if (landingEstimateAppliedRef.current) return;
    const raw =
      localStorage.getItem(VOLUME_ESTIMATE_DRAFT_KEY)
      || sessionStorage.getItem('volumeCalculatorEstimate');
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as { result: EstimateConverterResponse };
      const result = payload.result;
      if (!result) return;

      landingEstimateAppliedRef.current = true;
      localStorage.removeItem(VOLUME_ESTIMATE_DRAFT_KEY);
      sessionStorage.removeItem('volumeCalculatorEstimate');

      const recommendedVehicleLabel = CONVERTER_TO_VEHICLE_TYPE_NAME[result.recommendedVehicle] || result.recommendedVehicle;

      setForm((prev) => ({
        ...prev,
        transportType: prev.transportType || 'evden-eve',
        weightKg: String(result.estimatedWeightKg),
      }));
      setAppliedConverterSummary({
        estimatedVolumeMin: result.estimatedVolumeMin,
        estimatedVolumeMax: result.estimatedVolumeMax,
        estimatedWeightKg: result.estimatedWeightKg,
        recommendedVehicle: recommendedVehicleLabel,
      });
      setWeightEditMode(false);
      setStep(2);
      toast({
        title: 'Hacim hesabı aktarıldı',
        description: 'Tahmini hacim ve ağırlık forma eklendi; araç önerisi bilgi olarak saklandı.',
      });
    } catch {
      localStorage.removeItem(VOLUME_ESTIMATE_DRAFT_KEY);
      sessionStorage.removeItem('volumeCalculatorEstimate');
    }
  }, [toast]);

  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);
  const maxDateStr = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 30); return formatDateYYYYMMDD(d); }, []);
  const isDateTooFar = useMemo(() => {
    if (!form.date) return false;
    try {
      const selectedDate = parseCalendarDate(form.date);
      const maxDate = parseCalendarDate(maxDateStr);
      return Boolean(selectedDate && maxDate && selectedDate > maxDate);
    } catch { return false; }
  }, [form.date, maxDateStr]);

  const routeValidation = useMemo(() => {
    const missingFields = [
      !form.originCity ? 'çıkış şehri' : '',
      !form.originDistrict ? 'çıkış ilçesi' : '',
      !form.destinationCity ? 'varış şehri' : '',
      !form.destinationDistrict ? 'varış ilçesi' : '',
      !form.date ? 'taşıma tarihi' : '',
      !form.transportType ? 'taşıma tipi' : '',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      return {
        valid: false,
        title: 'Rota bilgileri eksik',
        message: `Lütfen ${missingFields.join(', ')} alanlarını tamamlayın.`,
        targetStep: 1 as Step,
      };
    }
    if (isDateTooFar) {
      return {
        valid: false,
        title: 'Tarih aralığı uygun değil',
        message: 'Taşıma tarihi en fazla 30 gün sonrası için seçilebilir.',
        targetStep: 1 as Step,
      };
    }
    return { valid: true, title: '', message: '', targetStep: 1 as Step };
  }, [
    form.date,
    form.destinationCity,
    form.destinationDistrict,
    form.originCity,
    form.originDistrict,
    form.transportType,
    isDateTooFar,
  ]);
  const canNextFrom1 = routeValidation.valid;
  const hasLoadEstimate = !!form.placeType || !!form.weightKg || !!appliedConverterSummary;
  const loadValidation = useMemo(() => {
    if (hasLoadEstimate) return { valid: true, title: '', message: '', targetStep: 2 as Step };
    return {
      valid: false,
      title: 'Yük detayı gerekli',
      message: 'Yayınlamadan önce yer tipi seçin veya Hacim Hesapla ile ağırlığı doldurun.',
      targetStep: 2 as Step,
    };
  }, [hasLoadEstimate]);
  const publishValidation = useMemo(() => {
    if (!routeValidation.valid) return routeValidation;
    if (!loadValidation.valid) return loadValidation;
    return { valid: true, title: '', message: '', targetStep: 4 as Step };
  }, [loadValidation, routeValidation]);
  const canPublish = publishValidation.valid;
  const summaryValidation = useMemo(() => {
    if (!publishValidation.valid) return publishValidation;
    if (step === 4 && selectedCarrierIds.length > 0 && carrierServicesLoading) {
      return {
        valid: false,
        title: 'Ek hizmetler yükleniyor',
        message: 'Ek hizmet bilgileri henüz yükleniyor. Lütfen birkaç saniye sonra tekrar deneyin.',
        targetStep: 4 as Step,
      };
    }
    return { valid: true, title: '', message: '', targetStep: 4 as Step };
  }, [carrierServicesLoading, publishValidation, selectedCarrierIds.length, step]);
  const isSummaryLoadingBlocked = step === 4 && selectedCarrierIds.length > 0 && carrierServicesLoading;
  const openSummaryStep = () => {
    if (!summaryValidation.valid) {
      toast({
        title: summaryValidation.title || 'Özet adımına geçilemedi',
        description: summaryValidation.message,
        variant: summaryValidation.targetStep === 4 ? undefined : 'destructive',
      });
      if (summaryValidation.targetStep !== step) {
        setShowSummaryModal(false);
        goToStepKeepingFormInView(summaryValidation.targetStep);
      }
      return;
    }
    setShowSummaryModal(true);
  };
  const availabilityHint = useMemo(() => {
    if (!canPublish) return null;
    if (typeof availabilitySummary?.available !== 'number') return null;
    return { carrierCount: availabilitySummary.available };
  }, [availabilitySummary?.available, canPublish]);

  const TEMPLATE_WEIGHTS: Record<string, number> = {
    '1+1 ev': 800,
    '2+1 ev': 1500,
    '3+1 ev': 2500,
    '4+1 ev': 3500,
    '5+1 ev': 4500,
    '5+2 ev': 5200,
    'sadece beyaz eşya': 400,
    'sadece mobilya': 800,
    'tek parça eşya': 100,
    'Küçük ofis': 1000,
    'Orta ofis': 2000,
    'Büyük ofis': 3500,
    'Küçük depo': 1200,
    'Orta depo': 2200,
    'Büyük depo': 4000,
  };

  const suitableCarriersBase = useMemo(() => {
    if (!canNextFrom1) return [] as Carrier[];
    // Backend tarih + çıkış şehri filtresi uygular; varış şehri esnek bırakılır.
    return carriers;
  }, [canNextFrom1, carriers]);

  const isLoggedIn = useMemo(() => {
    return isAuthenticated || hasValidAuthSession();
  }, [isAuthenticated]);

  // Step 2 açıldığında backend'den tarih ve çıkış şehrine göre filtrelenmiş nakliyecileri çek
  useEffect(() => {
    if (step !== 2) return;
    if (!form.originCity || !form.destinationCity || !form.date) return;

    setLoadingResults(true);
    setCarriers([]);

    const params = new URLSearchParams({ availableDate: form.date, limit: '50' });
    params.set('serviceCity', form.originCity);
    if (requestedScope) params.set('scope', requestedScope);
    if (form.dateFlexibility && form.dateFlexibility !== 'EXACT') params.set('dateFlexibility', form.dateFlexibility);

    const token = localStorage.getItem('authToken');
    fetch(`/api/v1/carriers/search?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data.items)) {
          setCarriers(json.data.items.map(mapSearchResultToCarrier));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [step, form.originCity, form.destinationCity, form.date, form.dateFlexibility, requestedScope]);

  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'capacity'>('rating');

  const suitableCarriers = useMemo(() => {
    let list = suitableCarriersBase;
    if (minRating > 0) list = list.filter(c => c.rating >= minRating);
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      return b.vehicle.capacity - a.vehicle.capacity;
    });
    return sorted;
  }, [suitableCarriersBase, minRating, sortBy]);

  const selectedCarriers = useMemo(
    () => selectedCarrierIds
      .map(id => carriers.find(carrier => carrier.id === id))
      .filter(Boolean) as Carrier[],
    [carriers, selectedCarrierIds],
  );

  useEffect(() => {
    if (!restoredDraftRef.current || carrierReconcileRef.current || carriers.length === 0 || selectedCarrierIds.length === 0) return;
    carrierReconcileRef.current = true;
    const validIds = new Set(carriers.map(carrier => carrier.id));
    const nextIds = selectedCarrierIds.filter(id => validIds.has(id));
    if (nextIds.length === selectedCarrierIds.length) return;

    setSelectedCarrierIds(nextIds);
    setRequestedServicesByCarrier(prev => {
      const next: RequestedCarrierServices = {};
      for (const id of nextIds) {
        if (prev[id]) next[id] = prev[id];
      }
      return next;
    });
    toast({
      title: 'Nakliyeci seÃ§imleri gÃ¼ncellendi',
      description: 'ArtÄ±k uygun olmayan nakliyeci seÃ§imleri kaldÄ±rÄ±ldÄ±.',
    });
  }, [carriers, selectedCarrierIds, toast]);

  const toggleCarrierSelection = (carrierId: string) => {
    const removing = selectedCarrierIds.includes(carrierId);
    if (!removing && selectedCarrierIds.length >= 4) {
      toast({
        title: 'En fazla 4 nakliyeci seçebilirsiniz',
        description: 'Rekabet için 3-4 firma yeterli olur; daha fazlası teklif yönetimini zorlaştırır.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedCarrierIds(prev =>
      prev.includes(carrierId) ? prev.filter(id => id !== carrierId) : [...prev, carrierId]
    );
    if (removing) {
      setRequestedServicesByCarrier(prev => {
        const next = { ...prev };
        delete next[carrierId];
        return next;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (!reviewCarrierId) {
      setReviewCarrierDetail(null);
      return;
    }

    setReviewCarrierLoading(true);
    apiClient(`/api/v1/carriers/${reviewCarrierId}/detail`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        setReviewCarrierDetail(json.success ? json.data as CarrierDetail : null);
      })
      .catch(() => {
        if (!cancelled) setReviewCarrierDetail(null);
      })
      .finally(() => {
        if (!cancelled) setReviewCarrierLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reviewCarrierId]);

  useEffect(() => {
    let cancelled = false;

    if (step !== 4 || selectedCarrierIds.length === 0) {
      setSelectedCarrierServices([]);
      return;
    }

    setCarrierServicesLoading(true);
    Promise.all(selectedCarrierIds.map(async (carrierId) => {
      const fallbackCarrier = carriers.find(carrier => carrier.id === carrierId);
      try {
        const detailPath = currentExtraServiceLoadType
          ? `/api/v1/carriers/${carrierId}/detail?loadType=${currentExtraServiceLoadType}`
          : `/api/v1/carriers/${carrierId}/detail`;
        const response = await apiClient(detailPath);
        const json = await response.json();
        const detail = json.success ? json.data as CarrierDetail : null;
        const services = Array.isArray(detail?.services)
          ? filterAndDedupeServiceGroups(detail.services, currentExtraServiceLoadType)
          : [];
        return {
          carrierId,
          carrierName: detail?.companyName
            || [fallbackCarrier?.name, fallbackCarrier?.surname].filter(Boolean).join(' ')
            || 'Nakliyeci',
          services,
        };
      } catch {
        return {
          carrierId,
          carrierName: [fallbackCarrier?.name, fallbackCarrier?.surname].filter(Boolean).join(' ') || 'Nakliyeci',
          services: [],
        };
      }
    }))
      .then((items) => {
        if (!cancelled) setSelectedCarrierServices(items);
      })
      .finally(() => {
        if (!cancelled) setCarrierServicesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [carriers, currentExtraServiceLoadType, selectedCarrierIds, step]);

  useEffect(() => {
    if (step !== 4 || carrierServicesLoading || selectedCarrierServices.length === 0) return;

    const { next, removedCount } = reconcileRequestedCarrierServices(
      requestedServicesByCarrier,
      selectedCarrierServices,
    );

    if (JSON.stringify(next) === JSON.stringify(normalizeRequestedCarrierServices(requestedServicesByCarrier))) return;

    setRequestedServicesByCarrier(next);
    if (removedCount > 0) {
      toast({
        title: 'Ek hizmet seçimleri güncellendi',
        description: 'Seçtiğiniz hizmetlerden artık sunulmayanlar kaldırıldı; geçerli seçimler korundu.',
      });
    }
  }, [carrierServicesLoading, requestedServicesByCarrier, selectedCarrierServices, step, toast]);

  const isCarrierServiceSelected = (carrierId: string, service: CarrierDetailServiceItem) => {
    const carrierServices = requestedServicesByCarrier[normalizeServiceId(carrierId)];
    if (!carrierServices) return false;
    const serviceId = normalizeServiceId(service.id);
    return service.source === 'custom'
      ? carrierServices.customServiceIds.includes(serviceId)
      : carrierServices.catalogServiceIds.includes(serviceId);
  };

  const toggleCarrierService = (carrierId: string, service: CarrierDetailServiceItem) => {
    setRequestedServicesByCarrier(prev => {
      const normalizedCarrierId = normalizeServiceId(carrierId);
      const serviceId = normalizeServiceId(service.id);
      const current = prev[normalizedCarrierId] ?? { catalogServiceIds: [], customServiceIds: [] };
      const bucketKey = service.source === 'custom' ? 'customServiceIds' : 'catalogServiceIds';
      const currentBucket = new Set(current[bucketKey]);
      if (currentBucket.has(serviceId)) currentBucket.delete(serviceId);
      else currentBucket.add(serviceId);

      return {
        ...prev,
        [normalizedCarrierId]: {
          ...current,
          [bucketKey]: Array.from(currentBucket),
        },
      };
    });
  };

  const isKnownPriceService = (service: CarrierDetailServiceItem) => {
    if (service.priceMode === 'NONE' || service.priceMode === 'FIXED') return true;
    return service.priceMode === 'QUOTE' && service.minPrice != null && service.maxPrice != null;
  };

  const getCarrierServiceItems = (carrierGroup: SelectedCarrierServices) =>
    carrierGroup.services.flatMap((group) => group.items);

  const areAllCarrierServicesSelected = (carrierGroup: SelectedCarrierServices) => {
    const services = getCarrierServiceItems(carrierGroup);
    return services.length > 0 && services.every((service) => isCarrierServiceSelected(carrierGroup.carrierId, service));
  };

  const toggleAllCarrierServices = (carrierGroup: SelectedCarrierServices) => {
    const services = getCarrierServiceItems(carrierGroup);
    const normalizedCarrierId = normalizeServiceId(carrierGroup.carrierId);
    const catalogIds = services.filter((service) => service.source !== 'custom').map((service) => normalizeServiceId(service.id));
    const customIds = services.filter((service) => service.source === 'custom').map((service) => normalizeServiceId(service.id));

    setRequestedServicesByCarrier((prev) => {
      const current = prev[normalizedCarrierId] ?? { catalogServiceIds: [], customServiceIds: [] };
      const allSelected = services.length > 0 && services.every((service) => {
        const bucket = service.source === 'custom' ? current.customServiceIds : current.catalogServiceIds;
        return bucket.includes(normalizeServiceId(service.id));
      });

      return {
        ...prev,
        [normalizedCarrierId]: allSelected
          ? {
              catalogServiceIds: current.catalogServiceIds.filter((id) => !catalogIds.includes(id)),
              customServiceIds: current.customServiceIds.filter((id) => !customIds.includes(id)),
            }
          : {
              catalogServiceIds: Array.from(new Set([...current.catalogServiceIds, ...catalogIds])),
              customServiceIds: Array.from(new Set([...current.customServiceIds, ...customIds])),
            },
      };
    });
  };

  const requestedCarrierServiceSummary = selectedCarrierServices
    .map((carrierGroup) => {
      const services = getCarrierServiceItems(carrierGroup)
        .filter((service) => isCarrierServiceSelected(carrierGroup.carrierId, service))
        .map((service) => service.name);
      return {
        carrierId: carrierGroup.carrierId,
        carrierName: carrierGroup.carrierName,
        services,
      };
    })
    .filter((row) => row.services.length > 0);

  const goToStepKeepingFormInView = (nextStep: Step) => {
    keepFormInViewOnStepChangeRef.current = true;
    setStep(nextStep);
  };

  useEffect(() => {
    if (!keepFormInViewOnStepChangeRef.current) return;
    keepFormInViewOnStepChangeRef.current = false;

    const frame = window.requestAnimationFrame(() => {
      const el = formShellRef.current;
      if (!el) return;

      const targetTop = Math.max(el.getBoundingClientRect().top + window.scrollY - 88, 0);
      if (window.scrollY > targetTop) {
        window.scrollTo({ top: targetTop, left: 0, behavior: 'auto' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const goNext = () => setStep((s) => {
    if (s >= 4) return s;
    keepFormInViewOnStepChangeRef.current = true;
    return (s + 1) as Step;
  });
  const goPrev = () => setStep((s) => {
    if (s <= 1) return s;
    keepFormInViewOnStepChangeRef.current = true;
    return (s - 1) as Step;
  });

  const handleGoToStep4 = () => goToStepKeepingFormInView(4);
  const handleGoToLoadDetail = () => goToStepKeepingFormInView(2);

  useEffect(() => {
    if (searchParams.get('calculator') === '1') {
      setIsVolumeCalculatorOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!altOptions.length && form.placeType) handleChange('placeType', '');
  }, [altOptions.length]);

  useEffect(() => {
    if (!form.originCity || !form.destinationCity) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    if (form.scope !== autoScope) setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
  }, [form.originCity, form.destinationCity]);

  useEffect(() => {
    let cancelled = false;
    const originCity = form.originCity;

    (async () => {
      if (originCity) {
        const list = await getDistrictsForCity(originCity);
        if (cancelled) return;
        setOriginDistricts(list);
        setForm((prev) => {
          if (prev.originCity !== originCity) return prev;
          if (!prev.originDistrict || list.includes(prev.originDistrict)) return prev;
          return { ...prev, originDistrict: '' };
        });
      } else {
        if (cancelled) return;
        setOriginDistricts([]);
        setForm((prev) => prev.originDistrict ? { ...prev, originDistrict: '' } : prev);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.originCity]);

  useEffect(() => {
    let cancelled = false;
    const destinationCity = form.destinationCity;

    (async () => {
      if (destinationCity) {
        const list = await getDistrictsForCity(destinationCity);
        if (cancelled) return;
        setDestinationDistricts(list);
        setForm((prev) => {
          if (prev.destinationCity !== destinationCity) return prev;
          if (!prev.destinationDistrict || list.includes(prev.destinationDistrict)) return prev;
          return { ...prev, destinationDistrict: '' };
        });
      } else {
        if (cancelled) return;
        setDestinationDistricts([]);
        setForm((prev) => prev.destinationDistrict ? { ...prev, destinationDistrict: '' } : prev);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.destinationCity]);

  // Tüm form verilerinden shipment payload'u üretir
  const buildShipmentPayload = () => {
    return buildShipmentPayloadFromForm(form, {
      phone,
      templateWeights: TEMPLATE_WEIGHTS,
    });
  };

  const getRequestedServicePayload = (carrierIds: string[]) => {
    const requested = carrierIds.map((carrierId) =>
      requestedServicesByCarrier[carrierId] ?? { catalogServiceIds: [], customServiceIds: [] }
    );
    return {
      catalogServiceIds: Array.from(new Set(requested.flatMap((item) => item.catalogServiceIds || []))),
      customServiceIds: Array.from(new Set(requested.flatMap((item) => item.customServiceIds || []))),
    };
  };

  const getRequestedCarrierServicesPayload = (carrierIds: string[]) => (
    carrierIds.reduce<RequestedCarrierServices>((acc, carrierId) => {
      acc[carrierId] = requestedServicesByCarrier[carrierId] ?? {
        catalogServiceIds: [],
        customServiceIds: [],
      };
      return acc;
    }, {})
  );

  // Profil telefonunu güncelle (opsiyonel, sadece numara yoksa)
  const savePhoneIfNeeded = async () => {
    if (needsPhone && phone.trim()) {
      await apiClient('/api/v1/customers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      }).catch(() => {});
      setNeedsPhone(false);
    }
  };

  // Talebi yayınla — nakliyeci seçmeden marketplace'e gönderir
  const publishRequest = async () => {
    if (submitting) return;
    if (!isLoggedIn) {
      try {
        await saveCurrentGuestDraft({ markIntent: true });
        setShowLoginModal(true);
      } catch {
        toast({
          title: 'Bilgileriniz kaydedilemedi',
          description: 'LÃ¼tfen tekrar deneyin.',
          variant: 'destructive',
        });
      }
      return;
    }
    if (!canPublish) {
      toast({
        title: publishValidation.title || 'Talep yayınlanamadı',
        description: publishValidation.message || 'Lütfen eksik bilgileri tamamlayın.',
        variant: 'destructive',
      });
      setShowSummaryModal(false);
      goToStepKeepingFormInView(publishValidation.targetStep);
      return;
      toast({ title: 'Yük detayı gerekli', description: 'Yayınlamadan önce yer tipi seçin veya Hacim Hesapla ile ağırlığı doldurun.', variant: 'destructive' });
      return;
    }
    if (needsPhone && !phone.trim()) {
      toast({ title: 'Telefon gerekli', description: 'Nakliyecilerin sizi arayabilmesi için telefon numarası gereklidir.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await savePhoneIfNeeded();
      const token = localStorage.getItem('authToken');
      const rawShipmentPayload = buildShipmentPayload();
      const carrierIdsToInvite = selectedCarrierIds.length > 0
        ? selectedCarrierIds.slice(0, 4)
        : inviteCarrierId
          ? [inviteCarrierId]
          : [];
      const requestedServicePayload = getRequestedServicePayload(carrierIdsToInvite);
      const requestedCarrierServices = getRequestedCarrierServicesPayload(carrierIdsToInvite);
      const shipmentPayload = {
        ...rawShipmentPayload,
        extraServices: requestedServicePayload.catalogServiceIds,
        customExtraServices: requestedServicePayload.customServiceIds,
        requestedCarrierServices,
        originPlaceType: normalizePlaceTypeForBackend(rawShipmentPayload.originPlaceType ?? rawShipmentPayload.placeType),
        destinationPlaceType: normalizePlaceTypeForBackend(rawShipmentPayload.destinationPlaceType ?? rawShipmentPayload.placeType),
      };
      const res = await fetch('/api/v1/shipments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(shipmentPayload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        const newShipmentId = json.data.id;

        if (carrierIdsToInvite.length > 0 && newShipmentId) {
          const inviteResults = await Promise.allSettled(carrierIdsToInvite.map((carrierId) =>
            apiClient(`/api/v1/shipments/${newShipmentId}/invite/${carrierId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requestedServices: requestedServicesByCarrier[carrierId] ?? {
                  catalogServiceIds: [],
                  customServiceIds: [],
                },
              }),
            })
          ));
          const sentCount = inviteResults.filter(result => result.status === 'fulfilled').length;
          if (sentCount > 0) {
            toast({
              title: `${sentCount} nakliyeciye teklif daveti gönderildi`,
              description: 'Firmalar talebinizi ve seçtiğiniz ek hizmetleri görüp teklif verebilir.',
            });
          } else {
            toast({
              title: 'Talep yayınlandı',
              description: 'Davetler gönderilemedi; talep yine de uygun nakliyecilere açık.',
              variant: 'destructive',
            });
          }
        } else {
          toast({ title: 'Talep yayınlandı!', description: 'Nakliyecilerden teklifler gelmeye başlayacak.' });
        }
        clearGuestOfferDraft();
        navigate('/ilanlarim');
      } else {
        console.error('Shipment create failed:', {
          status: res.status,
          response: json,
          payload: shipmentPayload,
        });
        toast({
          title: 'Talep oluşturulamadı',
          description: json?.message || 'Eksik veya geçersiz bir alan var.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Bağlantı Hatası', description: 'Sunucuya bağlanılamadı.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNextFrom1) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
    goNext();
  };
  const submitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    goNext();
  };

  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 400);
      return () => clearTimeout(t);
    }
  }, [step]);
  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 300);
      return () => clearTimeout(t);
    }
  }, [minRating, sortBy, suitableCarriersBase, step]);


  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  const handleAuthRedirect = async (target: 'login' | 'register') => {
    if (authRedirecting) return;
    setAuthRedirecting(target);
    try {
      await saveCurrentGuestDraft({ markIntent: true });
      const redirect = encodeURIComponent(getResumeReturnPath());
      const authPath = target === 'login'
        ? `/giris?redirect=${redirect}&reason=shipment-draft`
        : `/musteri-kayit?redirect=${redirect}&reason=shipment-draft`;
      navigate(authPath);
    } catch {
      setAuthRedirecting(null);
      toast({
        title: 'Bilgileriniz kaydedilemedi',
        description: 'LÃ¼tfen tekrar deneyin.',
        variant: 'destructive',
      });
    }
  };

  /* ── step data ── */
  const stepTitles: Record<number, string> = {
    1: 'Rota & Yük Türü',
    2: 'Yük Detayı',
    3: 'Uygun Nakliyeciler',
    4: 'Ek Hizmetler',
    5: 'Özet & Yayınla',
  };
  const stepSubtitles: Record<number, string> = {
    1: 'Çıkış, varış noktası, tarih ve yük türünü belirleyin',
    2: 'Yer, kat, hacim, fotoğraf ve notları tamamlayın',
    3: 'Firmaları inceleyin ve birden fazla nakliyeci seçin',
    4: 'Seçtiğiniz nakliyecilere özel hizmet tercihleri yapın',
    5: 'Bilgileri kontrol edin ve talebi yayınlayın',
  };
  /* ── step labels ── */
  const STEPS = [
    { id: 1, label: 'Rota & Yük Türü' },
    { id: 2, label: 'Yük Detayı' },
    { id: 3, label: 'Uygun Nakliyeciler' },
    { id: 4, label: 'Ek Hizmetler' },
    { id: 5, label: 'Özet & Yayınla' },
  ];

  /* ── transport types for step 2 grid ── */
  const TRANSPORT_CARDS: { value: string; Icon: LucideIcon; label: string }[] = [
    { value: 'evden-eve', Icon: Home, label: 'Ev Eşyası' },
    { value: 'ofis-tasima', Icon: Building2, label: 'Ofis' },
    { value: 'parca', Icon: Package, label: 'Parça Eşya' },
    { value: 'depolama', Icon: Archive, label: 'Depolama' },
  ];

  /* ── Kurumsal ortak stiller (token tabanlı) ── */
  const tb = {
    card: {
      background: 'var(--tb-surface)',
      border: '1px solid var(--tb-border)',
      borderRadius: 'var(--tb-radius)',
      boxShadow: 'var(--tb-shadow)',
      padding: '24px',
    } as React.CSSProperties,
    eyebrow: { fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--tb-ink-500)' } as React.CSSProperties,
    pageTitle: { fontSize: '24px', fontWeight: 700, color: 'var(--tb-brand-900)', letterSpacing: '-0.01em' } as React.CSSProperties,
    sectionLabel: { fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--tb-brand-700)' } as React.CSSProperties,
    label: { display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tb-ink-500)', marginBottom: '6px' } as React.CSSProperties,
    body: { fontSize: '14px', color: 'var(--tb-ink-900)' } as React.CSSProperties,
    caption: { fontSize: '12px', color: 'var(--tb-ink-500)' } as React.CSSProperties,
    input: {
      height: '40px', border: '1px solid var(--tb-ink-300)', borderRadius: 'var(--tb-radius-sm)',
      padding: '0 12px', fontSize: '14px', color: 'var(--tb-ink-900)', background: '#fff', width: '100%',
    } as React.CSSProperties,
    ctaPrimary: {
      background: 'var(--tb-brand-700)', color: '#fff', border: 'none', borderRadius: 'var(--tb-radius-sm)',
      padding: '11px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all 150ms',
    } as React.CSSProperties,
    ctaSecondary: {
      background: '#fff', color: 'var(--tb-ink-700)', border: '1px solid var(--tb-border)', borderRadius: 'var(--tb-radius-sm)',
      padding: '11px 22px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: '6px',
    } as React.CSSProperties,
    divider: { borderTop: '1px solid var(--tb-divider)' } as React.CSSProperties,
    shellCard: {
      background: 'var(--tb-surface)',
      border: '1px solid var(--tb-border)',
      borderRadius: 'var(--tb-radius)',
      boxShadow: 'var(--tb-shadow)',
      overflow: 'hidden',
    } as React.CSSProperties,
    surfaceBox: {
      background: 'var(--tb-canvas)',
      border: '1px solid var(--tb-border)',
      borderRadius: 'var(--tb-radius)',
    } as React.CSSProperties,
    infoBox: {
      background: 'var(--tb-brand-50)',
      border: '1px solid var(--tb-brand-50)',
      borderRadius: 'var(--tb-radius)',
      color: 'var(--tb-brand-700)',
    } as React.CSSProperties,
    successBox: {
      background: 'var(--tb-success-bg)',
      border: '1px solid var(--tb-success-border)',
      borderRadius: 'var(--tb-radius)',
      color: 'var(--tb-success)',
    } as React.CSSProperties,
    iconBadge: {
      width: '40px',
      height: '40px',
      borderRadius: '999px',
      background: 'var(--tb-brand-50)',
      color: 'var(--tb-brand-700)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: '16px',
      flexShrink: 0,
    } as React.CSSProperties,
    editLink: {
      fontSize: '13px',
      color: 'var(--tb-brand-600)',
      cursor: 'pointer',
      fontWeight: 600,
    } as React.CSSProperties,
    dangerText: { color: 'var(--tb-danger)' } as React.CSSProperties,
  };
  /* ── shared input style (geriye uyumlu alias) ── */
  const inputStyle = tb.input;
  const labelStyle = tb.label;
  const cardSel = (active: boolean): React.CSSProperties => ({
    border: active ? '2px solid var(--tb-brand-700)' : '1px solid var(--tb-border)',
    background: active ? 'var(--tb-brand-50)' : 'var(--tb-surface)',
    borderRadius: '10px',
    padding: '14px 8px',
    textAlign: 'center',
    cursor: 'pointer',
    minHeight: '104px',
    transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
    boxShadow: active ? '0 0 0 3px rgba(30,58,138,0.08)' : 'none',
  });
  const converterAppliedRows = getConverterAppliedSummary(appliedConverterSummary);

  return (
    <div className="offer-motion" style={{ background: 'var(--tb-canvas)', minHeight: '100vh' }}>

      {/*  PAGE HEADER STRIP  */}
      <div style={{
        background: 'var(--tb-surface)',
        borderBottom: '1px solid var(--tb-border)',
        padding: '0',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Breadcrumb + title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', padding: '20px 0 16px' }}>
            <div>
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Link to="/home" style={{ color: 'var(--tb-ink-400)', textDecoration: 'none' }}>Ana Sayfa</Link>
                <span style={{ color: 'var(--tb-ink-300)' }}>/</span>
                <span style={{ color: 'var(--tb-ink-700)', fontWeight: 500 }}>Taşıma Talebi Oluştur</span>
              </div>
              <div style={tb.eyebrow}>Taşıma Talebi Oluştur</div>
              <div style={{ ...tb.pageTitle, marginTop: '4px' }}>{stepTitles[displayStep]}</div>
              <div style={{ ...tb.caption, marginTop: '4px' }}>
                {!isLoggedIn
                  ? 'Üyelik gerekmez - giriş yalnızca yayınlama adımında istenir.'
                  : stepSubtitles[displayStep]}
              </div>
            </div>
            {/* Progress */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--tb-canvas)', borderRadius: 'var(--tb-radius)',
              padding: '8px 16px', border: '1px solid var(--tb-border)',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...tb.caption, marginBottom: '6px', fontWeight: 700, color: 'var(--tb-brand-700)' }}>Adım {displayStep}/5</div>
                <div style={{ width: '120px', height: '6px', borderRadius: '999px', background: 'var(--tb-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', borderRadius: '999px', background: 'var(--tb-brand-700)', transition: 'width 400ms ease' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ─── STEP INDICATOR ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderTop: '1px solid var(--tb-divider)' }}>
            {STEPS.map((st, i) => {
              const done = displayStep > st.id;
              const active = displayStep === st.id;
              const clickable = st.id < displayStep && st.id <= 4;
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '14px 0 12px',
                      borderBottom: active ? '3px solid var(--tb-brand-700)' : '3px solid transparent',
                      cursor: clickable ? 'pointer' : 'default',
                      transition: 'border-color 200ms',
                    }}
                    onClick={() => {
                      if (!clickable) return;
                      setShowSummaryModal(false);
                      goToStepKeepingFormInView(st.id as Step);
                    }}
                  >
                    {done ? (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--tb-brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check style={{ width: '12px', height: '12px', color: 'white' }} />
                      </div>
                    ) : active ? (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--tb-brand-50)', border: '2px solid var(--tb-brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'var(--tb-brand-700)', fontWeight: 800, fontSize: '12px' }}>{st.id}</span>
                      </div>
                    ) : (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--tb-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'var(--tb-ink-400)', fontWeight: 600, fontSize: '12px' }}>{st.id}</span>
                      </div>
                    )}
                    <span style={{
                      fontSize: '13px', fontWeight: active ? 700 : done ? 500 : 400,
                      color: active ? 'var(--tb-brand-900)' : done ? 'var(--tb-ink-700)' : 'var(--tb-ink-400)',
                      whiteSpace: 'nowrap',
                    }}>
                      {st.label}
                      {st.id === 5 && !isLoggedIn && (
                        <Lock style={{ width: '10px', height: '10px', marginLeft: '4px', verticalAlign: 'middle', color: 'var(--tb-ink-300)' }} />
                      )}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: '3px', borderRadius: '999px', background: displayStep > st.id ? 'var(--tb-brand-700)' : 'var(--tb-border)', margin: '0 14px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/*  MAIN CONTENT  */}
      <div className="offer-grid" style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 32px 64px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* ── LEFT: FORM CARD ── */}
        <div ref={formShellRef} style={tb.shellCard}>

          {/* ── STEP 1: ROTA + YÜK TÜRÜ ── */}
          {step === 1 && (
            <form onSubmit={submitStep1} style={{ padding: '32px' }}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--tb-divider)', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-600)', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>Rota & Yük Türü</div>
                  <div style={{ fontSize: '13px', color: 'var(--tb-ink-500)' }}>Çıkış, varış, tarih ve taşınacak yük türünü belirleyin</div>
                </div>
              </div>

              {/* Saved addresses quick-fill */}
              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'var(--tb-brand-50)', borderRadius: '10px', border: '1px solid var(--tb-brand-50)' }}>
                  <label style={{ ...labelStyle, color: 'var(--tb-brand-700)', marginBottom: '8px' }}>
                    <MapPin style={{ width: '14px', height: '14px', verticalAlign: '-2px', marginRight: '6px' }} />
                    Kayıtlı adreslerden çıkış noktası seç
                  </label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (!requireLoginForSelection()) return;
                      const addr = savedAddresses.find((a) => String(a.id) === val);
                      if (addr) {
                        handleChange('originCity', addr.city);
                        handleChange('originDistrict', addr.district);
                        handleChange('originAddressText', [addr.addressLine1, addr.addressLine2].filter(Boolean).join(' '));
                      }
                    }}
                  >
                    <SelectTrigger style={{ ...inputStyle, background: 'white' }}>
                      <SelectValue placeholder="Kayıtlı adres seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.label ? `${a.label} — ` : ''}{a.city}, {a.district}
                          {a.isDefault ? ' (Varsayılan)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Route grid: origin → arrow → destination */}
              <div className="grid items-end offer-route-grid" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '12px' }}>
                {/* Origin */}
                <div>
                  <div className="flex items-center" style={{ background: 'var(--tb-canvas)', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: 'var(--tb-ink-500)' }} />
                    <span style={tb.sectionLabel}>Çıkış Noktası</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Şehir <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                      <Select value={form.originCity} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('originCity', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>İlçe <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                      <Select value={form.originDistrict} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('originDistrict', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent>{originDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>Çıkış açık adres (mahalle, sokak, bina/blok, kat, daire)</label>
                      <Textarea
                        value={form.originAddressText}
                        maxLength={500}
                        placeholder="Örn: Atatürk Mah. 5. Sok. A Blok, Kat 5, Daire 12"
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('originAddressText', e.target.value);
                        }}
                        style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center offer-route-arrow" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', marginBottom: '4px' }}>
                  <ArrowRight style={{ width: '20px', height: '20px', color: 'var(--tb-brand-700)' }} />
                </div>

                {/* Destination */}
                <div>
                  <div className="flex items-center" style={{ background: 'var(--tb-canvas)', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: 'var(--tb-ink-500)' }} />
                    <span style={tb.sectionLabel}>Varış Noktası</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    {savedAddresses.length > 0 && (
                      <div>
                        <label style={{ ...labelStyle, color: 'var(--tb-brand-700)' }}>
                          <MapPin style={{ width: '14px', height: '14px', verticalAlign: '-2px', marginRight: '6px' }} />
                          Kayıtlı adreslerden varış noktası seç
                        </label>
                        <Select
                          value=""
                          onValueChange={(val) => {
                            if (!requireLoginForSelection()) return;
                            const addr = savedAddresses.find((a) => String(a.id) === val);
                            if (addr) {
                              handleChange('destinationCity', addr.city);
                              handleChange('destinationDistrict', addr.district);
                            }
                          }}
                        >
                          <SelectTrigger style={{ ...inputStyle, background: 'white' }}>
                            <SelectValue placeholder="Kayıtlı adres seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {savedAddresses.map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.label ? `${a.label} — ` : ''}{a.city}, {a.district}
                                {a.isDefault ? ' (Varsayılan)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>Şehir <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                      <Select value={form.destinationCity} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('destinationCity', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Şehir seçin" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>İlçe <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                      <Select value={form.destinationDistrict} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('destinationDistrict', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="İlçe seçin" /></SelectTrigger>
                        <SelectContent>{destinationDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>Varış açık adres (mahalle, sokak, bina/blok, kat, daire)</label>
                      <Textarea
                        value={form.destinationAddressText}
                        maxLength={500}
                        placeholder="Örn: Cumhuriyet Mah. B Blok, Kat 3, Daire 7"
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('destinationAddressText', e.target.value);
                        }}
                        style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start" style={{ gap: '8px', marginTop: '14px', padding: '12px', borderRadius: '10px', border: '1px solid var(--tb-brand-100)', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)', fontSize: '13px' }}>
                <Info style={{ width: '16px', height: '16px', marginTop: '2px', flex: '0 0 auto' }} />
                <span>Açık adres gizli kalır; sadece anlaştığınız nakliyeciye eşleşme sonrası gösterilir.</span>
              </div>

              {/* Date */}
              <div className="grid md:grid-cols-2" style={{ marginTop: '20px', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Taşıma Tarihi <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      type="date"
                      value={form.date}
                      min={todayStr}
                      max={maxDateStr}
                      onChange={(e) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('date', e.target.value);
                      }}
                      aria-invalid={isDateTooFar}
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Tarih Esnekliği</label>
                  <Select value={form.dateFlexibility} onValueChange={(v) => {
                    if (!requireLoginForSelection()) return;
                    handleChange('dateFlexibility', v);
                  }}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXACT">Tam bu tarih</SelectItem>
                      <SelectItem value="PLUS_MINUS_1_DAY">±1 gün esnek</SelectItem>
                      <SelectItem value="PLUS_MINUS_3_DAYS">±3 gün esnek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isDateTooFar && (
                  <div className="md:col-span-2" style={{ fontSize: '13px', color: 'var(--tb-danger)', marginTop: '-10px' }}>30 günden ileri bir tarihte gün seçemezsiniz.</div>
                )}
                {!isDateTooFar && (isCheckingAvailability || availabilitySummary) && (
                  <div className="md:col-span-2" style={{ fontSize: '13px', marginTop: '-10px' }}>
                    {isCheckingAvailability ? (
                      <span style={{ color: 'var(--tb-ink-500)' }}>Müsaitlik kontrol ediliyor...</span>
                    ) : availabilitySummary ? (
                      <span style={{ color: availabilitySummary.available > 0 ? 'var(--tb-success)' : 'var(--tb-danger)' }}>
                        {availabilitySummary.available} nakliyeci{form.originCity ? ` (${form.originCity} çıkışlı)` : ''} bu tarihte müsait görünüyor
                        {availabilitySummary.available === 0 && ' — başka bir tarih seçmeyi deneyin'}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Transport type cards */}
              <div style={{ marginTop: '20px' }}>
                <label style={labelStyle}>Yük Türü <span style={{ color: 'var(--tb-danger)' }}>*</span></label>
                <div className="grid offer-transport-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {TRANSPORT_CARDS.map(tc => {
                    const sel = form.transportType === tc.value;
                    const TransportIcon = tc.Icon;
                    return (
                      <div
                        key={tc.value}
                        onClick={() => {
                          if (!requireLoginForSelection()) return;
                          handleChange('transportType', tc.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          if (!requireLoginForSelection()) return;
                          handleChange('transportType', tc.value);
                        }}
                        className="cursor-pointer text-center transition-all duration-150 offer-focusable"
                        style={cardSel(sel)}
                        tabIndex={0}
                      >
                        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                          <TransportIcon style={{ width: '28px', height: '28px', color: sel ? 'var(--tb-brand-700)' : 'var(--tb-ink-900)' }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: sel ? 'var(--tb-brand-700)' : 'var(--tb-ink-700)' }}>{tc.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action bar */}
              <div className="flex justify-end" style={{ paddingTop: '24px', borderTop: '1px solid var(--tb-divider)', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={!canNextFrom1}
                  style={{ ...tb.ctaPrimary, background: canNextFrom1 ? 'var(--tb-brand-700)' : 'var(--tb-ink-400)', padding: '12px 32px', fontSize: '15px', cursor: canNextFrom1 ? 'pointer' : 'not-allowed' }}
                >
                  Devam →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: UYGUN NAKLİYECİLER ── */}
          {step === 3 && (
            <div style={{ padding: '32px' }}>
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--tb-divider)', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-600)', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>Uygun Nakliyeciler</div>
                  <div style={{ fontSize: '13px', color: 'var(--tb-ink-500)' }}>Firmaları inceleyin, birden fazla nakliyeci seçin veya açık ilan olarak devam edin</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px', padding: '14px 16px', background: 'var(--tb-canvas)', border: '1px solid var(--tb-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--tb-ink-700)' }}>
                Seçtiğiniz nakliyecilerin ek hizmetleri bir sonraki adımda gösterilir. Hiç seçim yapmadan devam ederseniz talep herkese açık ilan olarak yayınlanır.
              </div>

              <div style={{ marginBottom: '24px' }}>
                  <div className="flex flex-wrap items-end" style={{ gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                        <SelectTrigger style={{ ...inputStyle, width: '140px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="Min. Puan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Fark etmez</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger style={{ ...inputStyle, width: '180px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="Sırala" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">Puan (yüksek → düşük)</SelectItem>
                          <SelectItem value="reviews">Yorum sayısı</SelectItem>
                          <SelectItem value="capacity">Kapasite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setMinRating(0); setSortBy('rating'); }}
                      style={{ fontSize: '12px', color: 'var(--tb-brand-600)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Sıfırla
                    </button>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '14px 16px', background: selectedCarrierIds.length ? 'linear-gradient(135deg, var(--tb-success-bg) 0%, var(--tb-success-bg) 100%)' : 'var(--tb-canvas)', border: `1.5px solid ${selectedCarrierIds.length ? 'var(--tb-success-border)' : 'var(--tb-border)'}`, borderRadius: '14px', fontSize: '13px', color: selectedCarrierIds.length ? 'var(--tb-success)' : 'var(--tb-ink-700)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedCarrierIds.length > 0
                        ? <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--tb-success)', flexShrink: 0 }} />
                        : <Info style={{ width: '16px', height: '16px', color: 'var(--tb-ink-400)', flexShrink: 0 }} />
                      }
                      <span>
                        <strong>{selectedCarrierIds.length}</strong> nakliyeci seçildi.
                        {selectedCarrierIds.length === 0 ? ' Seçmeden devam ederseniz talep herkese açık olur.' : null}
                      </span>
                    </div>
                    {selectedCarriers.length > 0 && (
                      <div className="flex flex-wrap" style={{ gap: '6px' }}>
                        {selectedCarriers.map((carrier) => (
                          <span key={carrier.id} style={{ fontSize: '12px', background: 'var(--tb-success-bg)', color: 'var(--tb-success)', padding: '3px 10px', borderRadius: '999px', fontWeight: 700, border: '1px solid var(--tb-success-border)' }}>
                            {[carrier.name, carrier.surname].filter(Boolean).join(' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {loadingResults ? (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : suitableCarriers.length === 0 ? (
                    <div className="flex items-center" style={{ gap: '8px', padding: '20px', border: '1px dashed var(--tb-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--tb-ink-500)' }}>
                      <Info style={{ width: '16px', height: '16px' }} /> Bu çıkış şehri ve kriterlere uygun nakliyeci bulunamadı. Seçmeden devam ederek talebi herkese açabilirsiniz.
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {suitableCarriers.map((c) => (
                        <CarrierCard
                          key={c.id}
                          carrier={c}
                          form={form}
                          isSelected={selectedCarrierIds.includes(c.id)}
                          onToggleSelect={() => toggleCarrierSelection(c.id)}
                          onReview={() => setReviewCarrierId(c.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid var(--tb-divider)' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  style={tb.ctaSecondary}
                >
                  ← Geri
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  style={{ ...tb.ctaPrimary, padding: '12px 32px', fontSize: '15px' }}
                >
                  {selectedCarrierIds.length ? 'Seçimlerle devam →' : 'Hiç seçmeden devam et →'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: EK HİZMETLER ── */}
          {step === 4 && (
            <div style={{ padding: '32px' }}>
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--tb-divider)', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>Diğer Ek Hizmetler</div>
                  <div style={{ ...tb.caption }}>Seçtiğiniz nakliyecilerin katalog ve özel hizmetleri</div>
                </div>
              </div>

              {selectedCarrierIds.length === 0 ? (
                <div style={{ marginBottom: '24px', padding: '14px 16px', background: 'var(--tb-canvas)', border: '1px solid var(--tb-border)', borderRadius: '12px', fontSize: '13px', color: 'var(--tb-ink-700)' }}>
                  Nakliyeci seçmeden devam ediyorsunuz. Talep herkese açık yayınlanır; özel firma hizmeti seçimi yapılmaz.
                </div>
              ) : carrierServicesLoading ? (
                <div className="flex flex-col" style={{ gap: '10px', marginBottom: '24px' }}>
                  {[1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: '14px', marginBottom: '24px' }}>
                  {selectedCarrierServices.map((carrierGroup) => {
                    const allServices = getCarrierServiceItems(carrierGroup);
                    const serviceCount = allServices.length;
                    const expanded = expandedCarrierServices[carrierGroup.carrierId] ?? serviceCount <= 5;
                    const showAll = showAllCarrierServices[carrierGroup.carrierId] ?? false;
                    const allSelected = areAllCarrierServicesSelected(carrierGroup);
                    const selectedServices = allServices.filter(service => isCarrierServiceSelected(carrierGroup.carrierId, service));
                    const estimate = estimateServicesTotal(selectedServices);
                    const estimateText = estimate.min === estimate.max
                      ? `${estimate.avg.toLocaleString('tr-TR')} ₺`
                      : `~${estimate.avg.toLocaleString('tr-TR')} ₺ (${estimate.min.toLocaleString('tr-TR')}-${estimate.max.toLocaleString('tr-TR')} ₺)`;
                    const knownPriceServices = allServices.filter(isKnownPriceService);
                    const negotiableServices = allServices.filter(service => !isKnownPriceService(service));
                    const visibleKnownCount = showAll ? knownPriceServices.length : Math.min(knownPriceServices.length, 6);
                    const visibleKnownServices = knownPriceServices.slice(0, visibleKnownCount);
                    const visibleNegotiableServices = showAll
                      ? negotiableServices
                      : negotiableServices.slice(0, Math.max(0, 6 - visibleKnownServices.length));
                    const hiddenCount = serviceCount - visibleKnownServices.length - visibleNegotiableServices.length;

                    const renderServiceRow = (service: CarrierDetailServiceItem, compact = false) => {
                      const checked = isCarrierServiceSelected(carrierGroup.carrierId, service);
                      return (
                        <div
                          key={`${service.source}-${service.id}`}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => toggleCarrierService(carrierGroup.carrierId, service)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            toggleCarrierService(carrierGroup.carrierId, service);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: compact ? 'center' : 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            minHeight: '44px',
                            border: `1px solid ${checked ? 'var(--tb-brand-700)' : 'var(--tb-divider)'}`,
                            borderRadius: '12px',
                            padding: compact ? '10px 12px' : '12px 14px',
                            cursor: 'pointer',
                            background: checked ? 'var(--tb-brand-50)' : 'white',
                            transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
                            boxShadow: checked ? '0 0 0 3px rgba(30,58,138,0.06)' : 'none',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0 }}>
                            <span style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              flexShrink: 0,
                              marginTop: compact ? '0' : '1px',
                              background: checked ? 'var(--tb-brand-700)' : 'white',
                              border: `2px solid ${checked ? 'var(--tb-brand-700)' : 'var(--tb-ink-300)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {checked && <Check style={{ width: '11px', height: '11px', color: 'white' }} />}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '13px', fontWeight: checked ? 700 : 600, color: checked ? 'var(--tb-brand-900)' : 'var(--tb-ink-900)' }}>
                                {service.name}
                                {service.source === 'custom' && (
                                  <span style={{ fontSize: '10px', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)', padding: '1px 6px', borderRadius: '999px', fontWeight: 700, border: '1px solid var(--tb-brand-50)' }}>Özel</span>
                                )}
                              </span>
                              {!compact && service.description && (
                                <span style={{ display: 'block', fontSize: '12px', color: 'var(--tb-ink-500)', marginTop: '3px', lineHeight: 1.4 }}>{service.description}</span>
                              )}
                            </span>
                          </span>
                          {!compact && (
                            <span style={{
                              flexShrink: 0,
                              fontSize: '13px',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              color: checked ? 'var(--tb-brand-700)' : 'var(--tb-ink-900)',
                              background: checked ? 'white' : 'var(--tb-canvas)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${checked ? 'var(--tb-brand-600)' : 'var(--tb-border)'}`,
                            }}>
                              {formatServicePrice(service)}
                            </span>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div key={carrierGroup.carrierId} style={tb.shellCard}>
                        <button
                          type="button"
                          onClick={() => setExpandedCarrierServices(prev => ({ ...prev, [carrierGroup.carrierId]: !expanded }))}
                          style={{
                            width: '100%',
                            padding: '14px 18px',
                            border: 'none',
                            borderBottom: expanded ? '1px solid var(--tb-border)' : 'none',
                            background: 'var(--tb-canvas)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <span style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'var(--tb-brand-700)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '15px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              {carrierGroup.carrierName[0]?.toUpperCase() || 'N'}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: 'var(--tb-brand-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{carrierGroup.carrierName}</span>
                              <span style={{ display: 'block', fontSize: '12px', color: 'var(--tb-ink-500)', marginTop: '2px' }}>
                                {TRANSPORT_CARDS.find(t => t.value === form.transportType)?.label || 'Yük türü'} · {serviceCount} hizmet sunuyor
                              </span>
                            </span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            {serviceCount > 0 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleAllCarrierServices(carrierGroup);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== 'Enter' && event.key !== ' ') return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleAllCarrierServices(carrierGroup);
                                }}
                                style={{ ...tb.ctaSecondary, minHeight: '34px', padding: '7px 12px', fontSize: '12px', color: 'var(--tb-brand-700)', borderColor: 'var(--tb-brand-50)' }}
                              >
                                {allSelected ? 'Tümünü kaldır' : 'Tümünü seç'}
                              </span>
                            )}
                            <ChevronDown style={{ width: '18px', height: '18px', color: 'var(--tb-ink-500)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
                          </span>
                        </button>

                        {expanded && (
                          <div style={{ padding: '16px 18px' }}>
                            {serviceCount === 0 ? (
                              <p style={{ fontSize: '13px', color: 'var(--tb-ink-400)', margin: 0 }}>Bu nakliyeci ek hizmet tanımlamamış.</p>
                            ) : (
                              <div className="flex flex-col" style={{ gap: '16px' }}>
                                {visibleKnownServices.length > 0 && (
                                  <div>
                                    <div style={{ ...tb.sectionLabel, marginBottom: '8px' }}>Fiyatı belli hizmetler</div>
                                    <div className="flex flex-col" style={{ gap: '8px' }}>
                                      {visibleKnownServices.map((service) => renderServiceRow(service))}
                                    </div>
                                  </div>
                                )}

                                {visibleNegotiableServices.length > 0 && (
                                  <div>
                                    <div style={{ ...tb.sectionLabel, color: 'var(--tb-ink-400)', marginBottom: '8px' }}>Fiyatı görüşülür hizmetler</div>
                                    <div className="grid offer-service-compact-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                                      {visibleNegotiableServices.map((service) => renderServiceRow(service, true))}
                                    </div>
                                  </div>
                                )}

                                {hiddenCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllCarrierServices(prev => ({ ...prev, [carrierGroup.carrierId]: true }))}
                                    style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: 'var(--tb-brand-600)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                  >
                                    +{hiddenCount} hizmet daha göster
                                  </button>
                                )}

                                {showAll && serviceCount > 6 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllCarrierServices(prev => ({ ...prev, [carrierGroup.carrierId]: false }))}
                                    style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: 'var(--tb-ink-500)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                  >
                                    Daha az göster
                                  </button>
                                )}

                                {selectedServices.length > 0 && (
                                  <div style={{ ...tb.successBox, padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', alignItems: 'center' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--tb-success)' }}>
                                        <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                                        Bu nakliyeciden tahmini ek hizmet
                                      </span>
                                      <span style={{ fontWeight: 800, color: 'var(--tb-success)', fontSize: '15px' }}>{estimateText}</span>
                                    </div>
                                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--tb-success)' }}>
                                      Tahminidir; görüşülür kalemler dahil değil, kesin fiyat teklifte netleşir.
                                      {estimate.hasNegotiable && ' Görüşülür kalemler ayrıca konuşulur.'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid var(--tb-divider)' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[var(--tb-canvas)] transition-colors"
                  style={tb.ctaSecondary}
                >
                  ← Geri
                </button>
                <button
                  type="button"
                  disabled={isSummaryLoadingBlocked}
                  onClick={openSummaryStep}
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{
                    ...tb.ctaPrimary,
                    background: summaryValidation.valid ? 'var(--tb-brand-700)' : 'var(--tb-ink-400)',
                    padding: '12px 32px',
                    fontSize: '15px',
                    cursor: isSummaryLoadingBlocked ? 'not-allowed' : 'pointer',
                  }}
                >
                  Devam →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: YÜK DETAYI ── */}
          {step === 2 && (
            <form onSubmit={submitStep2} style={{ padding: '32px' }}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--tb-divider)', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-600)', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>Yük Detayı</div>
                  <div style={{ fontSize: '13px', color: 'var(--tb-ink-500)' }}>Yer, kat, hacim, ek hizmet ve notları tamamlayın</div>
                </div>
              </div>

              {/* Scope (auto) */}
              {form.scope && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Taşıma Kapsamı</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', background: 'var(--tb-canvas)', color: 'var(--tb-ink-500)', cursor: 'default' }}>
                    {form.scope === 'sehirici' ? 'Şehir İçi' : form.scope === 'sehirlerarasi' ? 'Şehirlerarası' : '-'}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--tb-ink-400)' }}>(otomatik)</span>
                  </div>
                </div>
              )}

              {/* Detail fields – 2col grid */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {altOptions.length > 0 && (
                  <div>
                    <label style={labelStyle}>Yer Tipi (opsiyonel)</label>
                    <Select value={form.placeType} onValueChange={(v) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('placeType', v);
                    }}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>{altOptions.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                    </Select>
                    {(!form.placeType || form.placeType.includes('Diğer') || form.placeType.includes('Emin')) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireLoginForSelection()) return;
                          setIsVolumeCalculatorOpen(true);
                        }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--tb-brand-600)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '6px', textAlign: 'left' }}
                      >
                        Ev tipinizden emin değil misiniz? 30 saniyede hacim hesaplayalım →
                      </button>
                    )}
                  </div>
                )}
                {form.transportType === 'parca' && (
                  <div>
                    <label style={labelStyle}>Yük Türü (opsiyonel)</label>
                    <Select value={form.loadType} onValueChange={(v) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('loadType', v);
                    }}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                      <SelectContent>{Object.entries(LOAD_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Tahmini Ağırlık (kg)</label>
                  {form.weightKg && !weightEditMode ? (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="text-sm text-slate-700">
                        ~{form.weightKg} kg
                        <span className="text-xs text-slate-400 ml-1.5">
                          {appliedConverterSummary ? 'Hacim Hesapla tahmini' : 'tahmini'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setWeightEditMode(true)}
                        className="text-xs font-semibold text-blue-600"
                      >
                        Düzenle
                      </button>
                    </div>
                  ) : form.weightKg && weightEditMode ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={form.weightKg}
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('weightKg', e.target.value);
                        }}
                        placeholder="Örn. 1200"
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setWeightEditMode(false)}
                        className="text-xs font-semibold text-slate-500"
                      >
                        Bitti
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireLoginForSelection()) return;
                        setIsVolumeCalculatorOpen(true);
                      }}
                      className="w-full rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2.5 text-left text-sm font-semibold text-blue-600"
                    >
                      Hacim Hesapla ile tahmini ağırlığı otomatik doldurun →
                    </button>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Çıkış Katı</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.floor}
                    onChange={(e) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('floor', e.target.value);
                    }}
                    placeholder="Örn. 3"
                    style={inputStyle}
                  />
                  {form.floor && (
                    <label className="flex items-center cursor-pointer" style={{ gap: '8px', marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        checked={form.hasElevator}
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('hasElevator', e.target.checked);
                        }}
                        style={{ accentColor: 'var(--tb-brand-600)', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--tb-ink-700)' }}>Çıkış Asansörü Var</span>
                    </label>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Varış Katı</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.destinationFloor}
                    onChange={(e) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('destinationFloor', e.target.value);
                    }}
                    placeholder="Örn. 5"
                    style={inputStyle}
                  />
                  {form.destinationFloor && (
                    <label className="flex items-center cursor-pointer" style={{ gap: '8px', marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        checked={form.destinationHasElevator}
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('destinationHasElevator', e.target.checked);
                        }}
                        style={{ accentColor: 'var(--tb-brand-600)', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--tb-ink-700)' }}>Varış Asansörü Var</span>
                    </label>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Zaman Tercihi</label>
                  <Select value={form.timeWindow} onValueChange={(v) => {
                    if (!requireLoginForSelection()) return;
                    handleChange('timeWindow', v);
                  }}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sabah">Sabah (08:00-12:00)</SelectItem>
                      <SelectItem value="ogle">Öğlen (12:00-17:00)</SelectItem>
                      <SelectItem value="aksam">Akşam (17:00-22:00)</SelectItem>
                      <SelectItem value="farketmez">Fark etmez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid var(--tb-brand-50)', borderRadius: '10px', background: 'var(--tb-brand-50)' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tb-brand-700)' }}>
                      Eşyalarınızın hacmini bilmiyor musunuz
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--tb-ink-700)' }}>
                      30 saniyede hacim ve yaklaşık ağırlık hesaplayalım; araç önerisini nakliyeciye bilgi olarak saklayalım.
                    </div>
                  </div>
                  <Button type="button" onClick={() => {
                    if (!requireLoginForSelection()) return;
                    setIsVolumeCalculatorOpen(true);
                  }}>
                    Hacmi Hesapla
                  </Button>
                </div>
              </div>

              {/* Photos */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Fotoğraf (opsiyonel)</label>
                <FileUpload
                  label="Eşyaların Fotoğrafları"
                  description="Daha doğru teklif için fotoğraf ekleyin. (JPG/PNG, max 5MB)"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  maxSize={5}
                  uploadedFiles={form.photos as any}
                  onUpload={(files) => handleChange('photos', files as any)}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Açıklama (opsiyonel)</label>
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Örn. hassas eşyalar var, 3. kat, vs."
                  style={{ minHeight: '80px', border: '1px solid var(--tb-border)', borderRadius: '10px', padding: '12px 14px', resize: 'vertical', fontSize: '14px' }}
                  className="focus:border-[var(--tb-brand-600)] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.1)]"
                />
              </div>

              {availabilityHint && (
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--tb-brand-50)', borderRadius: '12px', background: 'var(--tb-brand-50)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-brand-700)', marginBottom: '6px' }}>
                    Talebiniz yayına hazır
                  </div>
                  {availabilityHint.carrierCount > 0 ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>
                        {availabilityHint.carrierCount} nakliyeci bu tarihte müsait
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--tb-ink-700)', marginTop: '6px' }}>
                        Talebinizi yayınladığınızda uygun nakliyeciler size teklif gönderir.
                        Gelen teklifleri karşılaştırıp en uygununu seçebilirsiniz.
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--tb-ink-700)', marginTop: '6px' }}>
                      Talebinizi yayınladığınızda uygun nakliyeciler teklif gönderecek.
                      Farklı bir tarih seçmek daha fazla teklif almanızı sağlayabilir.
                    </p>
                  )}
                </div>
              )}

              {!isLoggedIn && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                  <Info style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    Talebinizi yayınlamak için giriş yapmanız gerekir. Girdiğiniz bilgiler kaybolmaz; giriş sonrası kaldığınız yerden devam edebilirsiniz.
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid var(--tb-divider)' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[var(--tb-canvas)] transition-colors"
                  style={tb.ctaSecondary}
                >
                  ← Geri
                </button>
                <button
                  type="submit"
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ ...tb.ctaPrimary, padding: '12px 32px', fontSize: '15px' }}
                >
                  Devam →
                </button>
              </div>

            </form>
          )}

          {/* ── STEP 5: ÖZET & YAYINLA MODAL ── */}
          <AnimatePresence>
          {showSummaryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6"
              style={{ background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(5px)' }}
            >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Özet ve yayınla"
              style={{ position: 'relative', width: 'min(960px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: 'white', borderRadius: '18px', boxShadow: '0 24px 72px rgba(15,23,42,0.28)' }}
            >
            <div className={showLoginModal ? 'pointer-events-none blur-sm' : ''} aria-hidden={showLoginModal} style={{ padding: '32px' }}>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                aria-label="Özeti kapat"
                style={{ position: 'absolute', top: '18px', right: '18px', width: '34px', height: '34px', border: '1px solid var(--tb-border)', borderRadius: '10px', background: 'white', color: 'var(--tb-ink-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid var(--tb-divider)', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-600)', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>5</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>Özet & Yayınla</div>
                  <div style={{ fontSize: '13px', color: 'var(--tb-ink-500)' }}>Bilgileri kontrol edin</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--tb-warning-bg)', border: '1px solid var(--tb-warning-border)', borderRadius: '12px', color: 'var(--tb-warning)', fontSize: '13px', lineHeight: 1.5 }}>
                {CONTACT_SAFETY_WARNING}
              </div>

              {/* Summary cards – 2 col */}
              <div className="grid offer-summary-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Rota Bilgileri */}
                <div style={{ ...tb.surfaceBox, padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink-500)', marginBottom: '16px' }}>Rota Bilgileri</div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tb-ink-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREDEN</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tb-ink-900)', marginTop: '2px' }}>
                      {form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''}
                    </div>
                    {form.originAddressText && (
                      <div style={{ fontSize: '12px', color: 'var(--tb-ink-500)', marginTop: '6px', lineHeight: 1.45 }}>
                        {form.originAddressText}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center" style={{ margin: '12px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--tb-border)' }} />
                    <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--tb-brand-50)', margin: '0 8px' }}>
                      <ArrowRight style={{ width: '14px', height: '14px', color: 'var(--tb-brand-700)' }} />
                    </div>
                    <div style={{ flex: 1, height: '1px', background: 'var(--tb-border)' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tb-ink-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREYE</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tb-ink-900)', marginTop: '2px' }}>
                      {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}
                    </div>
                    {form.destinationAddressText && (
                      <div style={{ fontSize: '12px', color: 'var(--tb-ink-500)', marginTop: '6px', lineHeight: 1.45 }}>
                        {form.destinationAddressText}
                      </div>
                    )}
                  </div>

                  {form.date && (
                    <div style={{ borderTop: '1px solid var(--tb-border)', paddingTop: '14px', marginTop: '14px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>
                        <CalendarDays style={{ width: '14px', height: '14px', verticalAlign: '-2px', marginRight: '6px' }} />
                        {formatCalendarDate(form.date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Yük Detayları */}
                <div style={{ ...tb.surfaceBox, padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink-500)', marginBottom: '16px' }}>Yük Detayları</div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    {form.transportType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Taşıma Tipi</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>
                          {TRANSPORT_CARDS.find(t => t.value === form.transportType)?.label || form.transportType}
                        </span>
                      </div>
                    )}
                    {form.scope && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Kapsam</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>{form.scope === 'sehirici' ? 'Şehir İçi' : 'Şehirlerarası'}</span>
                      </div>
                    )}
                    {form.placeType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Yer Türü</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>{form.placeType}</span>
                      </div>
                    )}
                    {!form.weightKg && form.placeType && !appliedConverterSummary && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Ağırlık</span>
                        <span style={{ fontSize: '13px', color: 'var(--tb-ink-400)', fontStyle: 'italic' }}>
                          "{form.placeType}" için tahmini
                        </span>
                      </div>
                    )}
                    {form.floor && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Kat</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>{form.floor}. kat {form.hasElevator ? '(asansörlü)' : ''}</span>
                      </div>
                    )}
                    {form.timeWindow && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)' }}>Zaman</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tb-ink-900)' }}>{form.timeWindow}</span>
                      </div>
                    )}
                    {/* Extra services chips */}
                    {(() => {
                      const svcGroup = ({'evden-eve': 'evden-eve', 'parca': 'parca', 'ofis-tasima': 'ofis', 'depolama': 'depolama'} as Record<string, string>)[form.transportType];
                      const selected = svcGroup ? (form.serviceOptions?.[svcGroup] || []) : [];
                      const allOpts = new Map(availableExtraServices.map((option) => [option.id, option.name]));
                      if (!selected.length) return null;
                      return (
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)', display: 'block', marginBottom: '6px' }}>Ek Hizmetler</span>
                          <div className="flex flex-wrap" style={{ gap: '4px' }}>
                            {selected.map((k: string) => (
                              <span key={k} style={{ background: 'var(--tb-divider)', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: 'var(--tb-ink-700)' }}>
                                {allOpts.get(k) || k}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {form.note && (
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--tb-ink-500)', display: 'block', marginBottom: '2px' }}>Not</span>
                        <span style={{ fontSize: '13px', color: 'var(--tb-ink-900)' }}>{form.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {converterAppliedRows.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--tb-success-bg)', border: '1px solid var(--tb-success-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-success)', marginBottom: '6px' }}>Hacim hesaplayıcı forma uygulandı</div>
                  <div className="flex flex-wrap" style={{ gap: '6px' }}>
                    {converterAppliedRows.map((row) => (
                      <span key={row} style={{ background: 'white', border: '1px solid var(--tb-success-border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: 'var(--tb-success)' }}>
                        {row}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {requestedCarrierServiceSummary.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'var(--tb-canvas)', border: '1px solid var(--tb-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink-700)', marginBottom: '10px' }}>Nakliyeciye özel ek hizmetler</div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    {requestedCarrierServiceSummary.map((row) => (
                      <div key={row.carrierId} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)', minWidth: '150px' }}>{row.carrierName}</span>
                        <span className="flex flex-wrap justify-end" style={{ gap: '6px' }}>
                          {row.services.map((serviceName) => (
                            <span key={`${row.carrierId}-${serviceName}`} style={{ background: 'white', border: '1px solid var(--tb-border)', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', color: 'var(--tb-ink-700)' }}>
                              {serviceName}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite banner */}
              {inviteCarrierId && inviteCarrierName && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--tb-brand-50)', border: '1px solid var(--tb-brand-50)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center" style={{ gap: '8px', fontSize: '13px', color: 'var(--tb-brand-700)' }}>
                    <UserCheck style={{ width: '16px', height: '16px' }} />
                    <span><strong>{inviteCarrierName}</strong> bu talebe öncelikli davet edilecek</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCarrierIds(prev => inviteCarrierId ? prev.filter(id => id !== inviteCarrierId) : prev);
                      setInviteCarrierId(null);
                      setInviteCarrierName(null);
                    }}
                    style={{ fontSize: '12px', color: 'var(--tb-brand-600)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Kaldır
                  </button>
                </div>
              )}

              {/* Phone — her zaman göster; profil varsa pre-fill, yoksa gerekli */}
              <div style={{ marginBottom: '20px', padding: '16px', background: needsPhone ? 'var(--tb-warning-bg)' : 'var(--tb-canvas)', border: `1px solid ${needsPhone ? 'var(--tb-warning-border)' : 'var(--tb-border)'}`, borderRadius: '12px' }}>
                <div className="flex items-center" style={{ gap: '8px', marginBottom: '10px' }}>
                  <Phone style={{ width: '16px', height: '16px', color: needsPhone ? 'var(--tb-warning)' : 'var(--tb-ink-500)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: needsPhone ? 'var(--tb-warning)' : 'var(--tb-ink-700)' }}>
                    {needsPhone ? 'Telefon numaranızı ekleyin' : 'İletişim numarası'}
                  </span>
                </div>
                {needsPhone && (
                  <p style={{ fontSize: '13px', color: 'var(--tb-warning)', marginBottom: '10px' }}>
                    Nakliyecilerin sizi arayabilmesi için telefon numarası gereklidir.
                  </p>
                )}
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  style={{ ...inputStyle, background: 'white' }}
                />
                {!needsPhone && (
                  <p style={{ fontSize: '12px', color: 'var(--tb-ink-400)', marginTop: '6px' }}>
                    Profilinizdeki numara kullanılıyor. Bu talep için farklı bir numara girebilirsiniz.
                  </p>
                )}
              </div>

              {/* Edit links */}
              <div className="flex" style={{ gap: '16px', marginTop: '8px', marginBottom: '24px' }}>
                <span onClick={() => { setShowSummaryModal(false); goToStepKeepingFormInView(1); }} className="hover:underline" style={{ fontSize: '13px', color: 'var(--tb-brand-600)', cursor: 'pointer' }}> Adım 1'i Düzenle</span>
                <span onClick={() => { setShowSummaryModal(false); goToStepKeepingFormInView(2); }} className="hover:underline" style={{ fontSize: '13px', color: 'var(--tb-brand-600)', cursor: 'pointer' }}> Adım 2'yi Düzenle</span>
                <span onClick={() => { setShowSummaryModal(false); goToStepKeepingFormInView(3); }} className="hover:underline" style={{ fontSize: '13px', color: 'var(--tb-brand-600)', cursor: 'pointer' }}> Adım 3'ü Düzenle</span>
              </div>

              {/* Action bar */}
              <div className="flex justify-end items-center" style={{ paddingTop: '24px', borderTop: '1px solid var(--tb-divider)' }}>
                <button
                  type="button"
                  disabled={submitting}
                  className="inline-flex items-center hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: 'var(--tb-brand-600)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', gap: '8px', transition: 'all 150ms' }}
                  onClick={publishRequest}
                >
                  {submitting ? (
                    <><Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> Yayınlanıyor...</>
                  ) : !isLoggedIn ? (
                    <><LogIn style={{ width: '16px', height: '16px' }} /> Giriş yap ve yayınla</>
                  ) : (
                    <><Check style={{ width: '16px', height: '16px' }} /> Talebi Yayınla</>
                  )}
                </button>
              </div>
            </div>
            </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: STICKY SIDEBAR ── */}
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Order Summary Card */}
          <div style={tb.shellCard}>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--tb-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>Talep Özeti</span>
              <span style={{ fontSize: '12px', color: 'var(--tb-brand-600)', fontWeight: 600, background: 'var(--tb-brand-50)', padding: '2px 8px', borderRadius: '6px' }}>Adım {displayStep}/5</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Route */}
              {(form.originCity || form.destinationCity) ? (
                <div style={{ padding: '12px 14px', ...tb.surfaceBox }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tb-ink-400)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Güzergah</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {form.originCity || '—'}{form.originDistrict ? `, ${form.originDistrict}` : ''}
                      </div>
                    </div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--tb-brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowRight style={{ width: '11px', height: '11px', color: 'var(--tb-brand-600)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {form.destinationCity || '—'}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}
                      </div>
                    </div>
                  </div>
                  {form.date && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--tb-ink-500)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CalendarDays style={{ width: '13px', height: '13px' }} />
                      {formatCalendarDate(form.date)}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px 14px', background: 'var(--tb-canvas)', border: '1px dashed var(--tb-border)', borderRadius: 'var(--tb-radius)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tb-ink-300)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--tb-ink-400)' }}>Güzergah seçilmedi</span>
                </div>
              )}

              {/* Load type */}
              {form.transportType ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', ...tb.surfaceBox }}>
                  <span style={{ fontSize: '20px' }}>
                    {(() => {
                      const SelectedTransportIcon = TRANSPORT_CARDS.find(t => t.value === form.transportType).Icon || Package;
                      return <SelectedTransportIcon style={{ width: '20px', height: '20px', color: 'var(--tb-ink-900)' }} />;
                    })()}
                  </span>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--tb-ink-500)', marginBottom: '1px' }}>Taşıma türü</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>
                      {TRANSPORT_CARDS.find(t => t.value === form.transportType)?.label || form.transportType}
                    </div>
                  </div>
                  {form.scope && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: 'var(--tb-brand-600)', background: 'var(--tb-brand-50)', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      {form.scope === 'sehirici' ? 'Şehir İçi' : 'Şehirlerarası'}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: 'var(--tb-canvas)', border: '1px dashed var(--tb-border)', borderRadius: 'var(--tb-radius)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tb-ink-300)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--tb-ink-400)' }}>Yük türü seçilmedi</span>
                </div>
              )}

              {/* Weight / place type */}
              {(form.weightKg || form.placeType) && (
                <div style={{ padding: '10px 14px', ...tb.surfaceBox, fontSize: '13px', color: 'var(--tb-ink-700)' }}>
                  {form.placeType && <div style={{ fontWeight: 600, marginBottom: form.weightKg ? '4px' : 0 }}>{form.placeType}</div>}
                  {form.weightKg && <div style={{ color: 'var(--tb-ink-500)' }}>~{Number(form.weightKg).toLocaleString('tr-TR')} kg tahmini</div>}
                </div>
              )}

              {/* Selected carriers */}
              {selectedCarrierIds.length > 0 && (
                <div style={{ padding: '10px 14px', ...tb.successBox, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 style={{ width: '15px', height: '15px', color: 'var(--tb-success)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-success)' }}>{selectedCarrierIds.length} nakliyeci seçildi</span>
                </div>
              )}

              {/* Publish CTA */}
              {step === 4 && (
                <>
                  {!isLoggedIn && (
                    <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                      <Info style={{ width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                      <span>Yayınlamak için giriş gerekir. Bilgileriniz kaybolmaz.</span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isSummaryLoadingBlocked}
                    onClick={openSummaryStep}
                    style={{
                      width: '100%', padding: '14px', border: 'none', borderRadius: 'var(--tb-radius)',
                      background: summaryValidation.valid ? 'var(--tb-brand-700)' : 'var(--tb-ink-400)',
                      color: 'white', fontSize: '15px', fontWeight: 700,
                      cursor: isSummaryLoadingBlocked ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <Check style={{ width: '16px', height: '16px' }} /> Özet ve Yayınla
                  </button>
                </>
              )}

            </div>
          </div>

          {/* Trust Badges Card */}
          <div style={{ ...tb.shellCard, padding: '18px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { Icon: ShieldCheck, title: 'Güvenli Platform', desc: 'Tüm iletişim platform üzerinden' },
                { Icon: Zap, title: 'Hızlı Teklifler', desc: 'Ortalama 2-4 saat içinde' },
                { Icon: Megaphone, title: 'Ücretsiz İlan', desc: 'Yayınlamak tamamen ücretsiz' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Icon style={{ width: '20px', height: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px', color: 'var(--tb-brand-600)' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>{title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--tb-ink-500)', marginTop: '1px' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Login Required Modal */}
      <AnimatePresence>
        {showLoginModal && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative', background: 'white',
                borderRadius: '20px', maxWidth: '420px', width: '100%',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              {/* Top gradient bar */}
              <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--tb-brand-600) 0%, var(--tb-brand-700) 100%)' }} />

              <div style={{ padding: '32px 32px 28px', textAlign: 'center' }}>
                <button
                  onClick={closeLoginModal}
                  style={{
                    position: 'absolute', right: '16px', top: '20px',
                    background: 'var(--tb-divider)', border: 'none', borderRadius: '8px',
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: 'var(--tb-ink-500)',
                  }}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                </button>

                {/* Icon */}
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, var(--tb-brand-50) 0%, var(--tb-brand-50) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 10px rgba(37,99,235,0.05)',
                }}>
                  <Lock style={{ width: '30px', height: '30px', color: 'var(--tb-brand-600)' }} />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--tb-ink-900)', margin: '0 0 8px' }}>
                  Devam etmek için giriş yapın
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--tb-ink-500)', margin: 0, lineHeight: 1.6 }}>
                  Girdiğiniz bilgiler kaydedildi. Giriş yaptıktan sonra kaldığınız yerden devam edeceksiniz.
                </p>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => handleAuthRedirect('login')}
                    disabled={Boolean(authRedirecting)}
                    style={{
                      width: '100%', padding: '13px', border: 'none', borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--tb-brand-600) 0%, var(--tb-brand-700) 100%)',
                      color: 'white', fontSize: '15px', fontWeight: 700, cursor: authRedirecting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    }}
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => handleAuthRedirect('register')}
                    disabled={Boolean(authRedirecting)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px',
                      border: '1.5px solid var(--tb-border)', background: 'white',
                      color: 'var(--tb-ink-700)', fontSize: '15px', fontWeight: 600, cursor: authRedirecting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Üye Ol
                  </button>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--tb-ink-400)', marginTop: '16px' }}>
                  Girişten önce bilgileriniz yerel olarak saklanır.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={Boolean(reviewCarrierId)} onOpenChange={(open) => { if (!open) setReviewCarrierId(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg p-0">
          {reviewCarrierLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : !reviewCarrierDetail ? (
            <div className="p-6">
              <div style={{ borderRadius: '16px', border: '1px dashed var(--tb-border)', padding: '32px', textAlign: 'center' }}>
                <AlertCircle style={{ width: '32px', height: '32px', margin: '0 auto 8px', color: 'var(--tb-ink-400)' }} />
                <p style={{ fontSize: '14px', color: 'var(--tb-ink-500)', margin: 0 }}>Nakliyeci detayı yüklenemedi.</p>
              </div>
            </div>
          ) : (
            <div>
              {/* ── Profile header ── */}
              <div style={{
                background: 'linear-gradient(135deg, var(--tb-ink-900) 0%, var(--tb-brand-700) 100%)',
                padding: '28px 24px 24px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* decorative circles */}
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '16px', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--tb-brand-600) 0%, var(--tb-brand-700) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: 800, color: 'white',
                      boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
                      border: '2px solid rgba(255,255,255,0.15)',
                    }}>
                      {reviewCarrierDetail.companyName[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: '0 0 4px', lineHeight: 1.25 }}>
                        {reviewCarrierDetail.companyName}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                        {[reviewCarrierDetail.city, reviewCarrierDetail.district].filter(Boolean).join(', ') || 'Konum belirtilmemiş'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewCarrierId(null)}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                      width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.1)', borderRadius: '10px',
                    padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <Star style={{ width: '14px', height: '14px', color: 'var(--tb-rating)', fill: 'var(--tb-rating)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>
                      {reviewCarrierDetail.rating.count > 0 ? reviewCarrierDetail.rating.average : '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                      ({reviewCarrierDetail.rating.count} yorum)
                    </span>
                  </div>
                  {reviewCarrierDetail.serviceAreas.slice(0, 3).map((area) => (
                    <span key={area} style={{
                      background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                      padding: '6px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.75)',
                      border: '1px solid rgba(255,255,255,0.1)', fontWeight: 500,
                    }}>
                      {area}
                    </span>
                  ))}
                  {reviewCarrierDetail.serviceAreas.length > 3 && (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', alignSelf: 'center' }}>
                      +{reviewCarrierDetail.serviceAreas.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Content body ── */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Vehicles */}
                <div style={{ border: '1px solid var(--tb-border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--tb-canvas)', borderBottom: '1px solid var(--tb-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--tb-brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Info style={{ width: '14px', height: '14px', color: 'var(--tb-brand-600)' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>Araç Parkı</span>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {reviewCarrierDetail.vehicles.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--tb-ink-400)', margin: 0 }}>Araç bilgisi girilmemiş.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reviewCarrierDetail.vehicles.map((vehicle) => (
                          <div key={vehicle.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 14px', borderRadius: '10px',
                            background: 'var(--tb-canvas)', border: '1px solid var(--tb-divider)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--tb-brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                <Truck style={{ width: '16px', height: '16px', color: 'var(--tb-brand-600)' }} />
                              </div>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>{vehicle.typeName}</span>
                            </div>
                            <span style={{
                              fontSize: '13px', fontWeight: 700, color: 'var(--tb-brand-600)',
                              background: 'var(--tb-brand-50)', padding: '3px 10px', borderRadius: '8px',
                              border: '1px solid var(--tb-brand-50)',
                            }}>
                              {vehicle.capacityKg ? `${vehicle.capacityKg.toLocaleString('tr-TR')} kg` : 'Kapasite belirtilmemiş'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Services */}
                <div style={{ border: '1px solid var(--tb-border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--tb-canvas)', borderBottom: '1px solid var(--tb-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--tb-brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award style={{ width: '14px', height: '14px', color: 'var(--tb-brand-700)' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>Ek Hizmetler</span>
                    {reviewCarrierDetail.services.length > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '12px', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                        {reviewCarrierDetail.services.reduce((s, g) => s + g.items.length, 0)} hizmet
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {!reviewCarrierDetail.services.length ? (
                      <p style={{ fontSize: '13px', color: 'var(--tb-ink-400)', margin: 0 }}>Bu nakliyeci ek hizmet tanımlamamış.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reviewCarrierDetail.services.map((group) => (
                          <div key={group.loadType}>
                            <div style={{
                              fontSize: '11px', fontWeight: 700, color: 'var(--tb-brand-700)',
                              textTransform: 'uppercase', letterSpacing: '0.08em',
                              marginBottom: '8px', paddingBottom: '6px',
                              borderBottom: '1px solid var(--tb-divider)',
                            }}>
                              {formatCarrierServiceLoadType(group.loadType)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {group.items.map((service) => (
                                <div
                                  key={`${service.source}-${service.id}`}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    gap: '12px', padding: '10px 12px', borderRadius: '10px',
                                    background: 'var(--tb-canvas)', border: '1px solid var(--tb-divider)',
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink-900)' }}>{service.name}</span>
                                      {service.source === 'custom' && (
                                        <span style={{ fontSize: '10px', background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)', padding: '1px 6px', borderRadius: '999px', fontWeight: 700, border: '1px solid var(--tb-brand-50)' }}>özel</span>
                                      )}
                                    </div>
                                    {service.description && (
                                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--tb-ink-500)' }}>{service.description}</p>
                                    )}
                                  </div>
                                  <span style={{
                                    flexShrink: 0, fontSize: '13px', fontWeight: 700,
                                    color: 'var(--tb-brand-600)', whiteSpace: 'nowrap',
                                    background: 'var(--tb-brand-50)', padding: '3px 8px', borderRadius: '8px',
                                    border: '1px solid var(--tb-brand-50)',
                                  }}>
                                    {formatCarrierServicePrice(service)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { if (reviewCarrierId) toggleCarrierSelection(reviewCarrierId); }}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      border: 'none', borderRadius: '12px', padding: '12px 16px',
                      cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                      background: reviewCarrierId && selectedCarrierIds.includes(reviewCarrierId)
                        ? 'linear-gradient(135deg, var(--tb-success) 0%, var(--tb-success) 100%)'
                        : 'linear-gradient(135deg, var(--tb-brand-600) 0%, var(--tb-brand-700) 100%)',
                      color: 'white',
                      boxShadow: reviewCarrierId && selectedCarrierIds.includes(reviewCarrierId)
                        ? '0 4px 14px rgba(5,150,105,0.35)'
                        : '0 4px 14px rgba(37,99,235,0.35)',
                    }}
                  >
                    {reviewCarrierId && selectedCarrierIds.includes(reviewCarrierId) ? (
                      <><Check style={{ width: '16px', height: '16px' }} /> Seçildi</>
                    ) : (
                      <><Check style={{ width: '16px', height: '16px' }} /> Bu nakliyeciyi seç</>
                    )}
                  </button>
                  {reviewCarrierId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/nakliyeciler/${reviewCarrierId}`)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        border: '1px solid var(--tb-border)', borderRadius: '12px', padding: '12px 16px',
                        background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                        color: 'var(--tb-ink-700)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Eye style={{ width: '15px', height: '15px' }} />
                      Profil
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <VolumeCalculatorModal
        open={isVolumeCalculatorOpen}
        onOpenChange={setIsVolumeCalculatorOpen}
        onApplyEstimate={applyConverterEstimateToForm}
        loadType={currentExtraServiceLoadType}
        initialValues={converterInitialValues}
        draftValues={converterDraftValues}
        onDraftChange={setConverterDraftValues}
        applyLabel="Bu bilgileri talebime ekle"
      />
    </div>
  );
}

function SummaryCard({ step, form, onEditStep }: { step: Step; form: any; onEditStep: (s: Step) => void }) {
  const routeReady = form.originCity && form.destinationCity && form.date;
  const prefsReady = (!!form.scope) && !!form.transportType && (form.placeType || form.loadType || form.weightKg);
  const summaryGroupKey = (() => {
    const map: Record<string, string> = {
      'evden-eve': 'evden-eve',
      'parca': 'parca',
      'sehirlerarasi': 'sehirlerarasi',
      'sehirici': 'sehirici',
      'ofis-tasima': 'ofis',
      'depolama': 'depolama',
    };
    return map[form.transportType] || '';
  })();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seçimler Özeti</CardTitle>
        <CardDescription>Adımlar arası hızlı kontrol</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Rota</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(1)}>Düzenle</Button>
          </div>
          <div className="text-gray-700">
            {routeReady ? (
              <div>
                <div>{form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''} → {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}</div>
                <div className="text-xs text-gray-500">Tarih: {form.date || '-'}</div>
              </div>
            ) : (
              <div className="text-gray-400">Henüz doldurulmadı</div>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Yük & Tercihler</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(2)}>Düzenle</Button>
          </div>
          <div className="text-gray-700 space-y-1">
            {prefsReady ? (
              <>
                <div>Taşıma Kapsamı: {form.scope === 'sehirici' ? 'Şehir İçi' : form.scope === 'sehirlerarasi' ? 'Şehirlerarası' : '-'}</div>
                <div>Taşıma Tipi: {form.transportType || '-'}</div>
                {form.placeType && <div>Yer Türü: {form.placeType}</div>}
                {form.loadType && <div>Yük Türü: {LOAD_TYPES[form.loadType as keyof typeof LOAD_TYPES]}</div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.hasElevator && <Badge variant="secondary">Bina asansörü</Badge>}
                  {form.timeWindow && <Badge variant="secondary">Zaman: {form.timeWindow}</Badge>}
                  {summaryGroupKey && (
                    <Badge variant="secondary">
                      {SPECIAL_SERVICES[summaryGroupKey] || summaryGroupKey}
                      {Array.isArray(form.serviceOptions?.[summaryGroupKey]) ? ` (${form.serviceOptions[summaryGroupKey].length})` : ''}
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-400">Henüz doldurulmadı</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CARRIER_SERVICE_LOAD_LABELS: Record<string, string> = {
  HOME: 'Ev eşyası',
  OFFICE: 'Ofis taşıma',
  PARTIAL: 'Parça eşya',
  STORAGE: 'Depolama',
};

function formatCarrierServiceLoadType(loadType: string) {
  return CARRIER_SERVICE_LOAD_LABELS[loadType] ?? loadType;
}

function formatCarrierServicePrice(service: CarrierDetailServiceItem) {
  return formatServicePrice(service);
}

function CarrierCard({
  carrier,
  form,
  isSelected,
  onToggleSelect,
  onReview,
}: {
  carrier: Carrier;
  form: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onReview: () => void;
}) {
  const weight = Number(form.weightKg || 0);
  const capacityEvaluable = weight > 0 && carrier.vehicle.capacity > 0;
  const capacityOk = !capacityEvaluable || carrier.vehicle.capacity >= weight;
  const selectedExtraServices = Array.isArray(form.extraServices) ? form.extraServices : [];
  const insuranceNeeded = form.extras.sigorta
    || selectedExtraServices.includes('Ek sigorta')
    || selectedExtraServices.includes('Kurumsal sigorta');
  const hasInsurance = (carrier.badges || []).some((b) => ['Sigorta', 'Soğuk Zincir'].includes(b));
  const insuranceOk = !insuranceNeeded || hasInsurance;
  const normalizeCity = (value: string | null) => (value || '').trim().toLocaleLowerCase('tr-TR');
  const matchesCity = (candidate: string | null, target: string | null) => {
    if (!candidate || !target) return false;
    return normalizeCity(candidate) === normalizeCity(target);
  };
  const originMatch = !form.originCity
    || matchesCity(carrier.city, form.originCity)
    || (carrier.serviceAreas || []).some((area) => matchesCity(area, form.originCity));
  const destinationMatch = !form.destinationCity
    || matchesCity(carrier.city, form.destinationCity)
    || (carrier.serviceAreas || []).some((area) => matchesCity(area, form.destinationCity));
  const routeLabel = originMatch && destinationMatch
    ? 'Tam rota uygun'
    : originMatch
      ? 'Çıkış uygun'
      : 'Çıkış uygun değil';
  const routeScope: 'sehirici' | 'sehirlerarasi' | '' = form.originCity && form.destinationCity
    ? (form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi')
    : (form.scope || '');
  const scopeOk = !routeScope || (carrier.scopes || []).includes(routeScope);
  const wantsPackaging = form.extras.ambalaj
    || selectedExtraServices.includes('Profesyonel Paketleme')
    || selectedExtraServices.includes('Ambalajlama');
  const hasPackaging = (carrier.badges || []).some((b) => ['Profesyonel', 'Altın Taşıyıcı'].includes(b));
  const extrasOk = (!wantsPackaging || hasPackaging) && (!form.extras.sigorta || hasInsurance);
  const allCompatible = originMatch && scopeOk && (capacityOk || !capacityEvaluable) && insuranceOk && extrasOk;
  const selectBtn = (selected: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    border: 'none',
    borderRadius: 'var(--tb-radius-sm)',
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    background: selected ? 'var(--tb-success)' : 'var(--tb-brand-700)',
    color: 'white',
    boxShadow: selected ? '0 2px 8px rgba(22,163,74,0.24)' : '0 2px 8px rgba(30,58,138,0.24)',
    transition: 'all 150ms',
  });

  const compatChips = [
    { ok: originMatch, label: routeLabel },
    { ok: scopeOk, label: 'Kapsam uygun' },
    ...(capacityEvaluable
      ? [{ ok: capacityOk, label: capacityOk ? 'Kapasite yeterli' : `Kapasite yetersiz (${carrier.vehicle.capacity.toLocaleString('tr-TR')} kg)` }]
      : []),
    { ok: insuranceOk, label: 'Sigorta uygun' },
    { ok: extrasOk, label: 'Ekler uyumlu' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        border: isSelected ? '2px solid var(--tb-brand-700)' : '1px solid var(--tb-border)',
        borderRadius: 'var(--tb-radius)',
        background: isSelected ? 'var(--tb-brand-50)' : 'var(--tb-surface)',
        boxShadow: isSelected
          ? '0 0 0 4px rgba(30,58,138,0.08), 0 4px 20px rgba(30,58,138,0.12)'
          : 'var(--tb-shadow)',
        overflow: 'hidden',
        transition: 'box-shadow 200ms, border-color 200ms',
      }}
    >
      {/* Top accent bar when selected */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'var(--tb-brand-700)',
        }} />
      )}

      <div style={{ padding: isSelected ? '20px 18px 16px' : '16px 18px' }}>
        {/* ── Header row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          {/* Left: Avatar + identity */}
          <div style={{ display: 'flex', gap: '13px', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {carrier.pictureUrl ? (
                <img
                  src={carrier.pictureUrl}
                  alt={carrier.name}
                  style={{ width: '54px', height: '54px', borderRadius: '14px', objectFit: 'cover', border: '1px solid var(--tb-border)' }}
                />
              ) : (
                <div style={{
                  width: '54px', height: '54px', borderRadius: '14px',
                  background: isSelected ? 'var(--tb-brand-700)' : 'var(--tb-brand-50)',
                  border: isSelected ? 'none' : '1px solid var(--tb-border)',
                  color: isSelected ? 'white' : 'var(--tb-brand-700)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: 800,
                  boxShadow: isSelected ? '0 4px 12px rgba(30,58,138,0.22)' : 'var(--tb-shadow)',
                }}>
                  {carrier.name[0].toUpperCase()}
                </div>
              )}
              {carrier.isApproved && (
                <div style={{
                  position: 'absolute', bottom: '-4px', right: '-4px',
                  background: 'var(--tb-success)', borderRadius: '50%',
                  width: '20px', height: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2.5px solid white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                }}>
                  <CheckCircle2 style={{ width: '11px', height: '11px', color: 'white' }} />
                </div>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '5px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tb-ink-900)', letterSpacing: '-0.2px', lineHeight: 1.25 }}>
                  {carrier.name} {carrier.surname}
                </span>
                {carrier.isApproved && (
                  <span style={{
                    fontSize: '11px', background: 'var(--tb-success-bg)', color: 'var(--tb-success)',
                    padding: '2px 8px', borderRadius: '999px', fontWeight: 700,
                    border: '1px solid var(--tb-success-border)',
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}>
                    <Shield style={{ width: '9px', height: '9px' }} /> Onaylı Nakliyeci
                  </span>
                )}
              </div>
              {carrier.reviewCount > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ display: 'flex', gap: '1.5px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        style={{
                          width: '12px', height: '12px',
                          color: s <= Math.round(carrier.rating) ? 'var(--tb-rating)' : 'var(--tb-border)',
                          fill: s <= Math.round(carrier.rating) ? 'var(--tb-rating)' : 'var(--tb-border)',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tb-ink-900)' }}>{carrier.rating}</span>
                  <span style={{ fontSize: '12px', color: 'var(--tb-ink-400)' }}>({carrier.reviewCount} değerlendirme)</span>
                </div>
              ) : (
                <span style={{
                  display: 'inline-block', fontSize: '11px', background: 'var(--tb-canvas)',
                  color: 'var(--tb-ink-500)', padding: '2px 8px', borderRadius: '6px',
                  border: '1px solid var(--tb-border)', fontWeight: 500,
                }}>Yeni firma - henüz değerlendirme yok</span>
              )}
            </div>
          </div>

          {/* Right: Vehicle badge */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              background: isSelected ? 'var(--tb-brand-50)' : 'var(--tb-canvas)',
              border: `1px solid ${isSelected ? 'var(--tb-brand-600)' : 'var(--tb-border)'}`,
              borderRadius: '12px', padding: '8px 12px', textAlign: 'center', minWidth: '82px',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 800, color: isSelected ? 'var(--tb-brand-700)' : 'var(--tb-ink-700)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {carrier.vehicle.type}
              </div>
              {carrier.vehicle.capacity > 0 && (
                <div style={{ fontSize: '11px', color: isSelected ? 'var(--tb-brand-600)' : 'var(--tb-ink-500)', marginTop: '2px', fontWeight: 600 }}>
                  {carrier.vehicle.capacity.toLocaleString('tr-TR')} kg
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Service areas ── */}
        {carrier.serviceAreas.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
            <MapPin style={{ width: '12px', height: '12px', color: 'var(--tb-ink-400)', marginRight: '1px' }} />
            {carrier.serviceAreas.slice(0, 4).map((area) => (
              <span key={area} style={{
                fontSize: '12px', background: 'var(--tb-canvas)',
                border: '1px solid var(--tb-border)', color: 'var(--tb-ink-700)',
                padding: '2px 8px', borderRadius: '6px', fontWeight: 500,
              }}>
                {area}
              </span>
            ))}
            {carrier.serviceAreas.length > 4 && (
              <span style={{ fontSize: '12px', color: 'var(--tb-ink-400)', fontWeight: 500 }}>+{carrier.serviceAreas.length - 4}</span>
            )}
          </div>
        )}

        {/* ── Compatibility chips ── */}
        <div style={{
          display: 'flex', gap: '5px', flexWrap: 'wrap',
          marginTop: '12px', paddingTop: '12px',
          borderTop: '1px solid var(--tb-divider)',
        }}>
          {compatChips.map(({ ok, label }) => (
            <span
              key={label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '999px',
                background: ok ? 'var(--tb-success-bg)' : 'var(--tb-danger-bg)',
                color: ok ? 'var(--tb-success)' : 'var(--tb-danger)',
                border: `1px solid ${ok ? 'var(--tb-success-border)' : 'var(--tb-danger-border)'}`,
              }}
            >
              {ok ? <CheckCircle2 style={{ width: '10px', height: '10px' }} /> : <XCircle style={{ width: '10px', height: '10px' }} />}
              {label}
            </span>
          ))}
        </div>

        {/* ── Footer action bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '14px', paddingTop: '13px',
          borderTop: '1px solid var(--tb-divider)',
        }}>
          <div>
            {allCompatible ? (
              <span style={{ fontSize: '12px', color: 'var(--tb-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                Tüm kriterler uygun
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--tb-ink-400)' }}>
                {carrier.reviewCount > 0 ? `${carrier.rating} puan · ${carrier.reviewCount} yorum` : 'Henüz yorum yok'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReview(); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                border: '1px solid var(--tb-border)', borderRadius: 'var(--tb-radius-sm)',
                padding: '8px 14px', background: 'var(--tb-surface)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink-700)',
                boxShadow: 'var(--tb-shadow)',
                transition: 'all 150ms',
                minHeight: '40px',
              }}
            >
              <Eye style={{ width: '13px', height: '13px' }} />
              İncele
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              style={{ ...selectBtn(isSelected), minHeight: '40px' }}
            >
              {isSelected
                ? <><Check style={{ width: '13px', height: '13px' }} /> Seçildi</>
                : 'Seç'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Backend search response → Carrier shape dönüşümü ────────────────────────

function parseVehicleSummary(summary: string | null): { type: Carrier['vehicle']['type']; capacity: number } {
  if (!summary) return { type: 'kamyonet', capacity: 0 };
  const match = summary.match(/^(\w+)\s*\((\d+)kg\)/i);
  if (match) {
    const rawType = match[1].toLowerCase();
    const typeMap: Record<string, Carrier['vehicle']['type']> = {
      kamyonet: 'kamyonet', kamyon: 'kamyon', tir: 'tir',
      panelvan: 'panelvan', panel: 'panelvan',
    };
    return { type: typeMap[rawType] ?? 'kamyonet', capacity: parseInt(match[2], 10) };
  }
  return { type: 'kamyonet', capacity: 0 };
}

function mapSearchResultToCarrier(item: {
  id: string; companyName: string; city: string | null;
  rating: number; reviewCount: number; vehicleSummary: string | null;
  serviceAreas: string[]; startingPrice: number | null;
  experienceYears: number | null; profileCompletion: number | null;
  isVerified: boolean;
  catalogExtraServiceIds: string[];
  scopes: Array<'sehirici' | 'sehirlerarasi'>;
  pictureUrl: string | null;
}): Carrier {
  const { type: vehicleType, capacity } = parseVehicleSummary(item.vehicleSummary);
  const nameParts = item.companyName.trim().split(/\s+/);
  return {
    id: item.id,
    name: nameParts[0] ?? item.companyName,
    surname: nameParts.slice(1).join(' '),
    email: '',
    phone: '',
    city: item.city ?? '',
    type: 'carrier',
    createdAt: new Date(),
    vehicle: { id: '', type: vehicleType, capacity, licensePlate: '' },
    serviceAreas: item.serviceAreas ?? [],
    loadTypes: [],
    documents: { license: '', src: '', kBelgesi: '' },
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    isApproved: item.isVerified === true,
    baseFee: item.startingPrice ?? 0,
    badges: [],
    catalogExtraServiceIds: item.catalogExtraServiceIds ?? [],
    scopes: item.scopes ?? [],
    pictureUrl: item.pictureUrl,
  };
}
