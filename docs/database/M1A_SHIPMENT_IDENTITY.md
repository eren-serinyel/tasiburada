# M1A Shipment V2 Kategori ve Rota Kimliği

## Kapsam

M1A, mevcut `shipments` tablosuna birbirinden bağımsız iki canonical V2
kimliği ekler:

- `service_category_code`
- `route_scope_code`

ShipmentRound, category-detail, access-price class, pricing, slot, payment,
credit ve frontend/public write orchestration bu paketin kapsamı dışındadır.

## Migration ve registry

- Timestamp: `1784580000000`
- Migration: `AddShipmentV2IdentityCodes1784580000000`
- Registry sırası:
  1. `CanonicalBaselineV11784500000000`
  2. `AddShipmentV2IdentityCodes1784580000000`

Runtime ve canonical disposable DataSource aynı explicit registry'yi kullanır.
Legacy migration glob'u yüklenmez.

## Canonical code setleri

Service category:

- `HOME_MOVE`
- `OFFICE_MOVE`
- `PARTIAL_ITEM`

Route scope:

- `INTRACITY`
- `INTERCITY`

Access-price class kodları bu setlere dahil değildir. Kategori ve rota kapsamı
birbirinden bağımsız hesaplanır.

## V1 kaynakları ve backfill

Kategori için V1 canonical kaynak `shipments.shipment_category` kolonudur.
Kanıtlanan mapping:

- `HOME_MOVE` → `HOME_MOVE`
- `OFFICE_MOVE` → `OFFICE_MOVE`
- `PARTIAL_ITEM` → `PARTIAL_ITEM`
- `STORAGE` → `NULL`
- Null veya bilinmeyen değer → `NULL`

Rota kapsamı için ayrı bir V1 kolonu yoktur. Mevcut matching semantiğinin
kaynağı normalize edilmiş `origin_city` ve `destination_city` çiftidir:

- İki şehir de dolu ve eşitse `INTRACITY`
- İki şehir de dolu ve farklıysa `INTERCITY`
- Şehirlerden biri null/blank ise `NULL`

Dev DB migration öncesi 2000 shipment içinde null/blank rota kaynağı,
bilinmeyen kategori veya normalize-eşitlik çelişkisi yoktu. Kategori ve rota
çapraz dağılımı, iki kimliğin birbirine bağlı olmadığını doğruladı.

## Fiziksel şema

İki kolon da `VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin`, nullable ve
defaultsuzdur. Allowlist CHECK constraint'leri ve her kolon için normal index
eklenmiştir.

Gelecekteki category-detail tablosunun standard composite FK ile
`(shipment_id, service_category_code)` kimliğini doğrulayabilmesi için
`UNIQUE (id, service_category_code)` eklenmiştir. `id` zaten primary key
olduğundan bu constraint mevcut satırların tekilliğini değiştirmez; kategori
filtrelemesi için ayrı normal index korunur.

Nullable geçiş, mevcut V1 write akışının M1A'da zorunlu dual-write yapmaması
içindir. V2 publish guard sonraki M1 paketinde ele alınacaktır.

## Entity, seed ve public API

Shipment entity iki nullable canonical union alanı taşır. Alanlar
`select:false`, `insert:false` ve `update:false` olduğundan mevcut public
serialization veya V1 create/update akışına kendiliğinden sızmaz.

Seeder, V1 category ve şehir çiftlerini tek canonical mapping helper'ı ile
bağımsız biçimde türetir. Baseline-only seeded-upgrade provasında yeni kolonlar
henüz bulunmadığında seed aynı davranışı korur; M1A şeması mevcutsa değerler
izole ve toplu bir post-insert adımıyla doldurulur. Seed count ve genel V1
dağılımı değiştirilmez.

Create/update DTO'ları, controller davranışı ve frontend değiştirilmemiştir.

## Disposable doğrulamaları

From-zero:

- DB: `tasiburada_m1a_zero_130643_test`
- Applied canonical migration: `2`
- Legacy/pending migration: `0 / 0`
- Tablo/kolon/index/FK/unique/CHECK:
  `47 / 484 / 130 / 45 / 35 / 4`
- Session timezone: `+00:00`
- Fingerprint:
  `595aba7c84f64920c04b63b0b315404744bb288b109ea5c89024d0db00344ed7`
- DB doğrulama sonunda silindi.

Seeded upgrade:

- DB: `tasiburada_m1a_upgrade_130734_test`
- Shipment satırı: `2000 → 2000`
- Category: `1000 HOME_MOVE`, `300 OFFICE_MOVE`, `600 PARTIAL_ITEM`,
  `100 NULL`
- Route: `792 INTRACITY`, `1208 INTERCITY`
- Shipment primary-key hash'i değişmedi.
- Seed invariant ve ilişki orphan kontrolleri geçti.
- Legacy/pending migration: `0 / 0`
- Session timezone: `+00:00`
- Fingerprint from-zero sonucu ile aynı.
- İzole seed document fixture'ları temizlendi ve DB silindi.

Disposable document fixture'ları sistem temp dizinine yönlendirilir. İlk
disposable provada cleanup kapsamı hatası nedeniyle 612 fake dev PDF fixture'ı
silinmiş ve read-only DB kayıtlarından yeniden üretilmiştir. DB satırı veya
migration verisi kaybı olmamıştır.

Closeout kontrolünde 612 DB referansının tamamının fiziksel dosyası, pozitif
boyutu ve `%PDF-` imzası doğrulandı; missing, duplicate path, path traversal ve
carrier/document orphan bulunmadı. Fixture dizinindeki `carrier_documents`
tarafından referanslanmayan 314 mevcut dosyaya dokunulmadı. Aynı üreticiyle
izole temp dizininde yeniden oluşturulan 612 dosyanın relative path, boyut ve
SHA-256 değerleri mevcut referanslı setle birebir eşleşti. Olay öncesine ait
bir SHA-256 manifesti bulunmadığından, yeniden üretilen dosyaların silinen
orijinallerle tarihsel byte-for-byte eşitliği kanıtlanamaz.

M1A smoke cleanup'ı artık yalnız kendi oluşturduğu, rastgele marker ile
doğruladığı sistem temp dizininde çalışır. Boş, göreli, parent, filesystem
root, repo/proje ve gerçek upload hedefleri reddedilir. Realpath kontrolü
temp dışına çıkan symlink/junction hedeflerini reddeder. Marker veya içerik
sınırı uyuşmazlığında hiçbir fixture silinmeden fail-closed davranılır;
doğrulanmamış bir hedefte recursive delete kullanılmaz.

## `tasiburada_dev` sonucu

- Migration önce/sonra: `1 → 2`
- Legacy/pending migration: `0 / 0`
- Shipment satırı: `2000 → 2000`
- Shipment primary-key hash'i değişmedi.
- Offer/carrier document/customer/carrier sayımları değişmedi.
- Category: `1000 HOME_MOVE`, `300 OFFICE_MOVE`, `600 PARTIAL_ITEM`,
  `100 NULL`
- Route: `819 INTRACITY`, `1181 INTERCITY`
- Mapping mismatch: `0`
- Session timezone: `+00:00`
- Health endpoint: HTTP `200`, `success=true`
- Final M1A fingerprint:
  `595aba7c84f64920c04b63b0b315404744bb288b109ea5c89024d0db00344ed7`

Mevcut M0B-2B SQL backup repo dışında ve doğrulanmış hash'iyle korunmaktadır.

## V1 baseline ve rollback uyarısı

Canonical V1 baseline migration, stored
`canonical-v1-schema-manifest.json` ve legacy migration dosyaları
değiştirilmemiştir. Stored manifest M0 canonical V1 başlangıç noktasını
temsil etmeye devam eder; M1A fingerprint'iyle eşleşmesi beklenmez.

`down()` yalnız M1A'nın index/unique, CHECK ve kolonlarını ters bağımlılık
sırasıyla kaldırır. Yeni kolonlardaki veriyi kaybeder ve otomatik rollback
stratejisi olarak kullanılmamalıdır. Canonical baseline `down()` çağrılmaz.

Bu görev kapsamında push yapılmamıştır.
