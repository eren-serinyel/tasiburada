import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';
import { ShipmentCategory } from '../../../domain/entities/Shipment';

export type ExtraServiceApplicabilitySeed = {
  name: string;
  loadType: ExtraServiceLoadType;
  isDefaultVisible: boolean;
  isRecommendedByConverter: boolean;
  sortOrder: number;
};

type ExtraServiceDefinition = {
  name: string;
  loadTypes: ExtraServiceLoadType[];
  isRecommendedByConverter?: boolean;
};

const EXTRA_SERVICE_DEFINITIONS: ExtraServiceDefinition[] = [
  { name: 'Asansörlü Taşıma', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE], isRecommendedByConverter: true },
  { name: 'Profesyonel Paketleme', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL], isRecommendedByConverter: true },
  { name: 'Montaj/Demontaj', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE] },
  { name: 'Geçici depolama', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE] },
  { name: 'Piyano Taşıma', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.PARTIAL] },
  { name: 'Ambalajlama', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL] },
  { name: 'Beyaz Eşya Kurulumu', loadTypes: [ExtraServiceLoadType.HOME] },
  { name: 'Server/IT özel taşıma', loadTypes: [ExtraServiceLoadType.OFFICE], isRecommendedByConverter: true },
  { name: 'Kablo etiketleme', loadTypes: [ExtraServiceLoadType.OFFICE] },
  { name: 'Kurumsal sigorta', loadTypes: [ExtraServiceLoadType.OFFICE] },
  { name: 'Ek sigorta', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL, ExtraServiceLoadType.STORAGE] },
  { name: 'Hafta sonu teslimat', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE, ExtraServiceLoadType.PARTIAL, ExtraServiceLoadType.STORAGE] },
  { name: 'Kat arası taşıma', loadTypes: [ExtraServiceLoadType.HOME, ExtraServiceLoadType.OFFICE], isRecommendedByConverter: true },
];

export const EXTRA_SERVICE_CATALOG = EXTRA_SERVICE_DEFINITIONS.map((item) => item.name);

export const EXTRA_SERVICE_APPLICABILITY_SEED: ExtraServiceApplicabilitySeed[] = EXTRA_SERVICE_DEFINITIONS.flatMap((item) =>
  item.loadTypes.map((loadType, index) => ({
    name: item.name,
    loadType,
    isDefaultVisible: true,
    isRecommendedByConverter: Boolean(item.isRecommendedByConverter),
    sortOrder: index + 1,
  })),
);

export const EXTRA_SERVICE_NAME_ALIASES: Record<string, string> = {
  asansor: 'Asansörlü Taşıma',
  asansör: 'Asansörlü Taşıma',
  paketleme: 'Profesyonel Paketleme',
  profesyonelpaket: 'Profesyonel Paketleme',
  ambalaj: 'Ambalajlama',
  ambalajlama: 'Ambalajlama',
  koli: 'Ambalajlama',
  soktak: 'Montaj/Demontaj',
  mobilya_montaj: 'Montaj/Demontaj',
  montaj: 'Montaj/Demontaj',
  beyaz_esya_montaj: 'Beyaz Eşya Kurulumu',
  beyazesyakurulum: 'Beyaz Eşya Kurulumu',
  depolama: 'Geçici depolama',
  server: 'Server/IT özel taşıma',
  serverit: 'Server/IT özel taşıma',
  kabloetiket: 'Kablo etiketleme',
  kurumsalsigorta: 'Kurumsal sigorta',
  sigorta: 'Ek sigorta',
  eksigorta: 'Ek sigorta',
  haftasonu: 'Hafta sonu teslimat',
  piyano: 'Piyano Taşıma',
  kattasima: 'Kat arası taşıma',
  'Asansörlü Taşıma': 'Asansörlü Taşıma',
  'Profesyonel Paketleme': 'Profesyonel Paketleme',
  'Montaj/Demontaj': 'Montaj/Demontaj',
  'Depolama': 'Geçici depolama',
  'Geçici depolama': 'Geçici depolama',
  'Piyano Taşıma': 'Piyano Taşıma',
  'Ambalajlama': 'Ambalajlama',
  'Beyaz Eşya Kurulumu': 'Beyaz Eşya Kurulumu',
  'Server/IT özel taşıma': 'Server/IT özel taşıma',
  'Kablo etiketleme': 'Kablo etiketleme',
  'Kurumsal sigorta': 'Kurumsal sigorta',
  'Ek sigorta': 'Ek sigorta',
  'Hafta sonu teslimat': 'Hafta sonu teslimat',
  'Kat arası taşıma': 'Kat arası taşıma',
};

export function inferExtraServiceLoadTypeFromTransportType(transportType?: string | null): ExtraServiceLoadType | null {
  const normalized = String(transportType ?? '').trim().toLowerCase();

  if (normalized === 'evden-eve' || normalized === 'home') return ExtraServiceLoadType.HOME;
  if (normalized === 'ofis-tasima' || normalized === 'office') return ExtraServiceLoadType.OFFICE;
  if (normalized === 'parca' || normalized === 'partial') return ExtraServiceLoadType.PARTIAL;
  if (normalized === 'depolama' || normalized === 'storage') return ExtraServiceLoadType.STORAGE;

  return null;
}

export function inferExtraServiceLoadTypeFromShipmentCategory(category?: ShipmentCategory | string | null): ExtraServiceLoadType | null {
  switch (category) {
    case ShipmentCategory.HOME_MOVE:
      return ExtraServiceLoadType.HOME;
    case ShipmentCategory.OFFICE_MOVE:
      return ExtraServiceLoadType.OFFICE;
    case ShipmentCategory.PARTIAL_ITEM:
      return ExtraServiceLoadType.PARTIAL;
    case ShipmentCategory.STORAGE:
      return ExtraServiceLoadType.STORAGE;
    default:
      return null;
  }
}

export function inferShipmentCategoryFromTransportType(transportType?: string | null): ShipmentCategory | null {
  const loadType = inferExtraServiceLoadTypeFromTransportType(transportType);

  switch (loadType) {
    case ExtraServiceLoadType.HOME:
      return ShipmentCategory.HOME_MOVE;
    case ExtraServiceLoadType.OFFICE:
      return ShipmentCategory.OFFICE_MOVE;
    case ExtraServiceLoadType.PARTIAL:
      return ShipmentCategory.PARTIAL_ITEM;
    case ExtraServiceLoadType.STORAGE:
      return ShipmentCategory.STORAGE;
    default:
      return null;
  }
}
