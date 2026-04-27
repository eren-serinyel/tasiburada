export type ConverterCatalogSeedItem = {
  itemCode: string;
  label: string;
  category: string;
  unitVolumeMin: number;
  unitVolumeMax: number;
  isSpecial: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type ConverterVehicleRuleSeedItem = {
  vehicleCode: string;
  label: string;
  volumeMin: number;
  volumeMax: number;
  priority: number;
  specialItemOverride: boolean;
  nearThresholdOverride: boolean;
  isActive: boolean;
};

export const CONVERTER_ITEM_CATALOG_V1: ConverterCatalogSeedItem[] = [
  { itemCode: 'sofa_3_seat', label: "3'lu koltuk", category: 'living_room', unitVolumeMin: 1.8, unitVolumeMax: 2.2, isSpecial: false, isActive: true, sortOrder: 10 },
  { itemCode: 'sofa_2_seat', label: "2'li koltuk", category: 'living_room', unitVolumeMin: 1.2, unitVolumeMax: 1.6, isSpecial: false, isActive: true, sortOrder: 20 },
  { itemCode: 'armchair', label: 'Berjer', category: 'living_room', unitVolumeMin: 0.5, unitVolumeMax: 0.8, isSpecial: false, isActive: true, sortOrder: 30 },
  { itemCode: 'sofa_bed', label: 'Cekyat / kanepe', category: 'living_room', unitVolumeMin: 1.4, unitVolumeMax: 2.0, isSpecial: false, isActive: true, sortOrder: 35 },
  { itemCode: 'tv_unit', label: 'TV unitesi', category: 'living_room', unitVolumeMin: 0.6, unitVolumeMax: 1.0, isSpecial: false, isActive: true, sortOrder: 40 },
  { itemCode: 'dining_table_6', label: '6 kisilik yemek masasi', category: 'living_room', unitVolumeMin: 1.1, unitVolumeMax: 1.5, isSpecial: false, isActive: true, sortOrder: 50 },
  { itemCode: 'dining_chair', label: 'Yemek sandalyesi', category: 'living_room', unitVolumeMin: 0.15, unitVolumeMax: 0.25, isSpecial: false, isActive: true, sortOrder: 60 },
  { itemCode: 'bed_double', label: 'Cift kisilik yatak', category: 'bedroom', unitVolumeMin: 1.6, unitVolumeMax: 2.0, isSpecial: false, isActive: true, sortOrder: 100 },
  { itemCode: 'bed_single', label: 'Tek kisilik yatak', category: 'bedroom', unitVolumeMin: 0.9, unitVolumeMax: 1.2, isSpecial: false, isActive: true, sortOrder: 110 },
  { itemCode: 'wardrobe', label: 'Gardrop', category: 'bedroom', unitVolumeMin: 1.6, unitVolumeMax: 2.4, isSpecial: false, isActive: true, sortOrder: 120 },
  { itemCode: 'nightstand', label: 'Komodin', category: 'bedroom', unitVolumeMin: 0.12, unitVolumeMax: 0.2, isSpecial: false, isActive: true, sortOrder: 140 },
  { itemCode: 'desk', label: 'Calisma masasi', category: 'office', unitVolumeMin: 0.7, unitVolumeMax: 1.1, isSpecial: false, isActive: true, sortOrder: 150 },
  { itemCode: 'office_chair', label: 'Ofis sandalyesi', category: 'office', unitVolumeMin: 0.25, unitVolumeMax: 0.4, isSpecial: false, isActive: true, sortOrder: 160 },
  { itemCode: 'bookcase', label: 'Kitaplik', category: 'office', unitVolumeMin: 0.8, unitVolumeMax: 1.4, isSpecial: false, isActive: true, sortOrder: 170 },
  { itemCode: 'refrigerator', label: 'Buzdolabi', category: 'appliance', unitVolumeMin: 0.8, unitVolumeMax: 1.2, isSpecial: false, isActive: true, sortOrder: 190 },
  { itemCode: 'washing_machine', label: 'Camasir makinesi', category: 'appliance', unitVolumeMin: 0.4, unitVolumeMax: 0.6, isSpecial: false, isActive: true, sortOrder: 200 },
  { itemCode: 'dishwasher', label: 'Bulasik makinesi', category: 'appliance', unitVolumeMin: 0.35, unitVolumeMax: 0.55, isSpecial: false, isActive: true, sortOrder: 210 },
  { itemCode: 'oven', label: 'Firin', category: 'appliance', unitVolumeMin: 0.3, unitVolumeMax: 0.5, isSpecial: false, isActive: true, sortOrder: 240 },
  { itemCode: 'air_conditioner', label: 'Klima', category: 'appliance', unitVolumeMin: 0.25, unitVolumeMax: 0.45, isSpecial: false, isActive: true, sortOrder: 250 },
  { itemCode: 'small_box', label: 'Kucuk koli', category: 'box', unitVolumeMin: 0.04, unitVolumeMax: 0.06, isSpecial: false, isActive: true, sortOrder: 300 },
  { itemCode: 'medium_box', label: 'Orta koli', category: 'box', unitVolumeMin: 0.08, unitVolumeMax: 0.12, isSpecial: false, isActive: true, sortOrder: 310 },
  { itemCode: 'large_box', label: 'Buyuk koli', category: 'box', unitVolumeMin: 0.14, unitVolumeMax: 0.2, isSpecial: false, isActive: true, sortOrder: 320 },
  { itemCode: 'carpet_roll', label: 'Hali rulosu', category: 'box', unitVolumeMin: 0.15, unitVolumeMax: 0.3, isSpecial: false, isActive: true, sortOrder: 330 },
  { itemCode: 'large_tv', label: 'Buyuk TV', category: 'special', unitVolumeMin: 0.2, unitVolumeMax: 0.35, isSpecial: true, isActive: true, sortOrder: 400 },
  { itemCode: 'piano', label: 'Piyano', category: 'special', unitVolumeMin: 1.2, unitVolumeMax: 2.2, isSpecial: true, isActive: true, sortOrder: 410 },
];

export const CONVERTER_VEHICLE_RULES_V1: ConverterVehicleRuleSeedItem[] = [
  { vehicleCode: 'panelvan', label: 'Panelvan', volumeMin: 0, volumeMax: 4, priority: 1, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'short_chassis_van', label: 'Kisa sasi kamyonet', volumeMin: 4, volumeMax: 8, priority: 2, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'long_chassis_van', label: 'Uzun sasi kamyonet', volumeMin: 8, volumeMax: 14, priority: 3, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'small_truck', label: 'Kucuk kamyon', volumeMin: 14, volumeMax: 22, priority: 4, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'large_truck', label: 'Buyuk kamyon', volumeMin: 22, volumeMax: 999, priority: 5, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
];
