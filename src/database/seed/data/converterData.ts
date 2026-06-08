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
  { itemCode: 'sofa_3_seat', label: "3'lü koltuk", category: 'living_room', unitVolumeMin: 1.8, unitVolumeMax: 2.2, isSpecial: false, isActive: true, sortOrder: 10 },
  { itemCode: 'sofa_2_seat', label: "2'li koltuk", category: 'living_room', unitVolumeMin: 1.2, unitVolumeMax: 1.6, isSpecial: false, isActive: true, sortOrder: 20 },
  { itemCode: 'armchair', label: 'Berjer', category: 'living_room', unitVolumeMin: 0.5, unitVolumeMax: 0.8, isSpecial: false, isActive: true, sortOrder: 30 },
  { itemCode: 'sofa_bed', label: 'Çekyat / Kanepe', category: 'living_room', unitVolumeMin: 1.4, unitVolumeMax: 2.0, isSpecial: false, isActive: true, sortOrder: 35 },
  { itemCode: 'tv_unit', label: 'TV ünitesi', category: 'living_room', unitVolumeMin: 0.6, unitVolumeMax: 1.0, isSpecial: false, isActive: true, sortOrder: 40 },
  { itemCode: 'dining_table_6', label: '6 kişilik yemek masası', category: 'living_room', unitVolumeMin: 1.1, unitVolumeMax: 1.5, isSpecial: false, isActive: true, sortOrder: 50 },
  { itemCode: 'dining_chair', label: 'Yemek sandalyesi', category: 'living_room', unitVolumeMin: 0.15, unitVolumeMax: 0.25, isSpecial: false, isActive: true, sortOrder: 60 },
  { itemCode: 'tv_unit_large', label: 'TV ünitesi (büyük)', category: 'living_room', unitVolumeMin: 0.6, unitVolumeMax: 0.9, isSpecial: false, isActive: true, sortOrder: 70 },
  { itemCode: 'coffee_table', label: 'Sehpa (orta + yan)', category: 'living_room', unitVolumeMin: 0.2, unitVolumeMax: 0.35, isSpecial: false, isActive: true, sortOrder: 80 },
  { itemCode: 'display_cabinet', label: 'Vitrin / Camlı dolap', category: 'living_room', unitVolumeMin: 0.9, unitVolumeMax: 1.4, isSpecial: false, isActive: true, sortOrder: 90 },
  { itemCode: 'bookshelf', label: 'Kütüphane / Kitaplık', category: 'living_room', unitVolumeMin: 0.7, unitVolumeMax: 1.2, isSpecial: false, isActive: true, sortOrder: 95 },
  { itemCode: 'bed_double', label: 'Çift kişilik yatak', category: 'bedroom', unitVolumeMin: 1.6, unitVolumeMax: 2.0, isSpecial: false, isActive: true, sortOrder: 100 },
  { itemCode: 'bed_single', label: 'Tek kişilik yatak', category: 'bedroom', unitVolumeMin: 0.9, unitVolumeMax: 1.2, isSpecial: false, isActive: true, sortOrder: 110 },
  { itemCode: 'wardrobe', label: 'Gardrop', category: 'bedroom', unitVolumeMin: 1.6, unitVolumeMax: 2.4, isSpecial: false, isActive: true, sortOrder: 120 },
  { itemCode: 'wardrobe_2door', label: 'Gardrop (2 kanatlı)', category: 'bedroom', unitVolumeMin: 1.4, unitVolumeMax: 1.9, isSpecial: false, isActive: true, sortOrder: 125 },
  { itemCode: 'wardrobe_3door', label: 'Gardrop (3-4 kanatlı)', category: 'bedroom', unitVolumeMin: 2.0, unitVolumeMax: 2.8, isSpecial: false, isActive: true, sortOrder: 130 },
  { itemCode: 'dresser', label: 'Şifonyer', category: 'bedroom', unitVolumeMin: 0.5, unitVolumeMax: 0.8, isSpecial: false, isActive: true, sortOrder: 135 },
  { itemCode: 'nightstand', label: 'Komodin', category: 'bedroom', unitVolumeMin: 0.12, unitVolumeMax: 0.2, isSpecial: false, isActive: true, sortOrder: 140 },
  { itemCode: 'vanity', label: 'Makyaj masası', category: 'bedroom', unitVolumeMin: 0.4, unitVolumeMax: 0.6, isSpecial: false, isActive: true, sortOrder: 145 },
  { itemCode: 'desk', label: 'Çalışma masası', category: 'office', unitVolumeMin: 0.7, unitVolumeMax: 1.1, isSpecial: false, isActive: true, sortOrder: 150 },
  { itemCode: 'office_chair', label: 'Ofis sandalyesi', category: 'office', unitVolumeMin: 0.25, unitVolumeMax: 0.4, isSpecial: false, isActive: true, sortOrder: 160 },
  { itemCode: 'bookcase', label: 'Kitaplık', category: 'office', unitVolumeMin: 0.8, unitVolumeMax: 1.4, isSpecial: false, isActive: true, sortOrder: 170 },
  { itemCode: 'refrigerator', label: 'Buzdolabı', category: 'appliance', unitVolumeMin: 0.8, unitVolumeMax: 1.2, isSpecial: false, isActive: true, sortOrder: 190 },
  { itemCode: 'washing_machine', label: 'Çamaşır makinesi', category: 'appliance', unitVolumeMin: 0.4, unitVolumeMax: 0.6, isSpecial: false, isActive: true, sortOrder: 200 },
  { itemCode: 'dishwasher', label: 'Bulaşık makinesi', category: 'appliance', unitVolumeMin: 0.35, unitVolumeMax: 0.55, isSpecial: false, isActive: true, sortOrder: 210 },
  { itemCode: 'oven', label: 'Fırın', category: 'appliance', unitVolumeMin: 0.3, unitVolumeMax: 0.5, isSpecial: false, isActive: true, sortOrder: 240 },
  { itemCode: 'air_conditioner', label: 'Klima', category: 'appliance', unitVolumeMin: 0.25, unitVolumeMax: 0.45, isSpecial: false, isActive: true, sortOrder: 250 },
  { itemCode: 'microwave', label: 'Mikrodalga fırın', category: 'appliance', unitVolumeMin: 0.05, unitVolumeMax: 0.1, isSpecial: false, isActive: true, sortOrder: 260 },
  { itemCode: 'dryer', label: 'Çamaşır kurutucu', category: 'appliance', unitVolumeMin: 0.4, unitVolumeMax: 0.55, isSpecial: false, isActive: true, sortOrder: 270 },
  { itemCode: 'ac_split', label: 'Klima (split)', category: 'appliance', unitVolumeMin: 0.2, unitVolumeMax: 0.3, isSpecial: false, isActive: true, sortOrder: 280 },
  { itemCode: 'small_box', label: 'Küçük koli', category: 'box', unitVolumeMin: 0.04, unitVolumeMax: 0.06, isSpecial: false, isActive: true, sortOrder: 300 },
  { itemCode: 'medium_box', label: 'Orta koli', category: 'box', unitVolumeMin: 0.08, unitVolumeMax: 0.12, isSpecial: false, isActive: true, sortOrder: 310 },
  { itemCode: 'large_box', label: 'Büyük koli', category: 'box', unitVolumeMin: 0.14, unitVolumeMax: 0.2, isSpecial: false, isActive: true, sortOrder: 320 },
  { itemCode: 'carpet_roll', label: 'Halı rulosu', category: 'box', unitVolumeMin: 0.15, unitVolumeMax: 0.3, isSpecial: false, isActive: true, sortOrder: 330 },
  { itemCode: 'large_tv', label: 'Büyük TV', category: 'special', unitVolumeMin: 0.2, unitVolumeMax: 0.35, isSpecial: true, isActive: true, sortOrder: 400 },
  { itemCode: 'piano', label: 'Piyano', category: 'special', unitVolumeMin: 1.2, unitVolumeMax: 2.2, isSpecial: true, isActive: true, sortOrder: 410 },
  { itemCode: 'aquarium', label: 'Akvaryum', category: 'special', unitVolumeMin: 0.3, unitVolumeMax: 0.8, isSpecial: true, isActive: true, sortOrder: 420 },
  { itemCode: 'treadmill', label: 'Koşu bandı', category: 'special', unitVolumeMin: 0.6, unitVolumeMax: 1.0, isSpecial: true, isActive: true, sortOrder: 430 },
  { itemCode: 'bicycle', label: 'Bisiklet', category: 'special', unitVolumeMin: 0.3, unitVolumeMax: 0.5, isSpecial: true, isActive: true, sortOrder: 440 },
  { itemCode: 'safe', label: 'Çelik kasa / Para kasası', category: 'special', unitVolumeMin: 0.2, unitVolumeMax: 0.6, isSpecial: true, isActive: true, sortOrder: 450 },
];

export const CONVERTER_VEHICLE_RULES_V1: ConverterVehicleRuleSeedItem[] = [
  { vehicleCode: 'panelvan', label: 'Panelvan', volumeMin: 0, volumeMax: 4, priority: 1, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'short_chassis_van', label: 'Kisa sasi kamyonet', volumeMin: 4, volumeMax: 8, priority: 2, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'long_chassis_van', label: 'Uzun sasi kamyonet', volumeMin: 8, volumeMax: 14, priority: 3, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'small_truck', label: 'Kucuk kamyon', volumeMin: 14, volumeMax: 22, priority: 4, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
  { vehicleCode: 'large_truck', label: 'Buyuk kamyon', volumeMin: 22, volumeMax: 999, priority: 5, specialItemOverride: true, nearThresholdOverride: true, isActive: true },
];
