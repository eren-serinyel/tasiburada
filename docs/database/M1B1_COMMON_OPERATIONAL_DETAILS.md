# M1B-1 Ortak Operasyon Bilgileri

## Mark'ın form ilkesi

Müşteri önce taşıma kategorisinden bağımsız, nakliyecinin işi anlaması için
gereken ortak operasyon bilgilerini verir. Kategoriye özel ayrıntılar sonraki
adımda sorulur. M1B-1 kesin hacim, fiyat, slot veya satın alma kararı üretmez;
tarih, rota uygunluğu, araç ve ekip ihtiyacı için güvenilir sinyal sağlar.

## Kapsam

M1B-1:

- Mevcut tercih tarihine canonical esneklik kodu ve gerçek tarih aralığı ekler.
- Çıkış ve varış operasyon koşullarını
  `shipment_location_conditions` altında ayırır.
- Kat, elevator tipi, araç yaklaşımı ve üç kısıt sinyalini kategori
  modelinden bağımsız tutar.

HOME/OFFICE/PARTIAL detail tabloları, ShipmentRound/snapshot, pricing, slot,
purchase, payment ve media yapıları M1B-2 veya sonraki paketlere bırakılmıştır.

## V1 kaynak incelemesi

`shipments.shipment_date` müşterinin tercih tarihini zaten kaydeder ve dev
DB'deki 2.000 satırın tamamında doludur. Bu nedenle aynı anlamı taşıyan
`preferred_move_date` adlı ikinci bir kolon eklenmemiştir.

Kullanılabilen kayıpsız V1 kaynaklar:

- `origin_floor` → ORIGIN `floor_number`
- `destination_floor` → DESTINATION `floor_number`
- `shipment_date` ve üç değerli legacy `date_flexibility` → canonical tarih
  kodu ve tarih aralığı

Şehir ve ilçe kolonları zaten `shipments` üzerindedir; ikinci kez
saklanmamıştır. Mahalle kolonu ne `shipments` ne de `customer_addresses`
tablosunda vardır. Mevcut müşteri notu `shipments.note`, açık adres alanları
ise iki `*_address_text` kolonudur.

İncelemede beş önceden var olan entity–DB drift alanı görüldü:
`load_profile`, iki `*_access_distance` ve iki `*_address_id` entity'de
tanımlı olduğu hâlde fiziksel dev DB'de yoktur. Bu alanlar M1B-1 backfill
kaynağı kabul edilmemiş ve kapsam dışı fiziksel kolonlar sessizce
oluşturulmamıştır.

## Tarih ve esneklik modeli

Canonical kodlar:

- `EXACT_DATE`
- `PLUS_MINUS_1_DAY`
- `PLUS_MINUS_3_DAYS`
- `ANY_DAY_IN_SELECTED_WEEK`
- `UNDECIDED`

Yeni `date_flexibility_code`, `date_window_start` ve `date_window_end`
kolonları nullable ve defaultsuzdur. Tercih tarihi mevcut `shipment_date`
kolonudur. Window çiftinin birlikte null/dolu olması ve başlangıcın bitişten
sonra olmaması DB CHECK'leriyle korunur. Exact ve seçili hafta temel
semantiği de DB'de doğrulanır; ±1/±3 kesin aralık üretimi ortak TypeScript
helper'ında deterministiktir.

Mevcut `date_flexibility` V1 uyumluluğu için korunmuş legacy read-only
alandır. Bundan sonraki V2 tasarımı canonical `date_flexibility_code`,
`date_window_start` ve `date_window_end` alanlarını kullanacaktır. M1B-1
mevcut public V1 create/update akışını değiştirmediği için bu akış yalnız
legacy alanı yazmaya devam eder; canonical alanlara kontrolsüz dual-write
yapmaz. Gelecekte de legacy ve canonical tarih alanları arasında kalıcı
dual-write kurulmayacaktır.

Dev backfill'inde legacy `EXACT` değerleri `EXACT_DATE` olmuş, window başlangıç
ve bitişi mevcut tercih tarihine eşitlenmiştir.

## Location condition modeli

Her shipment için en fazla bir ORIGIN ve bir DESTINATION satırı vardır.
`UNIQUE (shipment_id, side_code)` bu sınırı korur. Shipment FK'si
`ON DELETE CASCADE / ON UPDATE RESTRICT` kullanır.

Alanlar:

- `floor_number`: nullable `SMALLINT`, `-10..200`
- `elevator_type_code`: NONE, STANDARD, FREIGHT, NOT_SUITABLE, UNKNOWN
- `vehicle_access_distance_code`: AT_ENTRANCE,
  BETWEEN_20_AND_50_METERS, OVER_50_METERS, UNKNOWN
- Nullable narrow-street, site-entry ve time-restriction boolean sinyalleri
- Public seçime kapalı, 500 karakterle sınırlı `restriction_note`

Restriction note domain validator'ı telefon, e-posta, URL, HTML ve açık adres
göstergelerini reddeder. Bu pakette alanı yazan public endpoint yoktur.

## Backfill ve nullable geçiş

Kat bilgisi birebir kopyalandı. Legacy elevator boolean'ı güvenli canonical
tip üretmez: `true` STANDARD/FREIGHT ayrımını kanıtlamaz; `false` ise mevcut
create akışında cevap verilmediğinde de varsayılanlanmıştır. Bu nedenle
elevator tipi backfill'de NULL bırakılmıştır.

Fiziksel access-distance ve bina/site restriction kaynağı bulunmadığından
AT_ENTRANCE veya sahte `false` üretilmemiş; bu alanlar da NULL kalmıştır.
Yeni seed akışı M1B-1 şeması mevcutsa tutarlı ve çeşitli canonical değerler
üretir, şema henüz yoksa eski seed davranışını korur. Clear envanteri yeni
child tabloyu `shipments` parent'ından önce temizler.

## Mahalle ve görünürlük

Mahalle bu şemaya eklenmemiştir. Gelecekte saklanabilse bile anonymous veya
pre-purchase DTO'ya çıkmayacaktır. Mevcut carrier invite projection şehir,
ilçe ve ortak V1 operasyon alanlarını içerir; açık adresi içermez. Shipment
service atanmamış carrier için mevcut açık adres maskelemesini korur.

M1B-1 public DTO, controller, endpoint ve frontend formunda değişiklik
yapmamıştır. Yeni entity relation eager değildir; restriction note otomatik
select edilmez.

## Migration ve doğrulamalar

- Timestamp: `1784660000000`
- Migration:
  `AddShipmentOperationalConditions1784660000000`
- Registry: baseline → M1A → M1B-1

From-zero disposable:

- DB: `tasiburada_m1b1_zero_143614_test`
- Canonical/legacy/pending: `3 / 0 / 0`
- Tablo/kolon/index/FK/unique/CHECK:
  `48 / 499 / 133 / 46 / 36 / 15`
- Session timezone: `+00:00`
- DB doğrulama sonunda silindi.

Seeded upgrade disposable:

- DB: `tasiburada_m1b1_upgrade_143648_test`
- Shipment: `2000 → 2000`
- Shipment primary-key fingerprint'i korundu.
- ORIGIN/DESTINATION: `2000 / 2000`
- Kat aralığı iki tarafta `0..15`, mapping mismatch `0`
- Elevator/access/restriction backfill: `4000 NULL`
- Legacy/pending: `0 / 0`
- Seed ve orphan invariant'ları geçti.
- İzole 615 PDF temizlendi ve DB silindi.

M1B-1 fiziksel schema fingerprint'i:

`375a143c11f6cc915d13aca456726b3b07e0396aa9fc36dbc47f981464997bbb`

## `tasiburada_dev` sonucu

- Migration: `2 → 3`
- Legacy/pending: `0 / 0`
- Shipment: `2000 → 2000`
- Shipment primary-key fingerprint'i değişmedi.
- ORIGIN/DESTINATION: `2000 / 2000`
- Kat mapping mismatch ve location orphan: `0 / 0`
- Tarih: `2000 EXACT_DATE`
- Elevator/access: `4000 NULL`
- Session timezone: `+00:00`
- Health endpoint: HTTP `200`, `success=true`
- Fingerprint disposable sonuçlarla aynı.

M0B backup repo dışında, beklenen boyut ve SHA-256 ile korunmaktadır. Dev
fixture dizinindeki DB carrier-document kayıtlarınca referanslanmayan 314
dosya bu pakette değiştirilmemiştir.

## Rollback uyarısı

`down()` yalnız M1B-1 tablosu, CHECK'leri ve üç yeni shipment kolonunu ters
bağımlılık sırasıyla kaldırır. Location ve canonical date-window verisini
kaybedeceğinden production rollback stratejisi değildir. Legacy V1 alanlarına,
M1A kolonlarına veya canonical baseline `down()` akışına dokunmaz.

Bu görev kapsamında commit veya push yapılmamıştır.
Final review öncesinde tamamlanan migration, seed, disposable DB ve health
kanıtları commit hazırlığı sırasında tekrar çalıştırılmamıştır.
