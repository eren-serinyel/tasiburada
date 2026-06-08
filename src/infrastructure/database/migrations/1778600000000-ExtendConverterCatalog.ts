import { MigrationInterface, QueryRunner } from 'typeorm';

type CatalogItem = {
  itemCode: string;
  label: string;
  category: string;
  unitVolumeMin: number;
  unitVolumeMax: number;
  isSpecial: boolean;
  sortOrder: number;
};

const NEW_CATALOG_ITEMS: CatalogItem[] = [
  { itemCode: 'tv_unit_large', label: 'TV unitesi (buyuk)', category: 'living_room', unitVolumeMin: 0.6, unitVolumeMax: 0.9, isSpecial: false, sortOrder: 70 },
  { itemCode: 'coffee_table', label: 'Sehpa (orta + yan)', category: 'living_room', unitVolumeMin: 0.2, unitVolumeMax: 0.35, isSpecial: false, sortOrder: 80 },
  { itemCode: 'display_cabinet', label: 'Vitrin / Camli dolap', category: 'living_room', unitVolumeMin: 0.9, unitVolumeMax: 1.4, isSpecial: false, sortOrder: 90 },
  { itemCode: 'bookshelf', label: 'Kutuphane / Kitaplik', category: 'living_room', unitVolumeMin: 0.7, unitVolumeMax: 1.2, isSpecial: false, sortOrder: 95 },
  { itemCode: 'wardrobe_2door', label: 'Gardrop (2 kanatli)', category: 'bedroom', unitVolumeMin: 1.4, unitVolumeMax: 1.9, isSpecial: false, sortOrder: 125 },
  { itemCode: 'wardrobe_3door', label: 'Gardrop (3-4 kanatli)', category: 'bedroom', unitVolumeMin: 2.0, unitVolumeMax: 2.8, isSpecial: false, sortOrder: 130 },
  { itemCode: 'dresser', label: 'Sifonyer', category: 'bedroom', unitVolumeMin: 0.5, unitVolumeMax: 0.8, isSpecial: false, sortOrder: 135 },
  { itemCode: 'vanity', label: 'Makyaj masasi', category: 'bedroom', unitVolumeMin: 0.4, unitVolumeMax: 0.6, isSpecial: false, sortOrder: 145 },
  { itemCode: 'microwave', label: 'Mikrodalga firin', category: 'appliance', unitVolumeMin: 0.05, unitVolumeMax: 0.1, isSpecial: false, sortOrder: 260 },
  { itemCode: 'dryer', label: 'Camasir kurutucu', category: 'appliance', unitVolumeMin: 0.4, unitVolumeMax: 0.55, isSpecial: false, sortOrder: 270 },
  { itemCode: 'ac_split', label: 'Klima (split)', category: 'appliance', unitVolumeMin: 0.2, unitVolumeMax: 0.3, isSpecial: false, sortOrder: 280 },
  { itemCode: 'aquarium', label: 'Akvaryum', category: 'special', unitVolumeMin: 0.3, unitVolumeMax: 0.8, isSpecial: true, sortOrder: 420 },
  { itemCode: 'treadmill', label: 'Kosu bandi', category: 'special', unitVolumeMin: 0.6, unitVolumeMax: 1.0, isSpecial: true, sortOrder: 430 },
  { itemCode: 'bicycle', label: 'Bisiklet', category: 'special', unitVolumeMin: 0.3, unitVolumeMax: 0.5, isSpecial: true, sortOrder: 440 },
  { itemCode: 'safe', label: 'Celik kasa / Para kasasi', category: 'special', unitVolumeMin: 0.2, unitVolumeMax: 0.6, isSpecial: true, sortOrder: 450 },
];

export class ExtendConverterCatalog1778600000000 implements MigrationInterface {
  name = 'ExtendConverterCatalog1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const item of NEW_CATALOG_ITEMS) {
      await queryRunner.query(
        `INSERT INTO converter_item_catalog
          (id, item_code, label, category, unit_volume_min, unit_volume_max, is_special, is_active, sort_order)
        SELECT UUID(), ?, ?, ?, ?, ?, ?, 1, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM converter_item_catalog WHERE item_code = ?
        )`,
        [
          item.itemCode,
          item.label,
          item.category,
          item.unitVolumeMin,
          item.unitVolumeMax,
          item.isSpecial ? 1 : 0,
          item.sortOrder,
          item.itemCode,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM converter_item_catalog WHERE item_code IN (${NEW_CATALOG_ITEMS.map(() => '?').join(', ')})`,
      NEW_CATALOG_ITEMS.map((item) => item.itemCode),
    );
  }
}
