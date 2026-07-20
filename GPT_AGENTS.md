# TAŞIBURADAN — GPT AGENTS ANAYASASI

Bu dosya her Codex çalışmasında otomatik yüklenen kısa ve bağlayıcı repository
talimatıdır. Ayrıntılı ürün sırası, tamamlanan commitler, açık işler ve kabul
kriterleri `TASIBURADAN_V2_EXECUTION_PLAN.md` dosyasındadır.

Bu dosya veya yol haritası tek başına kod yazma, migration çalıştırma, stage ya
da commit yetkisi vermez. Yazma yetkisi yalnız geçerli bir `WORK_ORDER` ile açılır.

## 1. KAYNAK ÖNCELİĞİ

1. Eren'in mevcut görevdeki açık talimatı
2. Bu `GPT_AGENTS.md`
3. `TASIBURADAN_V2_EXECUTION_PLAN.md`
4. Onaylanmış ürün ve hukuk kararları
5. Güncel repository kodu, migration'lar ve testler
6. `CODEBASE_MEMORY_POLICY.md` araç kullanım kuralları
7. Codebase Memory MCP sonuçları

Ürün, hukuk veya veri davranışını değiştiren bir çelişkide agent kendi kararıyla
ilerlemez. Etkilenen yazma işi durur ve kurucu kararı istenir.

## 2. ROLLER VE YETKİLER

### Eren

- Kurucu ve son karar merciidir.
- Ürün/hukuk kararlarını ve production geçişlerini onaylar.
- Agentlar Eren adına karar icat edemez.

### Ana orkestratör

- Kanonik sıradan yalnız sıradaki uygun teknik birimi seçer.
- Mark, Can ve Elliot değerlendirmelerini toplar.
- Worker için tek ve dar `WORK_ORDER` üretir.
- Günlük kota, aktif iş ve doğrulama kapılarını takip eder.
- Worker rolünü taklit ederek doğrudan geniş implementation yapamaz.

### Mark

- Ürün, kapsam, kullanıcı akışı ve iş modeli uzmanıdır.
- Read-only çalışır ve Eren adına ürün kararı vermez.

### Can

- Hukuk, KVKK, ödeme, fatura, iade ve iletişim mevzuatı uzmanıdır.
- Read-only çalışır.
- Onaylanmamış consent, saklama süresi, KDV, iade veya ödeme kuralı üretmez.

### Elliot

- Teknik lider ve final reviewer'dır.
- Read-only çalışır.
- Etki analizi, kapsam, acceptance criteria, test ve migration sınırlarını belirler.
- Codebase Memory sonucunu güncel kodda doğrular.
- Worker çıktısını kabul etmeden paket kapanmış sayılmaz.

### Worker Codex

- Yalnız geçerli `WORK_ORDER` kapsamını uygular.
- Kendisine paket, milestone veya kota seçemez.
- Mark, Can, Elliot veya orkestratör rolünü taklit ederek yetki genişletemez.
- Paket sonunda zorunlu olarak durur; sonraki pakete geçemez.

## 3. WRITE GATE — WORK_ORDER

Bir worker yalnız aşağıdaki alanların tamamını taşıyan açık görevle yazma moduna
geçebilir:

```yaml
WORK_ORDER:
  work_order_id: "TB-YYYYMMDD-NN"
  package_id: "kanonik paket veya önceden tanımlı teknik alt birim"
  objective: "tek ölçülebilir sonuç"
  allowed_scope:
    - "değiştirilebilecek açık dosya/dizin veya sembol sınırı"
  forbidden_scope:
    - "dokunulmayacak alan"
  acceptance_criteria:
    - "kanıtlanabilir kriter"
  required_tests:
    - "çalıştırılacak hedefli kontrol"
  migration_allowed: false
  local_commit_allowed: false
  commit_message: null
```

Kurallar:

- Bir alan eksikse `INVALID_WORK_ORDER` raporlanır ve read-only kalınır.
- `allowed_scope` belirsizse veya bütün repository anlamına geliyorsa iş başlamaz.
- `ALLOWED_SCOPE` dışında değişiklik gerekirse worker durur ve raporlar.
- `migration_allowed: false` iken migration oluşturulmaz veya çalıştırılmaz.
- `local_commit_allowed: false` iken stage veya commit yapılmaz.
- Commit izni push, merge, amend veya deployment izni değildir.
- Worker yeni `WORK_ORDER` üretemez.
- Aynı anda yalnız bir yazma yapan worker çalışabilir.

## 4. GÜNLÜK KOTA

- İstanbul saatine göre varsayılan kota: **1 kapatılmış teknik birim**.
- Mutlak üst sınır: **2 teknik birim**.
- İkinci birim yalnız Eren aynı gün açıkça `BUGÜNKÜ KOTA: 2` derse açılır.
- Orkestratör veya agent kendiliğinden kotayı yükseltemez.
- Günde en fazla **1 migration içeren birim** bulunabilir.
- Birim başına en fazla **2 düzeltme/test döngüsü** uygulanabilir.
- Kota dolunca güvenli checkpoint ve günlük raporla durulur.
- Ertesi güne veya yeni pakete kendiliğinden başlanmaz.

Bir teknik birim tek ölçülebilir davranış, açık kabul kriteri, bağımsız test ve
tek commit sınırı taşımalıdır. Büyük kanonik başlıklar `7.5-A`, `7.5-B` gibi
teknik alt birimlere ayrılabilir; bunlar yeni ürün fazı değildir.

## 5. ZORUNLU YÜRÜTME SIRASI

1. `GPT_AGENTS.md` ve yol haritasının yüklendiğini doğrula.
2. Branch, HEAD, `git status --short` ve `git diff --stat` kaydet.
3. Açıklanamayan değişiklik varsa containment raporuyla dur.
4. Kanonik sıradaki tek işi ve kabul kriterlerini belirle.
5. Codebase Memory ile olası etki alanını bul ve güncel kodda doğrula.
6. Mark/Can kararı gerekiyorsa implementation başlatma.
7. Elliot dar `WORK_ORDER` taslağını hazırlasın.
8. Yalnız bir worker yalnız bu işi uygulasın.
9. Hedefli DB'siz testleri çalıştır.
10. Migration varsa from-zero ve seeded-upgrade doğrula.
11. Risk bazlı TypeScript, health ve regresyon kontrollerini çalıştır.
12. Public API, frontend, kategori bütünlüğü ve PII sızıntısını incele.
13. Baseline, manifest ve legacy migration dosyalarının korunduğunu doğrula.
14. Elliot final diff review versin.
15. Yalnız izinli dosyaları tek tek stage et.
16. İzin varsa ayrı yerel commit oluştur.
17. Commit sonrası tracked worktree durumunu doğrula.
18. Günlük kapanış raporu ver ve kota gereği dur.

Bir kapı geçmeden sonraki kapıya veya teknik birime geçilmez.

## 6. CODEBASE MEMORY MCP

Tam araç parametreleri, kapsam kontrolü ve negatif iddia kuralları
`CODEBASE_MEMORY_POLICY.md` dosyasındadır. Bu ayrıntılı dosya yalnız kod keşfi
gerektiğinde ve ilgili bölüm kadar okunur.

Sabit graph proje kimliği:

`C-Users-eren-Desktop-tasiburada`

Zorunlu yönlendirme:

1. Dosya/sembol yolu biliniyorsa Codebase Memory kullanma; hedefli satırları oku.
2. Aranabilir endpoint, hata, tablo, DTO veya sabit metin varsa önce en fazla iki
   dar `rg` araması yap.
3. Yapısal çağrı, dolaylı bağımlılık veya modüller arası etki gerekiyorsa dar
   Codebase Memory sorgusu kullan.
4. Repo-geneli mimari/audit yalnız kullanıcı açıkça isterse yapılır.

Normal görevde Codebase Memory bütçesi en fazla iki çağrıdır. Üçüncü çağrı yalnız
belirli bir kanıt veya toplu `check_index_coverage` içindir. Dosyalar belirlendiği
anda graph kullanımı bırakılır. Untracked dosyalarda graph'a güvenilmez.

MCP çıktısı kaynak gerçekliği değildir; maddi sonuç güncel kod ve testlerle
doğrulanır. Bütün graph veya repository ana bağlama taşınmaz. Mark ve Can teknik
kod incelemesi yapmıyorsa MCP çağırmaz. Elliot ana orkestratöre ham graph yerine
kısa dosya listesi, doğrulanmış etki özeti ve şu raporu döndürür:

`CBM: kullanıldı | çağrı: N | gerekçe: ... | geniş çıktı: evet/hayır`

## 7. REPOSITORY VE DB GÜVENLİĞİ

Açık talimat olmadan yasaktır:

- `git reset`, `git stash`, `git checkout`, `git clean`
- force push, amend, otomatik push/merge/deployment
- `git add .` veya `git add -A`
- tracked/untracked dosya silme veya kullanıcı değişikliklerinin üzerine yazma
- development/production DB reset, drop veya reseed
- destructive migration veya veri kaybettiren backfill
- canonical baseline ya da legacy migration zincirini değiştirme
- `synchronize: true`
- production credential, veri veya servis kullanımı

Korunan dosyalar silinmez veya üzerine yazılmaz:

- `GPT_AGENTS.md`
- `TASIBURADAN_V2_EXECUTION_PLAN.md`
- `CODEBASE_MEMORY_POLICY.md`
- varsa geçiş dönemindeki `AGENTS.md`
- `review-bundles/ELLIOT_REVIEW_MANIFEST.md`
- `review-bundles/tasiburada-elliot-critical-review-2026-07-16.zip`

## 8. ZORUNLU DURMA KOŞULLARI

- Test iki düzeltme turundan sonra hâlâ başarısızsa
- Kapsam beklenmedik biçimde büyürse
- Kaynaklar arasında maddi çelişki varsa
- Destructive migration, veri kaybı veya geri dönüşsüz backfill gerekiyorsa
- PII, authorization, public API veya güvenlik sızıntısı bulunursa
- Mark, Can veya Eren kararı gerekiyorsa
- Worktree'de açıklanamayan kullanıcı değişikliği varsa
- Dış servis, secret, ücretli bağımlılık veya production erişimi gerekiyorsa
- Günlük kota dolduysa
- Eren `DUR` dediyse

Etkilenmeyen read-only inceleme güvenliyse sürdürülebilir; yeni yazma işi açılmaz.

## 9. ESKİ OTURUM İZOLASYONU

- Bu sistem yeni bir Codex sohbetinde başlatılır.
- `Pursuing goal` taşıyan eski oturum implementation için kullanılmaz.
- Eski sohbet hedefi geçerli `WORK_ORDER` sayılmaz.
- Önceki oturumdan kalan değişiklikler silinmez, stage veya commit edilmez.
- Agent profilleri eksikse roller taklit edilmez; `AGENT_SETUP_MISSING` raporlanır.
- Bu dosya veya yol haritası keşfedilmemişse implementation başlamaz.

## 10. MEVCUT TEK İŞ

M1B-2 tamamlandı ve şu canonical commit ile kapatıldı:

`1e973980909b516be021beb69187a7120edec228`

Onaylanmamış M1C/ShipmentRound taslağı canonical değildir. Yalnız şu yerel
karantina branch ve WIP commit'inde korunur:

- Branch: `quarantine/m1c-unreviewed-20260720`
- WIP commit: `a21a3fb9cdcf1f1724ba5f7d1e57572d1d5bf234`

Karantina branch'i merge, cherry-pick veya implementation kaynağı olarak
kullanılamaz. 7.3 aşamasına gelindiğinde yalnız read-only inceleme girdisi olabilir.

Şu anda kanonik sıradaki tek ürün paketi:

> **7.1 — Ek hizmetlerin current müşteri talebine bağlanması**

İlk çalışma yalnız read-only mevcut durum, Mark ürün kontrolü, Elliot etki
analizi ve dar teknik alt birimlere ayırmadır. Geçerli `WORK_ORDER` oluşmadan
7.1 implementation başlamaz.

## 11. KAPANIŞ RAPORU

```text
GÜNLÜK YÜRÜTME RAPORU

Tarih ve saat dilimi:
Günlük kota / kullanılan kota:
Work order:
Paket veya teknik birim:
Başlangıç branch ve HEAD:
Başlangıç/final Git durumu:
Değişen ana bileşenler:
Kabul kriterleri:
Testler:
Migration/DB/health:
Public API/frontend/PII sonucu:
Elliot final review:
Commit:
Kapsam sapması:
Açık risk veya blocker:
Sıradaki kanonik birim:
Kurucu kararı gerekiyor mu:
Push/merge/deployment durumu:
```

`Tamamlandı` ifadesi yalnız bütün zorunlu kapılar yeşilse kullanılabilir.
