# M0B Runtime Cutover Runbook

## 1. Kapsam

Bu runbook, M0B-2B'de yapılabilecek development runtime cutover için kontrol
listesidir. M0B-2A yalnız disposable prova, read-only preflight ve hazırlık
üretir; gerçek cutover yapmaz.

## 2. M0A/M0B-1 referans commitleri

- M0A: `952653bf2ca4055467204f6161ffa29c35716da8`
- M0B-1: `6c8781f5df0b8a686e17ef6fe02316e05c44baef`

## 3. Canonical kimlik

- Migration: `CanonicalBaselineV11784500000000`
- Timestamp: `1784500000000`
- Schema fingerprint:
  `aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1`

## 4. Eski geçmiş neden yerinde dönüştürülmez

81 tarihsel migration satırı ile tek canonical baseline satırı aynı provenance
değildir. Fiziksel şema aynı olsa bile mevcut `migrations` geçmişini yeniden
yazmak audit izini belirsizleştirir; baseline ayrıca boş schema preflight'ı
uygular ve dolu DB'ye yerinde uygulanamaz.

## 5. Fresh reset gerekçesi

Canonical baseline tek ve from-zero bir V1 tanımıdır. Güvenli geçiş, mevcut
development DB'yi yerinde yamalamak yerine açık onaydan sonra fresh schema
üzerinde baseline uygulamaktır.

## 6. Fake/seed veri doğrulaması

Preflight yalnız yaklaşık tablo sayıları verir ve verinin kaynağını tahmin
etmez. Veri sahipliği; ekip kaydı, harici sistem bağımlılıkları ve gerekirse
yetkili kişinin manuel örneklemesiyle doğrulanır. Kanıt yoksa durum
`doğrulanamadı` kabul edilir ve destructive onay verilmez.

## 7. Git/worktree koşulları

Beklenen branch/HEAD kaydedilir, tracked worktree temiz olmalı ve M0A/M0B-1
commitleri erişilebilir olmalıdır. Korunan untracked review dosyaları hiçbir
DB komutuna veya commit kapsamına alınmaz.

## 8. Uygulamayı durdurma

Runtime süreçleri, worker'lar ve DB'ye yazabilen yerel araçlar durdurulur.
Cutover penceresinde yeni yazı kabul edilmez.

## 9. Read-only preflight

`NODE_ENV=development`, loopback host, `DB_NAME=tasiburada_dev` ve
`M0B_CUTOVER_PREFLIGHT_DATABASE=tasiburada_dev` açıkça ayarlanarak
`npm run db:m0b:cutover:preflight` çalıştırılır. Yalnız
`READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL` sonraki review'a adaydır; bu kod
tek başına destructive yetki değildir.

## 10. Backup kararı

Veri fake olduğuna dair kesin kanıt yoksa backup kararı veri sahibi tarafından
verilir. Alınan dump repo, çalışma ağacı ve review bundle dışında, erişimi
kısıtlı bir konumda tutulur; runbook backup üretmez.

## 11. Açık destructive confirmation

Hedef DB adı, yedek kararı, kayıp kabulü, Git HEAD ve preflight çıktısı tek bir
M0B-2B review paketinde sunulur. Ayrı ve hedefe özgü insan onayı olmadan
destructive adım başlatılmaz.

## 12. Dev DB yeniden oluşturma

Bu adım M0B-2B'ye aittir. Onaylı süreç yalnız `tasiburada_dev` hedefini ele
almalı, hedef varlığı ve bağlantı sınıfını yeniden kontrol etmeli ve başka
schema'lara dokunmamalıdır.

## 13. Runtime migration yolu

Runtime migration kaynağının legacy zincirden canonical dizine geçirilmesi
M0B-2B'de ayrı diff ve review ile yapılır. M0B-2A runtime DataSource'u
değiştirmez.

## 14. Runtime timezone

Runtime timezone'un `+00:00` yapılması M0B-2B değişikliğidir ve uygulama tarih
semantiğiyle birlikte review edilir. M0B-2A mevcut `+03:00` değerini korur.

## 15. Canonical baseline

Fresh schema üzerinde yalnız tek canonical migration yüklenir. Beklenen
migration adı ve timestamp bölüm 3 ile birebir doğrulanır.

## 16. Seed

Baseline doğrulandıktan sonra seed explicit hedef, loopback ve reset/seed
izinleriyle çalıştırılır. Runtime legacy migration glob'u seed harness
tarafından yüklenmez.

## 17. Schema fingerprint

Seed öncesi ve sonrası fiziksel fingerprint bölüm 3'teki değerle eşleşmelidir.
Provenance farklılığı schema mismatch sayılmaz; fiziksel fark hard blocker'dır.

## 18. Migration history

Fresh DB'de canonical migration sayısı 1, legacy migration sayısı 0 olmalıdır.
Clear işlemi `migrations` tablosunu veya canonical satırı temizlememelidir.

## 19. Seed invariantları

Kritik kataloglar dolu, natural-key setleri beklenen, duplicate grupları ve
orphan ilişkiler sıfır olmalıdır. Random UUID eşitliği aranmaz.

## 20. Application smoke

M0B-2B sonrasında uygulama kontrollü biçimde başlatılır; bağlantı, giriş,
lookup okuma ve temel V1 akışları hedefli smoke ile doğrulanır. Geniş suite
cutover komutunun parçası yapılmaz.

## 21. Rollback stratejisi

Rollback, eski migration zincirini yeni DB üzerinde yeniden çalıştırmak
değildir. Cutover öncesi repo dışında alınmış dump varsa restore edilir.
Yalnız fake veri için onaylı fresh reset tercih edilebilir. Baseline
`down()` kullanılmaz.

## 22. Başarısızlıkta yapılmayacaklar

Manuel SQL yaması, manifest/baseline değişikliği, missing-table hatasını
gizleme, provenance satırlarını elle düzenleme ve legacy/canonical zincirleri
karıştırma yapılmaz. Kaynak hata düzeltilip süreç baştan doğrulanır.

## 23. Commit ve push sırası

M0B-2A hazırlığı ayrı committe kapanır. M0B-2B runtime cutover kodu ayrıca
review edilir; doğrulama sonuçları kaydedilmeden commit ve push yapılmaz.
Veritabanı backup'ı hiçbir zaman Git'e eklenmez.

## 24. M0B-2B durumu

M0B-2B henüz uygulanmamıştır. Bu repoda çalışan destructive cutover execute
komutu yoktur; runtime DataSource, timezone ve legacy migration yolu mevcut
durumunu korur.
