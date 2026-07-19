# Canonical V1 Schema Baseline

## Karar

M0A için canonical kaynak, yerel `tasiburada_dev` veritabanının 19 Temmuz
2026 tarihinde gözlenen fiziksel şemasıdır. Manifest MySQL 8.0.46 üzerinden
yalnız read-only bağlantıyla üretilmiştir. Kullanılan sorgular `SELECT
VERSION()`, `information_schema` seçimleri, tablo başına `SHOW INDEX` ve
`migrations` tablosu seçimleriyle sınırlıdır.

Canonical manifest:
`docs/database/canonical-v1-schema-manifest.json`

Canonical schema fingerprint:
`aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1`

Fingerprint yalnız sıralanmış fiziksel tablo şemalarından hesaplanır; buna
`migrations` tablosunun fiziksel tanımı da dahildir. `generatedAt`, manifest
şema sürümü, veritabanı adı ve varsayılanları, MySQL sürümü ve applied migration
geçmişi fingerprint projeksiyonunun dışındadır. Applied migration kayıtları
manifestte provenance olarak ayrıca saklanır. Verify modu provenance farkını
fiziksel schema mismatch olarak değil ayrı bir warning olarak raporlar.

## Migration zinciri durumu

Repository'de 65 kaynak migration sınıfı, mevcut V1 veritabanında ise 81
applied migration kaydı vardır. Mevcut 65 kaynak migration sınıfının tamamı
applied kayıtlarda bulunur. Buna karşılık aşağıdaki 16 applied migration
kaydının güncel repository'de karşılık gelen kaynak dosyası yoktur:

- `AddCarrierSubmitAndOfferCancelled1776100000000`
- `AddDefinitionStatus1776103323263`
- `CarrierVehicleAndAvailableDates1775295648687`
- `CleanCarrierVehicleFields1776250020000`
- `CleanupShipmentLegacyFields1776300000000`
- `CreateCarrierVehicles1776200000002`
- `CreateCarrierVehiclesTable1776250010000`
- `CreateExtraServicesTables1776200000004`
- `DocumentVerificationUpdates1776280000000`
- `DropProfileCompletionFromCarriers1776270000000`
- `RefactorExtraServices1776260000000`
- `RefactorShipments1776260010000`
- `RemoveVehicleFieldsFromCarriers1776200000003`
- `UpdateShipmentsTable1776200000005`
- `UpdateVehicleTypes1776200000001`
- `UpdateVehicleTypesMetadata1776250000000`

Bu nedenle mevcut legacy migration zinciri fiziksel V1 şemasını sıfırdan
eksiksiz ve deterministik biçimde yeniden kurabilen canonical bir tarihçe
değildir. M0A, legacy dosyaları taşımadan veya silmeden fiziksel şemayı
makinece karşılaştırılabilir canonical kaynak olarak sabitler.

## M0B kullanımı

M0B-1 baseline migration'ı
`CanonicalBaselineV11784500000000` (`1784500000000`) adıyla
`src/infrastructure/database/canonical-migrations/` klasöründe oluşturulmuştur.
Migration yalnız 46 canonical V1 uygulama tablosunu oluşturur; TypeORM
`migrations` tablosunu kendisi yönetir. Hedef schema fingerprint'i
`aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1`
değeridir.

Baseline, mutation öncesinde yalnız boş schema veya TypeORM tarafından
oluşturulmuş tek `migrations` tablosunu kabul eder. Başka bir tablo varsa
`CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA` hatası verir. `down()` tablo
silmez; `CANONICAL_BASELINE_IS_IRREVERSIBLE_USE_DISPOSABLE_DATABASE_RESET`
hatasıyla disposable database reset stratejisini zorunlu kılar. Bu nedenle
baseline için bir FK/table drop sırası uygulanmaz; rollback bütün disposable
veritabanının guard kontrollü resetidir.

From-zero smoke testi `tasiburada_m0b_0719a_test` üzerinde geçmiştir: toplam
47 tablo, 482 kolon, 127 index, 45 foreign key, 34 unique constraint ve 2
CHECK constraint üretilmiş; UTC session, tek canonical migration kaydı ve
hedef fingerprint doğrulanmıştır. İkinci migration koşusunda pending migration
kalmamıştır. Tarihsel applied migration farkı yalnız provenance warning'i
üretmiştir. Ayrı non-empty smoke testi
`tasiburada_m0b_preflight_0719a_test` üzerinde mutation öncesinde beklenen
hatayı vermiştir. Her iki disposable veritabanı test sonunda silinmiştir.

Manifest yalnız şema metadata'sı ve applied migration metadata'sı içerir.
Tablo satır verisi, kişisel veri, credential, secret, connection string veya
makineye özel mutlak yol içermez. Tam DDL bu belgede tekrar edilmemiştir.

Bu M0A çalışmasında mevcut V1 veritabanı değiştirilmemiş; migration, seed,
entity synchronization veya başka bir veritabanı mutation'ı
çalıştırılmamıştır. Runtime migration yolu, legacy migration dosyaları,
`synchronize: false` ayarı ve mevcut DataSource timezone davranışı
değiştirilmemiştir.

M0B-1 runtime cutover değildir. Mevcut runtime DataSource hâlâ legacy migration
yolunu kullanır. M0B-2 onayı olmadan `tasiburada_dev` reset, migration veya
cutover işlemi yapılmayacaktır.
