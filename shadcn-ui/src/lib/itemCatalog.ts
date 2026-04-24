export interface ConverterCatalogItem {
  itemCode: string;
  label: string;
  category: string;
  isSpecial: boolean;
}

// TODO: backend item-catalog endpoint'i eklenince buradan kaldır
// Source of truth: src/database/seed/data/converterData.ts
export const CONVERTER_ITEM_CATALOG_V1: ConverterCatalogItem[] = [
  { itemCode: 'sofa_3_seat', label: "3'lu koltuk", category: 'living_room', isSpecial: false },
  { itemCode: 'sofa_2_seat', label: "2'li koltuk", category: 'living_room', isSpecial: false },
  { itemCode: 'armchair', label: 'Berjer', category: 'living_room', isSpecial: false },
  { itemCode: 'tv_unit', label: 'TV unitesi', category: 'living_room', isSpecial: false },
  { itemCode: 'dining_table_6', label: '6 kisilik yemek masasi', category: 'living_room', isSpecial: false },
  { itemCode: 'dining_chair', label: 'Yemek sandalyesi', category: 'living_room', isSpecial: false },
  { itemCode: 'bed_double', label: 'Cift kisilik yatak', category: 'bedroom', isSpecial: false },
  { itemCode: 'bed_single', label: 'Tek kisilik yatak', category: 'bedroom', isSpecial: false },
  { itemCode: 'wardrobe_3door', label: '3 kapili dolap', category: 'bedroom', isSpecial: false },
  { itemCode: 'dresser', label: 'Sifonyer/cekmece dolabi', category: 'bedroom', isSpecial: false },
  { itemCode: 'nightstand', label: 'Komodin', category: 'bedroom', isSpecial: false },
  { itemCode: 'washing_machine', label: 'Camasir makinesi', category: 'appliance', isSpecial: false },
  { itemCode: 'dishwasher', label: 'Bulasik makinesi', category: 'appliance', isSpecial: false },
  { itemCode: 'fridge_large', label: 'Buyuk buzdolabi', category: 'appliance', isSpecial: false },
  { itemCode: 'fridge_small', label: 'Kucuk buzdolabi', category: 'appliance', isSpecial: false },
  { itemCode: 'oven', label: 'Firin', category: 'appliance', isSpecial: false },
  { itemCode: 'box_small', label: 'Kucuk koli', category: 'box', isSpecial: false },
  { itemCode: 'box_medium', label: 'Orta koli', category: 'box', isSpecial: false },
  { itemCode: 'box_large', label: 'Buyuk koli', category: 'box', isSpecial: false },
  { itemCode: 'large_tv', label: 'Buyuk TV', category: 'special', isSpecial: true },
  { itemCode: 'piano', label: 'Piyano', category: 'special', isSpecial: true },
  { itemCode: 'safe_box', label: 'Kasa', category: 'special', isSpecial: true },
];
