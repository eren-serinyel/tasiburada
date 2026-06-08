import { MigrationInterface, QueryRunner } from 'typeorm';

type LabelFix = {
  itemCode: string;
  oldLabel: string;
  newLabel: string;
};

const LABEL_FIXES: LabelFix[] = [
  { itemCode: 'sofa_3_seat', oldLabel: "3'lu koltuk", newLabel: "3'lü koltuk" },
  { itemCode: 'sofa_bed', oldLabel: 'Cekyat / kanepe', newLabel: 'Çekyat / Kanepe' },
  { itemCode: 'tv_unit', oldLabel: 'TV unitesi', newLabel: 'TV ünitesi' },
  { itemCode: 'dining_table_6', oldLabel: '6 kisilik yemek masasi', newLabel: '6 kişilik yemek masası' },
  { itemCode: 'tv_unit_large', oldLabel: 'TV unitesi (buyuk)', newLabel: 'TV ünitesi (büyük)' },
  { itemCode: 'display_cabinet', oldLabel: 'Vitrin / Camli dolap', newLabel: 'Vitrin / Camlı dolap' },
  { itemCode: 'bookshelf', oldLabel: 'Kutuphane / Kitaplik', newLabel: 'Kütüphane / Kitaplık' },
  { itemCode: 'bed_double', oldLabel: 'Cift kisilik yatak', newLabel: 'Çift kişilik yatak' },
  { itemCode: 'bed_single', oldLabel: 'Tek kisilik yatak', newLabel: 'Tek kişilik yatak' },
  { itemCode: 'wardrobe_2door', oldLabel: 'Gardrop (2 kanatli)', newLabel: 'Gardrop (2 kanatlı)' },
  { itemCode: 'wardrobe_3door', oldLabel: 'Gardrop (3-4 kanatli)', newLabel: 'Gardrop (3-4 kanatlı)' },
  { itemCode: 'dresser', oldLabel: 'Sifonyer', newLabel: 'Şifonyer' },
  { itemCode: 'vanity', oldLabel: 'Makyaj masasi', newLabel: 'Makyaj masası' },
  { itemCode: 'desk', oldLabel: 'Calisma masasi', newLabel: 'Çalışma masası' },
  { itemCode: 'bookcase', oldLabel: 'Kitaplik', newLabel: 'Kitaplık' },
  { itemCode: 'refrigerator', oldLabel: 'Buzdolabi', newLabel: 'Buzdolabı' },
  { itemCode: 'washing_machine', oldLabel: 'Camasir makinesi', newLabel: 'Çamaşır makinesi' },
  { itemCode: 'dishwasher', oldLabel: 'Bulasik makinesi', newLabel: 'Bulaşık makinesi' },
  { itemCode: 'oven', oldLabel: 'Firin', newLabel: 'Fırın' },
  { itemCode: 'microwave', oldLabel: 'Mikrodalga firin', newLabel: 'Mikrodalga fırın' },
  { itemCode: 'dryer', oldLabel: 'Camasir kurutucu', newLabel: 'Çamaşır kurutucu' },
  { itemCode: 'small_box', oldLabel: 'Kucuk koli', newLabel: 'Küçük koli' },
  { itemCode: 'large_box', oldLabel: 'Buyuk koli', newLabel: 'Büyük koli' },
  { itemCode: 'carpet_roll', oldLabel: 'Hali rulosu', newLabel: 'Halı rulosu' },
  { itemCode: 'large_tv', oldLabel: 'Buyuk TV', newLabel: 'Büyük TV' },
  { itemCode: 'treadmill', oldLabel: 'Kosu bandi', newLabel: 'Koşu bandı' },
  { itemCode: 'safe', oldLabel: 'Celik kasa / Para kasasi', newLabel: 'Çelik kasa / Para kasası' },
];

export class FixTurkishLabelsInConverterCatalog1778700000000 implements MigrationInterface {
  name = 'FixTurkishLabelsInConverterCatalog1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const fix of LABEL_FIXES) {
      await queryRunner.query(
        'UPDATE converter_item_catalog SET label = ? WHERE item_code = ?',
        [fix.newLabel, fix.itemCode],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const fix of LABEL_FIXES) {
      await queryRunner.query(
        'UPDATE converter_item_catalog SET label = ? WHERE item_code = ?',
        [fix.oldLabel, fix.itemCode],
      );
    }
  }
}
