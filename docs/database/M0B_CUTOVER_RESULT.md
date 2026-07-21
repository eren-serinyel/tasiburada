# M0B-2B Canonical Runtime Cutover Sonucu

## Kimlik

- Cutover tarihi: 20 Temmuz 2026 (`Europe/Istanbul`)
- Başlangıç HEAD: `80e95f77abdcd1f4ca6dad3ae7f110adcc2cc8b4`
- Canonical migration: `CanonicalBaselineV11784500000000`
- Canonical schema fingerprint:
  `aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1`

## Backup ve restore doğrulaması

- Repo dışında tam schema, data ve migration history dump'ı alındı.
- Güvenli dosya adı:
  `tasiburada_dev_before_m0b2b_20260719-234343.sql`
- Boyut: `11013264` byte
- SHA-256:
  `e315253ed05db612fbd5c7c52248d2883d3330f995d32dc63cb69b2805933ab9`
- Dump, `tasiburada_m0b2b_restore_2344_test` disposable DB'sine hatasız
  restore edildi.
- Restore edilen şemanın fingerprint'i canonical değerle eşleşti.
- 46 uygulama tablosunun row count'ları kaynak DB ile birebir eşleşti.
- Kritik katalog natural-key setleri ve 81 satırlık eski V1 migration history
  birebir eşleşti.
- Restore disposable DB doğrulama sonunda silindi.
- Dump hash'i restore sonrasında değişmedi ve dump repo dışında korundu.

Bu belge dump'ın tam kişisel yolunu, dump içeriğini, credential veya connection
string içermez.

## Runtime cutover

- Runtime DataSource legacy migration glob'u yerine ortak canonical migration
  registry'sine geçirildi.
- Registry yalnız `CanonicalBaselineV11784500000000` migration'ını yükler.
- `synchronize=false` ve `migrationsRun=false` korunmuştur.
- Runtime timezone `+00:00` yapılmıştır.
- Her yeni MySQL bağlantısında session timezone `+00:00` olarak kurulup
  initialize sırasında sorguyla doğrulanır.
- Global MySQL ve işletim sistemi timezone ayarları değiştirilmedi.
- Runtime davranışı önce `tasiburada_m0b2b_runtime_2350_test` disposable DB'sinde
  başarıyla sınandı; DB doğrulama sonunda silindi.

## Fresh `tasiburada_dev` sonucu

- Database charset/collation: `utf8mb4` / `utf8mb4_unicode_ci`
- MySQL: `8.0.46`
- Runtime session timezone: `+00:00`
- Uygulama tablosu: `46`
- Toplam tablo: `47`
- Kolon: `482`
- Index: `127`
- Foreign key: `45`
- Unique constraint: `34`
- CHECK constraint: `2`
- Canonical migration: `1`
- Legacy migration: `0`
- Pending migration: `0`
- Final fingerprint:
  `aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1`

## Seed ve smoke sonucu

- Runtime clear/seed workflow başarıyla tamamlandı; `migrations` tablosu ve
  canonical migration satırı korundu.
- Kritik sayımlar: `admins=2`, `carriers=150`, `customers=400`,
  `shipments=2000`, `offers=6811`, `extra_services=13`.
- Kritik katalog natural-key setleri beklenen değerlerle eşleşti.
- Hedefli duplicate ve orphan sorgularının tamamı sıfır sonuç verdi.
- Seed sonrasında fiziksel schema fingerprint'i canonical değerle eşleşti.
- Runtime DataSource initialize, session timezone, pending migration ve katalog
  read kontrolleri geçti; bağlantı temiz biçimde kapatıldı.
- Mevcut `GET /api/v1/health` endpoint'i geçici backend sürecinde HTTP `200` ve
  `success=true` döndürdü; süreç test sonunda kapatıldı.

## Koruma ve Git durumu

- Canonical baseline migration, stored canonical manifest ve legacy migration
  dosyaları değiştirilmedi veya silinmedi.
- Eski V1 dump repo dışında tutulmaktadır ve Git'e eklenmemiştir.
- Korunan untracked review dosyalarına dokunulmamıştır.
- Bu cutover görevi kapsamında commit veya push yapılmamıştır.
