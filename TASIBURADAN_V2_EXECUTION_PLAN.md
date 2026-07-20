# TAŞIBURADAN V2 — KANONİK YÜRÜTME VE YOL HARİTASI

> Önerilen konum: `tasiburada/TASIBURADAN_V2_EXECUTION_PLAN.md`
>
> Bu belge Faz 0 sonrası resmi yürütme sırasını, tamamlanan işleri, açık işleri,
> ürün sınırlarını ve ayrıntılı doğrulama gereksinimlerini tanımlar. Her oturumda
> otomatik yüklenen kısa agent anayasası repository kökündeki `GPT_AGENTS.md`
> dosyasıdır.
>
> Son güncelleme referansı: M1B-2 tamamlandı ve ayrı commit ile kapatıldı.
> Onaylanmamış M1C taslağı main'den ayrılarak yerel karantina branch'inde korundu.
>
> Bu belge kanonik kapsam ve ilerleme kaynağıdır. Tek başına hiçbir agente kod
> yazma, migration çalıştırma, stage veya commit yetkisi vermez. Yazma yetkisi
> yalnız bu belgede tanımlanan geçerli bir `WORK_ORDER` ile açılır.

---

## 1. BELGENİN OTORİTESİ

Bu belge, Taşıburadan V2 için agentların takip edeceği ana yürütme kaynağıdır.

Ürün yol haritası yalnız dört ana fazdan oluşur:

1. **Faz 1 — Güvenli ve gelir üreten erişim pazaryeri**
2. **Faz 2 — Nakliyeci işletme sistemi ve tekrar satın alma**
3. **Faz 3 — Yapay zekâ destekli talep kalitesi ve akıllı dağıtım**
4. **Faz 4 — Rota optimizasyonu, B2B ve ağ genişlemesi**

`Faz 1.5`, `Faz 2A`, `Faz 3B` gibi yeni ürün fazları oluşturulmaz.

Teknik işler küçük paketlere bölünebilir; ancak bunlar yeni ürün fazı sayılmaz.

---

## 2. AGENT ROLLERİ

### Eren — Kurucu ve son karar mercii

- Ürün ve iş kararlarını onaylar.
- Commit/push/yayın gibi kritik geçişlerde son sözü söyler.
- Agentlar Eren adına ürün kararı icat edemez.

### Ana orkestratör — Görev kontrolü ve kota yönetimi

- Kanonik sıradan yalnızca sıradaki uygun teknik birimi seçer.
- Mark, Can ve Elliot değerlendirmelerini toplar.
- Yazma yapan worker için tek ve dar bir `WORK_ORDER` üretir.
- Günlük kotayı, aktif işi ve doğrulama kapılarını takip eder.
- Kendisini worker yerine koyamaz ve doğrudan geniş kod değişikliği yapamaz.
- Bir worker tamamlandığında sonucu doğrulamadan yeni worker başlatamaz.

### Mark — Ürün ve iş modeli

- Ürün kapsamını, kullanıcı akışını ve faz sınırlarını belirler.
- Form, gelir modeli, müşteri ve nakliyeci deneyimi kararlarını verir.
- Varsayılan olarak read-only çalışır.
- Ürün kararı gerektiren noktada seçenek ve öneri üretir; Eren adına karar vermez.

### Can — Hukuk, KVKK, ödeme ve iletişim mevzuatı

- Hukuki rol, KVKK, e-ticaret, ödeme, fatura, iade ve ticari ileti sınırlarını değerlendirir.
- Hukuki konuda agent varsayım üretmez; açık karar bekler.
- Varsayılan olarak read-only çalışır.
- Onaylanmamış hukuki metin, açık rıza, saklama süresi, KDV, iade veya ödeme kuralı oluşturmaz.

### Elliot — Teknik mimari ve uygulama denetimi

- İş kararlarını teknik paketlere çevirir.
- Copilot/Codex için uygulanabilir prompt hazırlar.
- Diff, migration, test, güvenlik ve mimari sınırları inceler.
- Doğrudan geniş kod değişikliği yapmaz; uygulama çıktısını denetler.
- Varsayılan olarak read-only çalışır.
- Codebase Memory MCP sonucunu yalnız keşif için kullanır ve güncel kodda doğrular.
- Worker için kabul kriteri, izinli kapsam ve zorunlu testleri tanımlar.
- Worker çıktısını kabul etmeden paket kapanmış sayılamaz.

### Copilot / Codex — Repo uygulayıcısı

- Yalnız verilen paketi uygular.
- Sonraki pakete kendiliğinden geçmez.
- Kapsam dışı tablo, endpoint, placeholder veya yarım implementation oluşturmaz.
- Geçerli `WORK_ORDER` olmadan read-only kalır.
- Kendisine paket, milestone veya günlük kota seçemez.
- Elliot, Mark, Can veya ana orkestratör rolünü taklit ederek yetki genişletemez.
- `ALLOWED_SCOPE` dışında dosya değişikliği gerekirse durur ve raporlar.

---

## 3. DEĞİŞMEZ TEKNİK VE ÜRÜN KARARLARI

### Ticari model

- Müşteri taşıma talebini ücretsiz oluşturur.
- Nakliyeci, müşteri iletişim bilgilerine erişim satın alır.
- Hizmet adı: **Taşıma Talebi İş Fırsatı İletişim Erişim Hizmeti**.
- Taşıburadan taşıma bedelini tahsil etmez.
- Taşıma sözleşmesi müşteri ile nakliyeci arasındadır.
- Her aktif talep turunda en fazla **5 doğrulanmış nakliyeci** erişim alabilir.
- Erişim fiyat sınıfları: **200 / 500 / 800 TL**.

### Kategori ayrımı

- `HOME_MOVE`
- `OFFICE_MOVE`
- `PARTIAL_ITEM`

### Rota ayrımı

- `INTRACITY`
- `INTERCITY`

Kategori, rota ve erişim fiyat sınıfı birbirine karıştırılmaz.

### Kimlik modeli

Faz 1’de ortak bir `users` tablosuna zorunlu büyük dönüşüm yapılmaz.

Mevcut ana hesap kökleri korunur:

- `customers`
- `carriers`
- `admins`

### Gizlilik

Satın alma öncesinde nakliyeciye gösterilmez:

- müşteri adı
- telefon
- e-posta
- mahalle
- açık adres
- kapı numarası
- harita pini
- hassas müşteri notu

### Public profil

- Herkese açık nakliyeci dizini yoktur.
- Anonim/SEO amaçlı canlı talep sayfası yoktur.
- Müşteri, yalnız kendi talebine ücretli erişim alan nakliyecinin kartını görür.

---

## 4. REPO VE VERİTABANI GÜVENLİK KURALLARI

Agentlar aşağıdaki işlemleri açık talimat olmadan yapamaz:

- `git reset`
- `git stash`
- `git checkout`
- `git clean`
- force push
- otomatik push
- tracked veya untracked dosya silme
- development DB reset/drop/reseed
- canonical baseline değiştirme
- legacy migration zincirini geri getirme
- `synchronize: true`
- geniş kapsamlı `git add .` veya `git add -A`

Korunan untracked dosyalar:

- `GPT_AGENTS.md`
- varsa geçiş dönemindeki `AGENTS.md`
- `review-bundles/ELLIOT_REVIEW_MANIFEST.md`
- `review-bundles/tasiburada-elliot-critical-review-2026-07-16.zip`

M0B backup repo dışında korunur.

Her teknik paket şu sırayla yürütülür:

1. Hedefli mevcut durum incelemesi
2. Dar kapsamlı uygulama
3. DB’siz hedefli testler
4. From-zero disposable DB
5. Seeded-upgrade disposable DB
6. Gerekliyse additive `tasiburada_dev` migration
7. Health ve statik kontroller
8. Final review
9. Ayrı commit
10. Push yalnız Eren’in açık kararıyla

Tamamlanmış migration, seed, disposable test veya health işlemleri kod değişmediyse gereksiz yere tekrarlanmaz.

### Codebase Memory MCP kullanım disiplini

- Orta ve büyük teknik işlerde önce Codebase Memory ile olası etki alanı bulunur.
- MCP çıktısı kaynak gerçekliği değildir; dosya yolları, semboller ve çağrı zincirleri güncel kodda doğrulanır.
- Bütün graph veya bütün repository ana bağlama taşınmaz.
- Yalnız hedef paketle ilişkili dosya ve semboller okunur.
- Index ile Git HEAD uyuşmuyorsa MCP sonucu karar vermek için kullanılmaz.
- Mark ve Can teknik kod incelemesi yapmıyorsa Codebase Memory çağırmaz.
- Ana orkestratöre ham graph yerine kısa dosya listesi ve doğrulanmış etki özeti döndürülür.

---

## 5. TAMAMLANAN TEKNİK PAKETLER

### Faz 0 — Güvenlik temeli

Tamamlandı ve kapatıldı.

Referans commit:

`79d4aaad5650ed4c7b6d200ce175efc97ae75e99`

### M0A — Canonical manifest ve disposable DB altyapısı

Tamamlandı.

Referans commit:

`952653bf2ca4055467204f6161ffa29c35716da8`

### M0B-1 — Canonical V1 baseline migration

Tamamlandı.

Referans commit:

`6c8781f5df0b8a686e17ef6fe02316e05c44baef`

### M0B-2A — Runtime cutover hazırlığı

Tamamlandı.

Referans commit:

`80e95f77abdcd1f4ca6dad3ae7f110adcc2cc8b4`

### M0B-2B — Canonical runtime cutover

Tamamlandı.

Referans commit:

`63ee36f9c69e29b2d387349c38fc81f00762d4f4`

### M1A — Shipment kategori ve rota kimliği

Tamamlandı ve kapatıldı.

Eklenen canonical alanlar:

- `service_category_code`
- `route_scope_code`

Referans commit:

`20c247b7a798e9f111c1eb22844d2dd91c981419`

### M1B-1 — Ortak taşıma ve operasyon bilgileri

Tamamlandı ve kapatıldı.

Eklenen ana yapı:

- `date_flexibility_code`
- `date_window_start`
- `date_window_end`
- `shipment_location_conditions`

Referans commit:

`7a52987f2189106cc2fda4a0fa10bff7e8c9b35d`

---

## 6. MEVCUT DURUM: M1B-2 KAPANDI, 7.1 SIRADA

### M1B-2 kapanış durumu

M1B-2 implementasyonu, doğrulaması, final review'u ve ayrı commit'i tamamlandı.

Canonical main HEAD:

`1e973980909b516be021beb69187a7120edec228`

Doğrulananlar:

- 119/119 hedefli test geçti.
- From-zero disposable test geçti.
- Seeded-upgrade disposable test geçti.
- `tasiburada_dev` canonical migration sayısı: **4**.
- Pending migration: **0**.
- Health: **HTTP 200**.
- Fingerprint:
  `869cb83954bfb684dc78f9ca5f6551a02d74437ec2ce07003d53cf7f80e4beaf`
- Commit tamamlandı:
  `1e973980909b516be021beb69187a7120edec228`
- Push yapılmadı.

### M1B-2’de oluşturulan current/mutable yapılar

- `shipment_home_move_details`
- `shipment_home_move_items`
- `shipment_office_move_details`
- `shipment_partial_item_details`
- `shipment_partial_items`

### Onaylanmamış M1C taslağının durumu

Eski sürekli görev oturumu ayrı uygulama onayı olmadan M1C/ShipmentRound taslağı
oluşturdu. Bu çalışma tamamlanmış veya canonical değildir.

- Karantina branch:
  `quarantine/m1c-unreviewed-20260720`
- WIP commit:
  `a21a3fb9cdcf1f1724ba5f7d1e57572d1d5bf234`
- Main'e merge/cherry-pick yapılmadı.
- Push yapılmadı.
- Hedefli M1C test: 11/11 geçti.
- From-zero disposable smoke seed aşamasında durduruldu; başarılı sayılmaz.
- `tasiburada_m1c_20260720_test` disposable DB'si yarım kalmış olabilir.

Bu taslak 7.1 veya 7.2 sırasını değiştirmez. 7.3 aşamasına gelindiğinde yalnız
read-only inceleme girdisi olarak değerlendirilebilir; doğrudan canonical kabul edilmez.

---

## 7. FAZ 1’DE KALAN İŞLER — RESMİ SIRA

Aşağıdaki sıra bağımlılık sırasıdır. Bir paket kapanmadan sonraki paket başlatılmaz.

### 7.1 Ek hizmetlerin current talebe bağlanması

Amaç:

- Müşterinin katalogdan ek hizmet ihtiyacı seçmesi
- Nakliyecinin profil hizmetleriyle bilgilendirme amaçlı karşılaştırma
- Nakliyecinin `Diğer Ek Hizmet +` kullanabilmesi
- Current talep ihtiyaçlarının güvenli ve yapılandırılmış tutulması

Korunacak/adapte edilecek V1 yapıları:

- `extra_services`
- `extra_service_applicability`
- `carrier_extra_services`
- `carrier_custom_extra_services`
- `shipment_extra_services`

Kurallar:

- Talebe özel ağır fiyat/taahhüt sistemi kurulmaz.
- Müşteri serbest metni yeni katalog hizmeti oluşturmaz.
- Hizmet eşleşmesi erişim satın almayı otomatik engellemez.
- `shipment_custom_extra_services` yeniden ana model yapılmaz.

### 7.2 Güvenli fotoğraf ve medya altyapısı

Amaç:

- Müşteri fotoğraf yükleyebilsin.
- Orijinal dosya private kalsın.
- EXIF/GPS temizlensin.
- Güvenli preview üretilebilsin.
- Pre-purchase ekranda yalnız güvenli preview gösterilsin.

Temel ayrım:

- `PRIVATE_ORIGINAL`
- `SAFE_PREVIEW`

Faz 1’de AI fotoğraf analizi yapılmaz.

### 7.3 ShipmentRound ve immutable snapshot

Amaç:

- Ana `Shipment` değişebilir kalsın.
- Her yayınlama ayrı `ShipmentRound` oluştursun.
- Nakliyecinin gördüğü bilgiler immutable snapshot olarak saklansın.
- Kritik değişiklik yeni tur oluştursun.
- Terminal tur yeniden açılmasın.

Ana zincir:

`Shipment → ShipmentRound → ShipmentRoundSnapshot`

Snapshot kapsamında:

- ortak rota/tarih/operasyon bilgileri
- kategoriye özel detaylar
- istenen ek hizmetler
- güvenli fotoğraf bağlantıları

PII snapshot içine konmaz.

### 7.4 Değerlendirme ve erişim fiyat sınıfı

Amaç:

Talebi şu erişim sınıflarından birine yerleştirmek:

- `PARTIAL_200`
- `STANDARD_500`
- `LARGE_SCALE_800`

Ana yapılar:

- `shipment_assessments`
- `price_policy_versions`
- `price_policy_tiers`
- `tax_policy_versions`
- `access_price_snapshots`

Kurallar:

- Müşteri sınıfı seçmez.
- Form cevapları değerlendirme sinyalidir.
- Fiyat/KDV round için snapshot edilir.
- Taşıma bedeli ile erişim hizmeti fiyatı karıştırılmaz.

### 7.5 Müşteri hızlı hesap ve SMS OTP

Akış:

Müşteri formu doldurur
→ ad + telefon girer
→ SMS OTP doğrular
→ düşük sürtünmeyle hesap oluşur
→ talep yayımlanır.

Kurallar:

- İlk talepte şifre ve e-posta zorunlu değildir.
- Telefon normalize edilir.
- Mükerrer hesap kuralları uygulanır.
- OTP açık metin saklanmaz.
- Rate limit ve kısa süre uygulanır.

### 7.6 Müşteri login ve hesap kurtarma

Faz 1 yöntemleri:

- Telefon + şifre
- Telefon + SMS OTP
- Doğrulanmış e-posta varsa e-posta + şifre

Zorunlu işlemler:

- şifre belirleme
- şifre değiştirme
- şifremi unuttum
- telefon üzerinden kurtarma
- doğrulanmış e-posta üzerinden reset bağlantısı
- güvenlik bildirimi
- gerektiğinde oturumların kapatılması

### 7.7 Nakliyeci auth ve doğrulama

Akış:

Nakliyeci kayıt olur
→ telefon doğrular
→ e-posta doğrular
→ şifre oluşturur
→ firma bilgileri
→ araçlar
→ belgeler
→ hizmetler
→ admin onayı.

Her kritik istekte güncel durum DB’den kontrol edilir.

Eski JWT, hesap `SUSPENDED` veya `DEACTIVATED` ise yetki sağlamaz.

### 7.8 Oturum ve token güvenliği

- kısa ömürlü access token
- güvenli refresh token
- logout/revocation
- şifre değişikliğinde oturum kapatma
- müşteri/carrier/admin authorization ayrımı
- login/OTP/reset rate limit
- başarısız giriş audit sinyali

### 7.9 Transactional e-posta altyapısı

Amaç:

- E-posta gönderimi ana ticari işlemi bloklamasın.
- Outbox/queue üzerinden gönderim yapılsın.
- Retry ve kalıcı hata takibi bulunsun.

Zorunlu teknik konular:

- sağlayıcı soyutlaması
- queue/outbox
- idempotency
- template versioning
- HTML + plain-text
- provider message ID
- delivery/failure logları
- bounce/complaint yönetimi
- SPF/DKIM/DMARC production doğrulaması

Transactional ve pazarlama e-postaları ayrılır.

### 7.10 Kesin beşli kota

Her round için tam 5 erişim kapasitesi oluşturulur.

Ana yapı:

- `round_access_slots`

Kurallar:

- En fazla 5 consumed erişim
- Yarış koşulu koruması
- Terminal round yeni erişim alamaz
- Slot durumu pointer ve constraintlerle korunur

### 7.11 On dakikalık rezervasyon

Ana yapı:

- `slot_reservations`

Kurallar:

- Nakliyeci satın alma başlatınca 10 dakika slot ayırır.
- Süre dolunca slot serbest kalır.
- Aynı carrier + round için tek aktif rezervasyon bulunur.
- Geç ödeme ve yarış koşulları ayrıca yönetilir.

### 7.12 AccessPurchase ve merkezi uygunluk kapısı

Ana yapı:

- `access_purchases`

Satın alma öncesi kontrol:

- authenticated carrier
- aktif hesap
- onaylı nakliyeci
- geçerli belgeler
- uygun kategori/rota
- round açık
- slot mevcut
- duplicate satın alma yok

### 7.13 Ödeme ve webhook

- lisanslı ödeme kuruluşu
- hosted checkout/tokenization
- imzalı webhook
- idempotency
- reconciliation
- geç webhook yönetimi
- duplicate event koruması

Ödeme gerçeği provider eventleriyle audit edilebilir olmalıdır.

### 7.14 Contact reveal

Ana zincir:

`ShipmentContactVersion → ContactAccessGrant → ContactDisclosure`

Kurallar:

- PII round snapshot içinde bulunmaz.
- Ödeme + slot + authorization + erişilebilir contact version birlikte doğrulanır.
- Grant fulfillment ile erişim hakkı oluşur.
- Her gerçek görüntüleme disclosure olarak kaydedilir.

### 7.15 Müşteri ve nakliyeci kartları

- Müşteri yalnız kendi shipment’ına erişim alan nakliyecileri görür.
- Nakliyeci kartı relation-gated olur.
- Public profil oluşturulmaz.
- Profil ek hizmetleri badge olarak gösterilir.

### 7.16 Platform kredisi

Ana yapılar:

- `credit_accounts`
- `credit_holds`
- `credit_ledger_entries`
- `credit_allocations`

Kurallar:

- Kredi nakde çevrilemez.
- Transfer edilemez.
- Yalnız erişim satın almakta kullanılır.
- Ledger append-only olur.
- Gerçek para iadesiyle karıştırılmaz.

### 7.17 Fatura ve gerçek para iadesi

- KDV snapshot
- fatura profili snapshot
- e-Fatura/e-Arşiv
- void/refund/partial refund ayrımı
- chargeback takibi
- fiscal correction

Fatura yalnız erişim hizmetine aittir.

### 7.18 Claim ve geçersiz talep incelemesi

- `contact_attempts`
- `invalid_lead_claims`
- claim evidence
- admin kararı

Ulaşılamama için tek cevapsız çağrı yeterli değildir.

Örnek eşik:

- üç farklı zaman diliminde deneme
- platformun müşteri aktifliğini teyit edememesi
- admin incelemesi

Yanlış kişi veya hiç var olmayan fırsat gerçek para iadesi doğurabilir.

### 7.19 Sonuç bildirimi

Müşteri ve nakliyeci şu sonuçları bildirebilir:

- görüşüldü
- anlaşma sağlandı
- anlaşma sağlanamadı
- taşıma tamamlandı
- müşteri başka nakliyeci seçti
- ulaşılamadı
- iptal edildi

Outcome kayıtları append-only tutulur; tarafların çelişkili bildirimleri silinmez.

### 7.20 Kontrollü yorum sistemi

Yorum için:

- ilgili round’da ücretli erişim
- müşteri ile gerçek ilişki
- taşıma tarihinin geçmiş olması
- taşımanın gerçekleştiğinin teyidi

Unique sınır:

`customer_id + shipment_round_id + carrier_id`

### 7.21 Bildirimler

Temel bildirimler:

- talep yayımlandı/iptal edildi
- yeni nakliyeci erişimi
- ödeme sonucu
- contact reveal
- belge sonucu
- kredi/iade/fatura
- claim sonucu
- güvenlik bildirimi

Bildirim gerçeğin kaynağı değildir; yalnız kullanıcıya haber verir.

### 7.22 Admin ve immutable audit

Admin paneli:

- talepler ve roundlar
- nakliyeci doğrulama
- belgeler ve araçlar
- erişim satın almaları
- ödeme/kredi/iade/fatura
- claim ve şikâyetler
- sonuçlar ve yorumlar
- temel KPI’lar

Admin kritik alanları doğrudan düzenlemez; auditli komut çalıştırır.

Kapanmış round yeniden açılmaz, mali ve operasyon geçmişi silinmez.

---

## 8. FAZ 1 BİTİŞ KRİTERLERİ

Faz 1 tamamlanmış sayılmadan önce aşağıdakilerin tamamı çalışmalıdır:

- Müşteri yaklaşık üç dakikada talep oluşturabiliyor.
- SMS OTP ile telefon doğrulanıyor.
- Müşteri hesabına tekrar erişebiliyor.
- Şifremi unuttum çalışıyor.
- Nakliyeci telefon ve e-posta doğrulayabiliyor.
- Nakliyeci admin tarafından onaylanabiliyor.
- Talep immutable round snapshot ile yayımlanıyor.
- Nakliyeci PII içermeyen talebi görebiliyor.
- Her round’da kota hiçbir durumda 5’i aşmıyor.
- 10 dakikalık reservation çalışıyor.
- İlk gerçek ücretli erişim uçtan uca tamamlanıyor.
- Ödeme ile erişim arasında denetlenebilir entitlement bulunuyor.
- Müşteri iletişim bilgisi yalnız yetkili nakliyeciye açılıyor.
- Fatura, kredi ve gerçek iade akışları çalışıyor.
- E-posta hatası ana işlemi bozmuyor.
- Hassas bilgiler e-posta veya bildirimlere sızmıyor.
- Claim, sonuç ve kontrollü yorum akışları çalışıyor.
- Admin işlemleri audit edilebiliyor.
- Pilot KPI’ları ölçülebiliyor.

---

## 9. FAZ 1’DE YAPILMAYACAKLAR

Aşağıdakiler için boş tablo, sahte endpoint veya yarım implementation oluşturulmaz:

- Nakliyeci CRM not/görev sistemi
- Gelişmiş performans raporu
- Yapay zekâ
- Görsel eşya tanıma
- AI hacim/araç tahmini
- Gelişmiş akıllı sıralama
- Dönüş yükü motoru
- Kurumsal hesaplar
- Firma alt kullanıcıları
- Partner pazaryeri
- Public nakliyeci dizini
- Uluslararası taşıma akışı
- Depolama iş akışı
- Sigorta yönetimi
- Taşıma bedeli tahsilatı

---

## 10. SONRAKİ FAZLARIN SINIRI

### Faz 2

Nakliyeci CRM/pano, özel notlar, görevler, hatırlatmalar, temel performans paneli, basit müsaitlik ve kural tabanlı kişiselleştirme.

### Faz 3

AI shadow mode, fotoğraf destekli eşya önerileri, hacim/araç/ekip tahminleri, açıklanabilir akıllı dağıtım ve gelişmiş risk analitiği.

### Faz 4

Dönüş yükü, operasyon planlama, kurumsal hesaplar, nakliyeci alt kullanıcıları, partner ağı ve yeni iş kolları.

Faz 2–4 implementasyonuna Faz 1 tamamlanmadan başlanmaz.

---

## 11. HER AGENT ÇALIŞMASINDA ZORUNLU RAPOR ŞABLONU

Her uygulama çıktısı şu başlıklarla raporlanır:

1. Başlangıç branch ve HEAD
2. Başlangıç Git durumu
3. Hedefli mevcut sistem incelemesi
4. Değişen/yeni dosyalar
5. Migration adı ve registry sırası
6. Şema ve veri etkisi
7. Backfill kararı
8. Entity/service/seed etkisi
9. Public API/frontend etkisi
10. DB’siz testler
11. From-zero sonucu
12. Seeded-upgrade sonucu
13. Development DB sonucu
14. Fingerprint
15. Health sonucu
16. Regresyon testleri
17. TypeScript/package/diff kontrolleri
18. Baseline/manifest/legacy migration diff kontrolü
19. Final Git durumu
20. Commit/push durumu
21. Bir sonraki tek teknik adım

Agent “tamamlandı” demeden önce kabul kriterlerini tek tek doğrular.

---

## 12. ŞİMDİKİ TEK İŞ

Şu anda yapılacak tek iş:

> **7.1 — Ek hizmetlerin current müşteri talebine bağlanması için read-only
> mevcut durum, ürün kontrolü, etki analizi ve dar teknik alt birim planı.**

Bu preflight tamamlanıp geçerli `WORK_ORDER` oluşturulmadan implementation başlamaz.

7.1 kapanmadan medya, ShipmentRound/snapshot veya başka bir pakete geçilmez.

---

## 13. WRITE GATE VE WORK_ORDER SÖZLEŞMESİ

Bu belge veya master prompt tek başına implementation başlatmaz.

Bir worker yalnız aşağıdaki alanların tamamını taşıyan açık bir `WORK_ORDER`
aldığında yazma moduna geçebilir:

```yaml
WORK_ORDER:
  work_order_id: "TB-YYYYMMDD-NN"
  package_id: "kanonik paket veya önceden tanımlı teknik alt birim"
  objective: "tek ölçülebilir sonuç"
  allowed_scope:
    - "değiştirilebilecek açık dosya/dizin veya sembol sınırları"
  forbidden_scope:
    - "dokunulmayacak alanlar"
  acceptance_criteria:
    - "kanıtlanabilir kriter"
  required_tests:
    - "çalıştırılacak hedefli kontroller"
  migration_allowed: false
  local_commit_allowed: false
  commit_message: null
```

Kurallar:

- Alanlardan biri eksikse worker read-only kalır ve `INVALID_WORK_ORDER` raporlar.
- `allowed_scope` belirsizse veya bütün repository anlamına geliyorsa iş başlamaz.
- `migration_allowed: false` iken migration oluşturulmaz veya çalıştırılmaz.
- `local_commit_allowed: false` iken stage veya commit yapılmaz.
- `local_commit_allowed: true` push, merge, amend veya deployment yetkisi vermez.
- Worker yalnız bir `WORK_ORDER` uygular ve sonunda zorunlu olarak durur.
- Worker yeni `WORK_ORDER` üretemez ve sıradaki paketi seçemez.
- Birden fazla aktif yazma yapan worker bulunamaz.
- Read-only agentlar eşzamanlı çalışabilir; repository üzerinde değişiklik yapamaz.

## 14. KONTROLLÜ OTOMATİK YÜRÜTME VE GÜNLÜK KOTA

Otomatik ilerleyen taraf worker değil, ana orkestratördür. Ana orkestratör de
yalnız geçerli kota ve bütün doğrulama kapıları içinde yeni `WORK_ORDER` açabilir.

### Teknik çalışma birimi

Her birim:

- tek ölçülebilir davranış içerir,
- açık kabul kriterlerine sahiptir,
- bağımsız test edilebilir,
- en fazla bir additive migration içerir,
- tek bağımsız yerel commit ile kapanabilir.

7.1–7.22 başlıkları gerektiğinde `7.5-A`, `7.5-B` gibi teknik alt birimlere
bölünebilir. Bunlar yeni ürün fazı değildir. Kapsam uygulama sırasında büyürse
mevcut birime eklenmez; yeni birime bırakılır.

### Kota

- İstanbul saatine göre varsayılan günlük kota: **1 kapatılmış teknik birim**.
- Günlük mutlak üst sınır: **2 teknik birim**.
- İkinci birim yalnız Eren aynı gün açıkça `BUGÜNKÜ KOTA: 2` derse açılabilir.
- Ana orkestratör kendiliğinden kotayı yükseltemez.
- Günde en fazla **1 migration içeren birim** bulunabilir.
- Aynı anda yalnız **1 yazma yapan worker** çalışabilir.
- Birim başına en fazla **2 düzeltme/test döngüsü** uygulanabilir.
- Kota dolunca çalışma güvenli checkpoint'te durur; ertesi güne kendiliğinden başlamaz.

### Zorunlu kapılar

Bir paket şu kapıların tamamı geçmeden kapanmış sayılmaz:

1. Başlangıç branch, HEAD ve Git durumu kaydedildi.
2. Önceki paket commit ile temiz kapandı.
3. Kapsam ve kabul kriterleri kilitlendi.
4. Etki alanı Codebase Memory ile bulunup güncel kodda doğrulandı.
5. Yalnız `ALLOWED_SCOPE` uygulandı.
6. Hedefli DB'siz testler geçti.
7. Migration varsa from-zero ve seeded-upgrade geçti.
8. Risk seviyesine uygun TypeScript, health ve regresyon kontrolleri geçti.
9. Public API, frontend, kategori bütünlüğü ve PII sızıntısı incelendi.
10. Baseline, manifest ve legacy migration dosyalarının korunması doğrulandı.
11. Elliot final diff review verdi.
12. Yalnız izinli dosyalar tek tek stage edildi.
13. İzin varsa ayrı yerel commit oluşturuldu.
14. Commit sonrası tracked worktree doğrulandı.

Bir kapı geçmeden sonraki kapıya veya teknik birime geçilmez.

### Zorunlu durma koşulları

- Test iki düzeltme döngüsünden sonra hâlâ başarısızsa
- Kapsam beklenmedik biçimde büyürse
- Doküman, ürün kararı ve güncel kod arasında maddi çelişki varsa
- Destructive migration, backfill veya veri kaybı riski varsa
- PII, authorization veya güvenlik sızıntısı bulunursa
- Mark veya Can kararı gerekiyorsa
- Worktree'de açıklanamayan kullanıcı değişikliği varsa
- Dış servis, credential, production erişimi veya ücretli bağımlılık gerekiyorsa
- Günlük kota dolduysa
- Eren `DUR` dediyse

Etkilenmeyen read-only incelemeler güvenliyse sürdürülebilir; yeni yazma işi başlatılmaz.

### Mutlak yasaklar

- Otomatik push, merge veya deployment
- Production DB değişikliği
- `git reset`, `git stash`, `git checkout`, `git clean`
- Force push, amend veya toplu stage
- Kullanıcı değişikliklerini silme ya da üzerine yazma
- Hukuki/ürün kararı icat ederek implementation'a devam etme
- Eski `Pursuing goal` veya sohbet bağlamını yeni `WORK_ORDER` sayma

## 15. OTURUM BAŞLANGIÇ VE ESKİ HEDEF İZOLASYONU

- Bu sistem yeni bir Codex sohbetinde başlatılır.
- Eski bir oturumda `Pursuing goal` aktifse o oturum implementation için kullanılmaz.
- Başlangıçta `git status --short` ve `git diff --stat` read-only incelenir.
- Açıklanamayan veya önceki oturumdan kalan değişiklik varsa hiçbir dosyaya dokunulmaz.
- Eski değişiklikler silinmez, stage edilmez ve commit edilmez; containment raporu hazırlanır.
- `.codex/agents/elliot.toml`, `mark.toml` ve `can.toml` yüklenmemişse agent rolleri taklit edilmez; `AGENT_SETUP_MISSING` raporlanır.
- `GPT_AGENTS.md` Codex tarafından keşfedilmemişse implementation başlamaz.

## 16. GÜNLÜK KAPANIŞ RAPORU

```text
GÜNLÜK YÜRÜTME RAPORU

Tarih ve saat dilimi:
Günlük kota:
Kullanılan kota:
Work order:
Paket/teknik birim:
Başlangıç branch ve HEAD:
Commit:
Değişen ana bileşenler:
Kabul kriterleri:
Testler:
Migration/DB/health:
Public API/frontend/PII sonucu:
Elliot final review:
Kapsam sapması:
Açık risk veya blocker:
Sıradaki kanonik birim:
Kurucu kararı gerekiyor mu:
Push/merge/deployment durumu:
```

`Tamamlandı` ifadesi yalnız bütün zorunlu kapılar yeşilse kullanılabilir.
