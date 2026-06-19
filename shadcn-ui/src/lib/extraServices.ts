export type ExtraServiceLoadType = 'HOME' | 'OFFICE' | 'PARTIAL' | 'STORAGE';
export type TransportType = 'evden-eve' | 'ofis-tasima' | 'parca' | 'depolama' | '';

export interface ExtraServiceOption {
  id: string;
  name: string;
  description?: string | null;
  loadType: ExtraServiceLoadType;
  isDefaultVisible: boolean;
  isRecommendedByConverter: boolean;
  sortOrder: number;
}

export type ServicePrice = {
  priceMode: 'NONE' | 'FIXED' | 'QUOTE' | string | null;
  basePrice?: number | null;
  fixedPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
};

const formatTry = (value: number) => `${value.toLocaleString('tr-TR')} ₺`;

export function formatServicePrice(service: ServicePrice): string {
  if (service.priceMode === 'NONE') return 'Ücretsiz';

  if (service.priceMode === 'FIXED') {
    const price = Number(service.basePrice ?? service.fixedPrice ?? 0);
    return Number.isFinite(price) && price > 0 ? formatTry(price) : 'Sabit fiyat';
  }

  if (service.priceMode === 'QUOTE') {
    if (service.minPrice != null && service.maxPrice != null) {
      const min = Number(service.minPrice);
      const max = Number(service.maxPrice);
      if (Number.isFinite(min) && Number.isFinite(max)) {
        const avg = Math.round((min + max) / 2);
        return `~${formatTry(avg)} (${formatTry(min)}-${formatTry(max)})`;
      }
    }
    return 'Görüşülür';
  }

  return 'Görüşülür';
}

export function estimateServicesTotal(selected: ServicePrice[]): {
  avg: number;
  min: number;
  max: number;
  hasNegotiable: boolean;
} {
  let avg = 0;
  let min = 0;
  let max = 0;
  let hasNegotiable = false;

  for (const service of selected) {
    if (service.priceMode === 'FIXED') {
      const price = Number(service.basePrice ?? service.fixedPrice ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;
      avg += price;
      min += price;
      max += price;
    } else if (service.priceMode === 'QUOTE') {
      if (service.minPrice != null && service.maxPrice != null) {
        const quoteMin = Number(service.minPrice);
        const quoteMax = Number(service.maxPrice);
        if (!Number.isFinite(quoteMin) || !Number.isFinite(quoteMax)) {
          hasNegotiable = true;
          continue;
        }
        avg += Math.round((quoteMin + quoteMax) / 2);
        min += quoteMin;
        max += quoteMax;
      } else {
        hasNegotiable = true;
      }
    }
  }

  return { avg, min, max, hasNegotiable };
}

export const EXTRA_SERVICE_DESCRIPTIONS: Record<string, string> = {
  'Asansörlü Taşıma': 'Yüksek katlara dış cephe asansörüyle güvenli taşıma',
  'Profesyonel Paketleme': 'Eşyalarınızın uzman ekipçe paketlenmesi',
  'Montaj/Demontaj': 'Mobilyaların sökülüp yeni adreste kurulması',
  'Geçici depolama': 'Taşıma sürecinde kısa süreli güvenli saklama',
  'Piyano Taşıma': 'Piyano gibi hassas/ağır eşyalar için özel ekipman',
  'Ambalajlama': 'Kırılabilir eşyalar için özel ambalaj malzemesi',
  'Beyaz Eşya Kurulumu': 'Buzdolabı/çamaşır makinesi bağlantı ve kurulumu',
  'Ek sigorta': 'Eşyalarınız için ek teminat/sigorta kapsamı',
  'Hafta sonu teslimat': 'Cumartesi/Pazar taşıma imkanı',
  'Kat arası taşıma': 'Aynı bina içinde katlar arası eşya taşıma',
  'Server/IT özel taşıma': 'Sunucu/IT ekipmanının özel koşullarda taşınması',
  'Kablo etiketleme': 'Kabloların sökerken etiketlenip yeniden kurulumu',
  'Kurumsal sigorta': 'Kurumsal taşımalar için kapsamlı sigorta',
  'İklim kontrollü saklama': 'Sıcaklık/nem kontrollü depo ortamı',
  'Sigortalı depolama': 'Depolanan eşyalar için sigorta kapsamı',
  'Raf/palet düzeni': 'Eşyaların raf/palet sisteminde düzenli saklanması',
  'Envanter listesi ve etiketleme': 'Depolanan eşyaların listelenip etiketlenmesi',
};

const TRANSPORT_TO_LOAD_TYPE: Record<Exclude<TransportType, ''>, ExtraServiceLoadType> = {
  'evden-eve': 'HOME',
  'ofis-tasima': 'OFFICE',
  parca: 'PARTIAL',
  depolama: 'STORAGE',
};

export function getExtraServiceLoadType(transportType: TransportType): ExtraServiceLoadType | null {
  return transportType ? TRANSPORT_TO_LOAD_TYPE[transportType] : null;
}

export function reconcileSelectedExtraServiceIds(
  selectedIds: string[],
  validOptions: ExtraServiceOption[],
): { keptIds: string[]; removedIds: string[] } {
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];
  const validIds = new Set(validOptions.map((option) => option.id));
  const keptIds: string[] = [];
  const removedIds: string[] = [];

  for (const id of safeSelectedIds) {
    if (validIds.has(id)) {
      keptIds.push(id);
    } else {
      removedIds.push(id);
    }
  }

  return { keptIds, removedIds };
}

export function mergeSuggestedExtraServiceIds(
  selectedIds: string[],
  suggestedIds: string[] | undefined,
  validOptions: ExtraServiceOption[],
): string[] {
  const validIds = new Set(validOptions.map((option) => option.id));
  const merged = new Set(selectedIds);

  for (const id of suggestedIds ?? []) {
    if (validIds.has(id)) {
      merged.add(id);
    }
  }

  return Array.from(merged);
}

export function mapSelectedExtraServiceNames(
  selectedIds: string[],
  validOptions: ExtraServiceOption[],
): string[] {
  const optionMap = new Map(validOptions.map((option) => [option.id, option.name]));
  return selectedIds.map((id) => optionMap.get(id)).filter(Boolean) as string[];
}
