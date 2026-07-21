import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';
import { ShipmentCategory } from '../../../domain/entities/Shipment';

export type ExtraServiceCatalogEntry = {
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
};

export type ExtraServiceApplicabilitySeed = {
  code: string;
  name: string;
  loadType: ExtraServiceLoadType;
  isDefaultVisible: boolean;
  isRecommendedByConverter: boolean;
  sortOrder: number;
};

export const EXTRA_SERVICE_CATALOG_MANIFEST: readonly ExtraServiceCatalogEntry[] = [
  { code: 'ELEVATOR_TRANSPORT', name: 'Asansörlü Taşıma', description: null, status: 'ACTIVE', sortOrder: 1 },
  { code: 'PROFESSIONAL_PACKING', name: 'Profesyonel Paketleme', description: null, status: 'ACTIVE', sortOrder: 2 },
  { code: 'ASSEMBLY_DISASSEMBLY', name: 'Montaj/Demontaj', description: null, status: 'ACTIVE', sortOrder: 3 },
  { code: 'TEMPORARY_STORAGE', name: 'Geçici depolama', description: null, status: 'ACTIVE', sortOrder: 4 },
  { code: 'PIANO_TRANSPORT', name: 'Piyano Taşıma', description: null, status: 'ACTIVE', sortOrder: 5 },
  { code: 'PACKAGING', name: 'Ambalajlama', description: null, status: 'ACTIVE', sortOrder: 6 },
  { code: 'APPLIANCE_INSTALLATION', name: 'Beyaz Eşya Kurulumu', description: null, status: 'ACTIVE', sortOrder: 7 },
  { code: 'IT_SPECIAL_TRANSPORT', name: 'Server/IT özel taşıma', description: null, status: 'ACTIVE', sortOrder: 8 },
  { code: 'CABLE_LABELING', name: 'Kablo etiketleme', description: null, status: 'ACTIVE', sortOrder: 9 },
  { code: 'CORPORATE_INSURANCE', name: 'Kurumsal sigorta', description: null, status: 'INACTIVE', sortOrder: 10 },
  { code: 'ADDITIONAL_INSURANCE', name: 'Ek sigorta', description: null, status: 'INACTIVE', sortOrder: 11 },
  { code: 'WEEKEND_DELIVERY', name: 'Hafta sonu teslimat', description: null, status: 'ACTIVE', sortOrder: 12 },
  { code: 'FLOOR_TO_FLOOR_TRANSPORT', name: 'Kat arası taşıma', description: null, status: 'ACTIVE', sortOrder: 13 },
  { code: 'PACKING_MATERIAL_SUPPLY', name: 'Ambalaj Malzemesi Temini', description: null, status: 'ACTIVE', sortOrder: 14 },
  { code: 'FRAGILE_ITEM_PACKAGING', name: 'Kırılabilir Eşya Özel Paketleme', description: null, status: 'ACTIVE', sortOrder: 15 },
  { code: 'WARDROBE_BOX_SERVICE', name: 'Askılı Koli Hizmeti', description: null, status: 'ACTIVE', sortOrder: 16 },
  { code: 'UNPACKING_SERVICE', name: 'Koli Açma ve Yerleştirme', description: null, status: 'ACTIVE', sortOrder: 17 },
  { code: 'PACKAGING_WASTE_REMOVAL', name: 'Ambalaj Atığı Toplama', description: null, status: 'ACTIVE', sortOrder: 18 },
  { code: 'CHANDELIER_REMOVAL_INSTALLATION', name: 'Avize Sökme ve Takma', description: null, status: 'ACTIVE', sortOrder: 19 },
  { code: 'CURTAIN_ROD_REMOVAL_INSTALLATION', name: 'Perde/Korniş Sökme ve Takma', description: null, status: 'ACTIVE', sortOrder: 20 },
  { code: 'LONG_CARRY', name: 'Uzun Mesafe Elle Taşıma', description: null, status: 'ACTIVE', sortOrder: 21 },
  { code: 'SMALL_TRANSFER_VEHICLE', name: 'Küçük Aktarma Aracı', description: null, status: 'ACTIVE', sortOrder: 22 },
  { code: 'EXTRA_MOVING_CREW', name: 'İlave Taşıma Personeli', description: null, status: 'ACTIVE', sortOrder: 23 },
  { code: 'MULTI_VEHICLE_SUPPORT', name: 'Birden Fazla Araç Desteği', description: null, status: 'ACTIVE', sortOrder: 24 },
  { code: 'SAFE_TRANSPORT', name: 'Çelik Kasa Taşıma', description: null, status: 'ACTIVE', sortOrder: 25 },
  { code: 'AQUARIUM_TRANSPORT', name: 'Akvaryum Taşıma', description: null, status: 'ACTIVE', sortOrder: 26 },
  { code: 'ANTIQUE_ART_TRANSPORT', name: 'Antika ve Sanat Eseri Taşıma', description: null, status: 'ACTIVE', sortOrder: 27 },
  { code: 'MARBLE_GLASS_TABLE_TRANSPORT', name: 'Mermer/Cam Masa Taşıma', description: null, status: 'ACTIVE', sortOrder: 28 },
  { code: 'LARGE_SCREEN_TV_TRANSPORT', name: 'Büyük Ekran Televizyon Taşıma', description: null, status: 'ACTIVE', sortOrder: 29 },
  { code: 'FITNESS_EQUIPMENT_TRANSPORT', name: 'Spor Aleti Taşıma', description: null, status: 'ACTIVE', sortOrder: 30 },
  { code: 'OVERSIZED_ITEM_TRANSPORT', name: 'Çok Ağır/Hacimli Eşya Taşıma', description: null, status: 'ACTIVE', sortOrder: 31 },
  { code: 'SERVER_RACK_TRANSPORT', name: 'Server Kabinet/Rack Taşıma', description: null, status: 'ACTIVE', sortOrder: 32 },
  { code: 'ARCHIVE_PACKING', name: 'Arşiv Paketleme', description: null, status: 'ACTIVE', sortOrder: 33 },
  { code: 'SENSITIVE_ELECTRONICS_TRANSPORT', name: 'Hassas Elektronik Cihaz Taşıma', description: null, status: 'ACTIVE', sortOrder: 34 },
];

export const EXTRA_SERVICE_CATALOG = EXTRA_SERVICE_CATALOG_MANIFEST.map(
  (entry) => entry.name,
);

const ALL_THREE_CODES = [
  'ELEVATOR_TRANSPORT',
  'PROFESSIONAL_PACKING',
  'ASSEMBLY_DISASSEMBLY',
  'TEMPORARY_STORAGE',
  'PIANO_TRANSPORT',
  'PACKAGING',
  'APPLIANCE_INSTALLATION',
  'WEEKEND_DELIVERY',
  'FLOOR_TO_FLOOR_TRANSPORT',
  'PACKING_MATERIAL_SUPPLY',
  'FRAGILE_ITEM_PACKAGING',
  'LONG_CARRY',
  'SMALL_TRANSFER_VEHICLE',
  'EXTRA_MOVING_CREW',
  'MULTI_VEHICLE_SUPPORT',
  'SAFE_TRANSPORT',
  'AQUARIUM_TRANSPORT',
  'ANTIQUE_ART_TRANSPORT',
  'MARBLE_GLASS_TABLE_TRANSPORT',
  'LARGE_SCREEN_TV_TRANSPORT',
  'FITNESS_EQUIPMENT_TRANSPORT',
  'OVERSIZED_ITEM_TRANSPORT',
  'CORPORATE_INSURANCE',
  'ADDITIONAL_INSURANCE',
] as const;

const HOME_AND_OFFICE_CODES = [
  'UNPACKING_SERVICE',
  'PACKAGING_WASTE_REMOVAL',
  'CHANDELIER_REMOVAL_INSTALLATION',
  'CURTAIN_ROD_REMOVAL_INSTALLATION',
] as const;

const HOME_ONLY_CODES = ['WARDROBE_BOX_SERVICE'] as const;

const OFFICE_AND_PARTIAL_CODES = [
  'IT_SPECIAL_TRANSPORT',
  'SERVER_RACK_TRANSPORT',
  'SENSITIVE_ELECTRONICS_TRANSPORT',
] as const;

const OFFICE_ONLY_CODES = [
  'CABLE_LABELING',
  'ARCHIVE_PACKING',
] as const;

const LOAD_TYPES_BY_CODE = new Map<string, readonly ExtraServiceLoadType[]>([
  ...ALL_THREE_CODES.map((code) => [code, [
    ExtraServiceLoadType.HOME,
    ExtraServiceLoadType.OFFICE,
    ExtraServiceLoadType.PARTIAL,
  ]] as const),
  ...HOME_AND_OFFICE_CODES.map((code) => [code, [
    ExtraServiceLoadType.HOME,
    ExtraServiceLoadType.OFFICE,
  ]] as const),
  ...HOME_ONLY_CODES.map((code) => [code, [ExtraServiceLoadType.HOME]] as const),
  ...OFFICE_AND_PARTIAL_CODES.map((code) => [code, [
    ExtraServiceLoadType.OFFICE,
    ExtraServiceLoadType.PARTIAL,
  ]] as const),
  ...OFFICE_ONLY_CODES.map((code) => [code, [ExtraServiceLoadType.OFFICE]] as const),
]);

const RECOMMENDED_CODES = new Set([
  'ELEVATOR_TRANSPORT',
  'PROFESSIONAL_PACKING',
  'IT_SPECIAL_TRANSPORT',
  'FLOOR_TO_FLOOR_TRANSPORT',
]);

export const EXTRA_SERVICE_APPLICABILITY_SEED: ExtraServiceApplicabilitySeed[] =
  EXTRA_SERVICE_CATALOG_MANIFEST.flatMap((entry) => {
    const loadTypes = LOAD_TYPES_BY_CODE.get(entry.code);
    if (!loadTypes) {
      throw new Error(`Missing applicability definition for ${entry.code}`);
    }

    return loadTypes.map((loadType, index) => ({
      code: entry.code,
      name: entry.name,
      loadType,
      isDefaultVisible: true,
      isRecommendedByConverter: RECOMMENDED_CODES.has(entry.code),
      sortOrder: index + 1,
    }));
  });

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
  Depolama: 'Geçici depolama',
  'Geçici depolama': 'Geçici depolama',
  'Piyano Taşıma': 'Piyano Taşıma',
  Ambalajlama: 'Ambalajlama',
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
