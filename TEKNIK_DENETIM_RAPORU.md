# TaşıBurada — Kapsamlı Teknik Denetim Raporu

**Tarih:** Haziran 2025  
**Rol:** Senior Software Engineer / Solution Architect / Technical Auditor  
**Kapsam:** Full-Stack (React + Node.js/Express + TypeORM + MySQL)  
**Yöntem:** Statik kod analizi — tüm backend servisleri, controller'lar, middleware'ler, entity'ler, migration'lar + tüm frontend sayfalar, bileşenler, lib/ dosyaları satır satır incelendi.

---

## İçindekiler

1. [Genel Değerlendirme](#1-genel-değerlendirme)
2. [Mantık Hataları](#2-mantık-hataları)
3. [Eksik Özellik / Akış Analizi](#3-eksik-özellik--akış-analizi)
4. [Veri Modeli & Tutarlılık](#4-veri-modeli--tutarlılık)
5. [Backend / API Denetimi](#5-backend--api-denetimi)
6. [Frontend / UX / Akış Denetimi](#6-frontend--ux--akış-denetimi)
7. [Rol / Yetki / Erişim Kontrolü](#7-rol--yetki--erişim-kontrolü)
8. [Edge Case & Riskler (20+)](#8-edge-case--riskler)
9. [Hata Yönetimi & Operasyonel Dayanıklılık](#9-hata-yönetimi--operasyonel-dayanıklılık)
10. [Güçlü / Zayıf Yanlar](#10-güçlü--zayıf-yanlar)
11. [İyileştirme Önerileri](#11-iyileştirme-önerileri)
12. [Önceliklendirilmiş Bulgular (P0–P3)](#12-önceliklendirilmiş-bulgular-p0p3)

---

## 1. Genel Değerlendirme

TaşıBurada, müşteriler ile nakliyecileri buluşturan bir lojistik pazaryeri. Mimari olarak aşağıdaki katmanlardan oluşuyor:

| Katman | Teknoloji | Durum |
|--------|-----------|-------|
| Frontend | React 18 + Vite + shadcn/ui + TanStack Query | Büyük oranda gerçek API ile entegre; ancak **ödeme ve yorum akışları tamamen sahte** |
| Backend | Node.js + Express + TypeORM (repository pattern) | Clean architecture prensiplerine yakın; 26 entity, 25 repository, ~30 servis |
| Veritabanı | MySQL 8, utf8mb4, 14 migration | Senkronize=false (sadece migration) — doğru yaklaşım |
| Auth | JWT (Bearer), ayrı customer/carrier/admin token sistemleri | Backend tarafı sağlam; frontend tarafı zayıf |
| Dosya yükleme | Multer disk storage, 5MB limit | Çalışıyor ama `/uploads` dizini **erişim kontrolsüz** |

**Genel karar:** Proje MVP aşamasında makul bir omurgaya sahip. Backend mimarisi (DDD-lite, servis katmanı, repository abstraction) iyi kurgulanmış. Ancak **kritik iş akışları (ödeme, yorum) frontend'de sahte**, **güvenlik açıkları sistemik**, ve **frontend ile backend arasındaki sözleşme (contract) birçok noktada uyumsuz**. Üretim ortamına çıkmadan önce bu rapordaki P0 ve P1 bulguların tamamı çözülmelidir.

---

## 2. Mantık Hataları

### 2.1 — Dashboard Durum Haritası Tutarsız
**Dosya:** `shadcn-ui/src/pages/Dashboard.tsx`  
`normalizeStatus()` fonksiyonu:
- `'completed'` → `'delivered'` — Backend'de `delivered` durumu **yok**. Frontend'e özgü hayalet durum.
- `'in_transit'` → `'matched'` — Aktif taşıma sürecindeki gönderiyi "eşleşmiş"e geri düşürüyor. Kullanıcı gönderisinin nerede olduğunu kaybediyor.
- `'offer_received'` → `'pending'` — Teklif geldiği bilgisi yutulmuş.

**Etki:** Müşteri "Teslim Edildi" gördüğünde backend'de "COMPLETED", müşteri "Bekliyor" gördüğünde backend'de "OFFER_RECEIVED" olabilir. Dashboard'daki tüm durum istatistikleri güvenilmez.

### 2.2 — OfferRequestForm Nakliyeci Listesi Daima Boş
**Dosya:** `shadcn-ui/src/components/OfferRequestForm.tsx`  
```ts
useEffect(() => { setCarriers([]); }, []);
```
Mount'ta carrier state'i boşaltılıyor. ~100 satırlık `suitableCarriersBase` filtreleme/sıralama mantığı **hiçbir zaman çalışmıyor**. Step 3'teki "uygun nakliyeciler" ekranı her zaman boş.

**Etki:** Teklif oluşturma akışının 3. adımı tamamen işlevsiz ölü kod.

### 2.3 — RegisterCarrier vehicleTypeIds Daima Boş Gönderiliyor
**Dosya:** `shadcn-ui/src/pages/RegisterCarrier.tsx`  
```ts
const selectedVehicles: any[] = [];
const vehicleTypeIds: any[] = [];
```
Yorum: `"Araç seçimi kaldırıldı, boş gönderiyoruz"`. Araç tipleri API'den çekiliyor ama UI'da seçim yok. Backend'e her zaman `vehicleTypeIds: []` gidiyor.

**Etki:** Yeni kayıt olan nakliyecinin araç tipi bilgisi hiç kaydedilmiyor.

### 2.4 — CarrierRespond Admin Endpoint'ine Erişim Deniyor
**Dosya:** `shadcn-ui/src/pages/CarrierRespond.tsx`  
Carrier token'ıyle `/api/v1/admin/settings` çağırıyor. Backend'de `authenticateAdmin` middleware bunu reddediyor. `min_offer_price` hiçbir zaman alınamıyor, sessizce `catch` ile yutulup `minOfferPrice = 100` varsayılıyor.

**Etki:** Platform ayarlarından belirlenen minimum teklif fiyatı nakliyeciye hiç uygulanmıyor. Varsayılan 100₺ her zaman geçerli.

### 2.5 — Login "Başarı" Mesajı Error State'te Gösteriliyor
**Dosya:** `shadcn-ui/src/pages/Login.tsx`  
```ts
setError('✅ Giriş yapıldı!');
```
Hata state'i başarı bildirimi olarak kullanılıyor. Görsel olarak kırmızı hata kutusu içinde yeşil emoji.

### 2.6 — RegisterUser Şifre Placeholder'ı Yanlış
**Dosya:** `shadcn-ui/src/pages/RegisterUser.tsx`  
Placeholder: `"En az 6 karakter"`. Gerçek validasyon: 8+ karakter, 1 büyük harf, 1 rakam. Kullanıcı 6 karakterlik şifre girebileceğini düşünüyor ama kabul edilmiyor.

### 2.7 — Ödeme Sistemi Tamamen Sahte
**Dosya:** `shadcn-ui/src/pages/Payment.tsx`  
Kredi kartı bilgileri (numara, son kullanma, CVV) React state'te toplanıp **hiçbir yere gönderilmiyor**:
```ts
await new Promise((resolve) => window.setTimeout(resolve, 800));
toast.success('Ödeme başarıyla alındı.');
```
Backend `PaymentService.createPayment()` da sahte — `transactionId: 'TXN-' + Date.now()` üretip anında `COMPLETED` yapıyor.

**Etki:** Hiçbir katmanda gerçek ödeme işlemi yok. Ancak frontend kredi kartı bilgisi topluyor — PCI-DSS uyumsuzluğu riski.

### 2.8 — Yorum Gönderimi Sahte
**Dosya:** `shadcn-ui/src/pages/History.tsx`  
```ts
await new Promise((r) => setTimeout(r, 600));
toast.success('Yorumunuz gönderildi.');
```
Backend `ReviewService.createReview()` tam çalışır durumda (duplicate kontrol, ownership kontrol, completed kontrol). Frontend onu hiç çağırmıyor.

---

## 3. Eksik Özellik / Akış Analizi

| # | Eksik Özellik | Detay |
|---|---------------|-------|
| 1 | **Gerçek ödeme entegrasyonu** | Her iki katmanda (frontend + backend) ödeme işlemi tamamen sahte. İyzico/Stripe/PayTR gibi bir gateway entegrasyonu yok. |
| 2 | **E-posta gönderimi** | `AuthService.requestPasswordReset()` şifre sıfırlama token'ını HTTP yanıtında doğrudan döndürüyor. E-posta altyapısı (Nodemailer, SendGrid, SES) **hiç yok**. Aynı durum `resendVerification` ve `registerCustomer` için geçerli. |
| 3 | **Mesajlaşma gerçek zamanlı değil** | `Messages.tsx` tek seferlik GET yapıyor. WebSocket, SSE veya polling mekanizması yok. Karşı tarafın mesajları ancak sayfa yenilemeyle görünür. |
| 4 | **Yorum akışı kopuk** | Backend ReviewService eksiksiz; frontend History.tsx çağırmıyor. |
| 5 | **E-posta doğrulama akışı kopuk** | Backend'de `verifyEmail`, `resendVerification` endpointleri var. Frontend'de `VerifyEmail.tsx` sayfası var. Ancak kayıt sonrası token kullanıcıya HTTP yanıtında döndürülüyor. E-posta gönderimi olmadan bu akış anlamsız. |
| 6 | **Admin arama (Cmd+K)** | `AdminLayout` Cmd+K handler'ı ve `searchOpen` state'i var. Arama overlay UI'ı yok. |
| 7 | **OfferRequestForm nakliyeci eşleştirme** | ~100 satırlık filtreleme mantığı var ama hiçbir zaman veri beslenmiyor. |
| 8 | **Nakliyeci araç kaydı** | Kayıt formunda araç tipi seçimi UI'dan kaldırılmış, backend'e boş array gönderiliyor. |
| 9 | **SMS bildirimi** | `CarrierNotificationPreference` entity'sinde `smsDailyLimit` alanı var. SMS gönderim altyapısı yok. |
| 10 | **Dosya türü/boyut validasyonu backend'de eksik** | Multer `fileFilter` sadece `jpg/jpeg/png/pdf` kontrol ediyor — ancak MIME type spoofing kontolü yok. Magic bytes doğrulaması yapılmıyor. |

---

## 4. Veri Modeli & Tutarlılık

### 4.1 — Status Enum Uyumsuzluğu (Backend ↔ Frontend)

| Backend ShipmentStatus | Frontend Dashboard | Uyumlu? |
|------------------------|-------------------|---------|
| `PENDING` | `'pending'` | ✅ |
| `OFFER_RECEIVED` | `'pending'` ❌ | Bilgi kaybı |
| `MATCHED` | `'matched'` | ✅ |
| `IN_TRANSIT` | `'matched'` ❌ | Bilgi kaybı |
| `COMPLETED` | `'delivered'` ❌ | Backend'de yok |
| `CANCELLED` | `'cancelled'` | ✅ |

Frontend Offer status'te de `'withdrawn'` backend'de var, frontend types'ta yok.

### 4.2 — Çift Paralel Para Takibi
- `payments` tablosu: `customerId` FK, `shipmentId` FK, `amount` — müşteri ödeme kaydı.
- `carrier_earnings_log` tablosu: `carrierId` FK, `shipmentId` FK, `amount` — nakliyeci kazanç kaydı.
- Bu iki tablo arasında **hiçbir reconciliation (uzlaşma) mekanizması yok**. Ödeme tutarı ile kazanç tutarı arasındaki platform komisyonu hiçbir yerde hesaplanmıyor.

### 4.3 — Carrier Entity Karmaşası
`Carrier` entity'si hem doğrudan alanlar (`vehicleBrand`, `vehicleModel`, `vehicleYear`, `vehicleCapacityM3`) hem de `Vehicle` entity'si (FK ilişkili) taşıyor. Araç bilgisi iki yerde çift tutulmuş. Hangisinin otoritatif olduğu belirsiz.

### 4.4 — CarrierActivity.availableDates String Parse
`availableDates` alanı `text` tipinde. Servis katmanında `string.split(',')` ile parse ediliyor. Tarih formatı doğrulaması yok. Geçersiz tarih string'i (ör. `"abc,xyz"`) sessizce kabul edilir.

### 4.5 — bcrypt Round Tutarsızlığı
- `CustomerService.register()`: `bcrypt.hash(password, 12)` — 12 round
- `CarrierAuthService.register()`: `bcrypt.hash(password, 10)` — 10 round

Güvenlik standardı tutarsız. Aynı round sayısı kullanılmalı.

### 4.6 — Payment Migration'da carrierId FK Yok
`payments` tablosu sadece `customerId` ve `shipmentId` FK'larına sahip. Nakliyeciye hangi ödemenin ait olduğu doğrudan bu tablodan sorgulanamaz.

---

## 5. Backend / API Denetimi

### 5.1 — Güvenlik Başlıkları
- ✅ `helmet()` aktif
- ✅ CORS whitelist konfigürasyonu mevcut (dev: localhost:5173-5180, prod: env'den)
- ✅ Rate limiting aktif (200/15dk genel, 10/15dk login, 5/saat register)
- ✅ Body size limit: 10MB
- ✅ JWT verify: `jwt.verify(token, JWT_SECRET)` — kriptografik doğrulama

### 5.2 — `/uploads` Dizini Erişim Kontrolsüz (KRİTİK)
```ts
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
```
`/uploads/documents/` ve `/uploads/pictures/` altındaki tüm dosyalar (nakliyeci belgeleri, kimlik fotoğrafları, vergi levhaları) **autentikasyon olmadan** herkes tarafından erişilebilir. Bir saldırgan dosya adlarını tahmin ederek veya enumerate ederek tüm hassas belgeleri indirebilir.

### 5.3 — Şifre Sıfırlama Token'ı Güvensiz
```ts
private generateToken(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
```
- `Math.random()` kriptografik değil
- 6 karakter alfanümerik → ~2.18 milyar olasılık → brute force'a açık
- Token HTTP yanıtında doğrudan döndürülüyor (e-posta yerine)

### 5.4 — Notification markRead IDOR
`NotificationController.markRead()` bildirim ID'siyle doğrudan `markRead()` çağırıyor. **Bildirimin çağıran kullanıcıya ait olduğunu kontrol etmiyor.** Herhangi bir autentike kullanıcı, başka bir kullanıcının bildirimini "okundu" olarak işaretleyebilir.

### 5.5 — Offer Accept Race Condition (TOCTOU)
`OfferService.acceptOffer()`: Offer status'ünü kontrol edip sonra güncelleme yapıyor. İki eşzamanlı `acceptOffer` çağrısı (aynı gönderideki farklı teklifler için) her ikisi de `PENDING` kontrolünü geçebilir → aynı gönderide iki kabul edilmiş teklif.

**Çözüm:** `transitionStatusIfCurrent` (shipment için zaten mevcut) benzeri atomic CAS pattern kullanılmalı veya veritabanı seviyesinde pessimistic lock.

### 5.6 — ShipmentService.assignCarrier Yetki Kontrolü Yok
`assignCarrier()` herhangi bir autentike müşterinin herhangi bir gönderiye nakliyeci atamasına izin veriyor. Gönderinin o müşteriye ait olup olmadığı kontrol edilmiyor.

### 5.7 — ShipmentService.getShipmentById Yetki Kontrolü Yok
`getShipmentById()` herhangi bir autentike kullanıcının herhangi bir gönderiyi görüntülemesine izin veriyor (ID bilmek yeterli). Müşteriye veya ilgili nakliyeciye ait olup olmadığı kontrol edilmiyor.

### 5.8 — Backend PaymentService Sahte
```ts
const payment = this.paymentRepo.create({
  ...data,
  status: PaymentStatus.COMPLETED,
  completedAt: new Date(),
  transactionId: 'TXN-' + Date.now()
});
```
Ödeme anında `COMPLETED` olarak işaretleniyor. Gerçek ödeme gateway'i yok.

---

## 6. Frontend / UX / Akış Denetimi

### 6.1 — Üçlü Auth State Problemi
Uygulama üç bağımsız auth kaynağı kullanıyor:
1. `getSessionUser()` → `localStorage.currentUser` + TTL kontrolü
2. `getUserType()/getUserId()` → JWT decode (`localStorage.authToken`)
3. Doğrudan `localStorage.getItem('currentUser')` → Dashboard, Navbar, OfferRequestForm, ShipmentList

Bunlar kolayca senkrondan çıkar. Örnek: JWT süresi dolmuş ama `currentUser` TTL'i dolmamışsa → kullanıcı giriş yapmış görünür ama API çağrıları 401 döner.

### 6.2 — Tutarsız HTTP Client Kullanımı

| Pattern | Kullanan Dosyalar |
|---------|------------------|
| `apiClient` (doğru) | MyOffers, CarrierOffers, Dashboard, ShipmentDetail, Profile, Earnings, CarrierCalendar |
| Ham `fetch` (tutarsız) | Login.tsx, RegisterUser.tsx, RegisterCarrier.tsx, CarrierProfile.tsx, OfferRequestForm.tsx |
| Karışık (aynı dosyada her ikisi) | CarrierProfile.tsx — GET için fetch, review POST için apiClient |

`apiClient` otomatik token ekleme ve 401 redirect yapıyor. Ham `fetch` kullanılan yerlerde bu mekanizma çalışmıyor.

### 6.3 — storage.ts Ölü Kod
`saveUser`, `getUsers`, `saveCarrier`, `getCarriers`, `getApprovedCarriers`, `saveShipment`, `getShipments`, `saveOffer`, `getOffers`, `saveReview`, `getReviews`, `getCarrierReviews` — backend öncesi localStorage-only prototipten kalma fonksiyonlar. Artık kullanılmıyor.

### 6.4 — OfferComparison ≈ MyOffers Duplikasyonu
`OfferComparison.tsx` (~280 satır) ve `MyOffers.tsx` (~270 satır) neredeyse identik: aynı helper fonksiyonlar, aynı kart layout'u, aynı confirm dialog. Ortak bileşen çıkarılmamış.

### 6.5 — CarrierOnboarding.tsx UTF-8 Encoding Bozuk
Dosyada Türkçe karakterler mojibake olarak görünüyor:
- `'ÅehiriÃ§i TaÅŸÄ±ma'` → olması gereken: `'Şehiriçi Taşıma'`
- `'AraÃ§ Bilgileri'` → olması gereken: `'Araç Bilgileri'`

Dosya UTF-8 olarak yazılmış ama Latin-1 olarak yeniden save edilmiş. Tüm Türkçe karakterler bozuk.

### 6.6 — Pagination Eksikliği
MyOffers, CarrierOffers, OfferComparison sayfaları tüm veriyi tek seferde çekiyor. Veri büyüdükçe performans degradasyonu kaçınılmaz.

### 6.7 — External API Bağımlılığı
`locations.ts` ilçe verisi için `https://turkiyeapi.dev/api/v1/districts` çağırıyor. Bu üçüncü parti API kapanırsa ilçe seçimi bozulur. Fallback'te yalnızca birkaç şehir için hardcoded ilçe listesi var.

### 6.8 — Earnings.tsx Sahte İstatistik
```ts
"↑ %12 geçen aya göre"
```
Her zaman %12 artış gösteriyor, gerçek veriden bağımsız.

---

## 7. Rol / Yetki / Erişim Kontrolü

### 7.1 — Backend Auth (İyi)
| Middleware | İşlev | Durum |
|-----------|-------|-------|
| `authenticateToken` | JWT verify + req.user set | ✅ Sağlam |
| `authenticateCustomer` | Token + type=customer | ✅ Sağlam |
| `authenticateCarrier` | Token + type=carrier | ✅ Sağlam |
| `authenticateAdmin` | Bağımsız admin JWT | ✅ Sağlam |
| `requireSuperadmin` | role=superadmin kontrolü | ✅ Sağlam |
| `checkCarrierProfileCompletion(30)` | Profil %30 altında pending shipments erişimi engeller | ✅ Sağlam |

### 7.2 — Frontend Admin Auth (Zayıf)
`AdminProtectedRoute` → `isAdminAuthenticated()`:
```ts
export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}
```
Sadece `localStorage.adminToken`'ın var olup olmadığını kontrol ediyor. Token geçerliliği, süre dolumu, rol kontrolü **yok**. Herhangi bir string `localStorage.setItem('adminToken', 'xxx')` ile admin UI'ına erişim sağlanabilir.

**Not:** Backend API'ları JWT doğrulaması yapar, yani veri sızdırmaz. Ancak admin arayüzünün yapısı, endpoint isimleri, UI logic'i ifşa olur.

### 7.3 — Admin Rol Ayırımı Client-Side
`AdminManagement` sayfası `getAdminRole() !== 'superadmin'` ile gizleniyor. Bu kontrol tamamen client-side. `localStorage.adminRole = 'superadmin'` yazarak bypass edilebilir. Yine de backend `requireSuperadmin` middleware'i gerçek korumayı sağlar.

### 7.4 — Bildirimlerde IDOR
`PUT /notifications/:id/read` herhangi bir autentike kullanıcı tarafından herhangi bir bildirim için çağrılabilir. Ownership kontrolü yok.

### 7.5 — Gönderilere Yetkisiz Erişim
`GET /shipments/:id` autentike herkes tarafından erişilebilir. `PUT /shipments/:id/assign-carrier` ownership kontrolü yok.

### 7.6 — PII İfşası
`CarrierProfile.tsx` ve `CarrierDetailPage.tsx` nakliyecinin e-posta, telefon, vergi numarasını herkese açık gösteriyor. KVKK kapsamında risk.

### 7.7 — Upload Dizini Erişim Kontrolsüz
`/uploads/documents/` ve `/uploads/pictures/` altındaki tüm dosyalar auth olmadan erişilebilir. Nakliyeci belgeleri (vergi levhası, SRC belgesi, sigorta poliçesi) herkes tarafından indirilebilir.

---

## 8. Edge Case & Riskler

| # | Edge Case | Risk | Katman |
|---|-----------|------|--------|
| 1 | İki eşzamanlı `acceptOffer` çağrısı (farklı teklifler, aynı gönderi) | Aynı gönderide iki kabul edilmiş teklif | Backend |
| 2 | JWT_SECRET env variable tanımsız | `jwt.verify()` generic error fırlatır, anlaşılmaz hata | Backend |
| 3 | Nakliyeci profil %0 ile kayıt sonrası doğrudan /ilanlar'a giderse | Teklif oluşturamaz ama shipment search yapabilir — "teklif ver" butonu 401 döner | Frontend |
| 4 | Müşteri completed olmayan gönderiye yorum yazmaya çalışırsa (backend korur ama frontend korumaz) | Backend'i çağırmadığı için frontend'de sahte "başarılı" mesajı | Frontend |
| 5 | `turkiyeapi.dev` API'si kapanırsa | İlçe seçimi fallback'e düşer; çoğu şehir için ilçe listesi yok | Frontend |
| 6 | Aynı dosya adıyla iki belge yüklenirse | Multer timestamp prefix ekler ama `/uploads` path tahmin edilebilir | Backend |
| 7 | availableDates'e geçersiz tarih string'i girilirse (ör. "abc,def") | Parse hata vermez, geçersiz tarih `new Date('abc')` → Invalid Date | Backend |
| 8 | Carrier silinir ama offers/shipments FK ilişkisi devam ederse | ON DELETE NO ACTION — 500 hatası veya orphan data | Backend |
| 9 | JWT token expired ama localStorage.currentUser geçerli | Frontend giriş yapmış gösterir, her API çağrısı 401 döner, sonsuz redirect loop riski | Frontend |
| 10 | Kullanıcı `/uploads/documents/` path'ini enumerate ederse | Tüm nakliyeci belgeleri (kimlik, vergi, sigorta) indirilebilir | Güvenlik |
| 11 | Admin tokenı XSS ile çalınırsa | localStorage'daki token ile tüm admin API'ları çağrılabilir | Güvenlik |
| 12 | Aynı ödeme iki kez gönderilirse (double submit) | Backend PaymentService'te duplicate kontrolü yok | Backend |
| 13 | CarrierRespond'da min_offer_price her zaman 100₺ | Admin settings erişilemiyor, platform ayarı uygulanmıyor | Frontend |
| 14 | Shipment `photoUrls` JSON alanına devasa array gönderilirse | Body size 10MB ama JSON parse maliyeti yüksek olabilir | Backend |
| 15 | Müşteri şifre sıfırlama token'ını brute force ederse | 6 karakter, Math.random — ~2.18 milyar olasılık, hesaplama ucuz | Güvenlik |
| 16 | Rate limit bypass: IP değiştirerek (proxy/VPN) | Rate limiter IP bazlı, distributed saldırıda yetersiz | Backend |
| 17 | `RegisterCarrier` `foundedYear` 1990-2025 hardcoded | 2026'da "bu yıl kurulan" şirket seçelemeyecek | Frontend |
| 18 | Earnings page'de `totalPaid` hesabı backend bağımsız çalışıyorsa | Frontend `%12` artış hardcoded — gerçek trendi yansıtmaz | Frontend |
| 19 | `apiClient` network error (fetch rejection) yakalanmıyor | Sunucu kapalıysa veya internet yoksa kullanıcıya hata gösterilmez | Frontend |
| 20 | Admin CSV export client-side filtrelenmiş veriyle | Sayfalanmış verinin sadece mevcut sayfasını dışa aktarır, tam veriyi değil | Frontend |
| 21 | AdminCarriers tarih filtreleme client-side | Sunucu sayfalanmış verinin sadece o sayfasını filtreler — yanlış sonuçlar | Frontend |
| 22 | İki farklı admin aynı anda aynı carrier'ı verify ederse | Race condition — iki audit log kaydı | Backend |
| 23 | Carrier aynı gönderiye ikinci teklif vermeye çalışırsa | Backend `ConflictError` fırlatır — ama frontend bu hatayı güzel göstermeyebilir | Frontend |
| 24 | NotificationBell'deki tüm catch blokları boş | Bildirim API başarısızlıkları sessizce yutulur | Frontend |

---

## 9. Hata Yönetimi & Operasyonel Dayanıklılık

### 9.1 — Backend Hata Yönetimi (Orta)
- ✅ Domain error sınıfları: `NotFoundError`, `ValidationError`, `ForbiddenError`, `ConflictError`, `UnauthorizedError`
- ✅ Controller seviyesinde try-catch pattern
- ✅ Consistent HTTP status code mapping
- ❌ Global error handler var mı kontrolü yapılmadı — controller dışına kaçan hatalar için `process.on('uncaughtException')` yok
- ❌ Rate limit aşımında dönen JSON formatı frontend tarafından parse edilmiyor olabilir

### 9.2 — Frontend Hata Yönetimi (Zayıf)
- ❌ `apiClient.ts` sadece 401'i yakalıyor. 500, 403, 404, network error için **hiçbir genel mekanizma yok**
- ❌ `NotificationBell.tsx` — tüm catch blokları boş `catch { }`
- ❌ `AdminLayout.tsx` — stats fetch `.catch(() => {})` ile yutulmuş
- ❌ `AdminAuditLog.tsx` — catch block entries'i boşaltıyor, hata göstermiyor
- ❌ `OfferRequestForm.tsx` — availability check hatası sessiz
- ❌ `Messages.tsx` — conversationId yoksa boş render
- ✅ `ErrorBoundary.tsx` bileşeni var (uncaught render hataları için)
- ✅ TanStack Query'nin `isError` state'i bazı sayfalarda doğru kullanılıyor

### 9.3 — Loglama
- ✅ `AuditLog` entity'si admin işlemleri için — iyi
- ❌ Backend'de uygulama seviyesinde yapısal loglama (Winston, Pino) gözlemlenmedi. `console.log`'a bağımlı olabilir
- ❌ Request/response loglama middleware'i yok

### 9.4 — Veritabanı Dayanıklılığı
- ✅ Connection pool: 10
- ✅ synchronize: false (production-safe)
- ❌ Migration rollback stratejisi belirsiz — `down()` methodu var mı?
- ❌ Health check sadece `{ success: true }` döndürüyor — veritabanı bağlantı kontrolü yapmıyor

---

## 10. Güçlü / Zayıf Yanlar

### Güçlü Yanlar
1. **Backend mimarisi disiplinli.** DDD-lite yaklaşım (Entity → Repository → Service → Controller → Route) tutarlı uygulanmış. 26 entity arasındaki ilişkiler doğru kurulmuş.
2. **Auth middleware katmanlı ve doğru.** JWT doğrulaması kriptografik, rol bazlı erişim granüler (`authenticateCustomer`, `authenticateCarrier`, `authenticateAdmin`, `requireSuperadmin`).
3. **Profil tamamlama mekanizması akıllı.** `CarrierProfileStatusService` 4 bölüm × %25 hesaplama ve `checkCarrierProfileCompletion` middleware ile iş kuralı enforced.
4. **Admin paneli eksiksiz ve gerçek API ile entegre.** 13 admin sayfası tamamı backend'e bağlı. Audit log, soft delete, carrier doğrulama, belge onayı hepsi çalışır.
5. **Shipment status geçişleri atomik.** `transitionStatusIfCurrent` CAS pattern ile race condition riski azaltılmış (shipment seviyesinde).
6. **TypeORM migration stratejisi doğru.** `synchronize: false` ile production-safe. 14 migration dosyası incremental şekilde şema değişikliklerini yönetiyor.
7. **Rate limiting aktif.** Login (10/15dk), register (5/saat), genel (200/15dk) — temel brute force koruması mevcut.
8. **Türkçe lokalizasyon tutarlı.** Route path'leri, UI metinleri, hata mesajları Türkçe. Legacy İngilizce path'ler redirect ile yönetiliyor.

### Zayıf Yanlar
1. **Kritik iş akışları sahte.** Ödeme ve yorum — platformun para kazanma ve güven mekanizmasının iki temel direği — frontend'de `setTimeout` mock'ları.
2. **E-posta altyapısı yok.** Şifre sıfırlama, e-posta doğrulama, bildirim e-postaları — hepsi token'ı HTTP yanıtında döndürerek "yapılmış gibi" gösteriliyor.
3. **Frontend güvenliği yüzeysel.** Admin auth sadece localStorage boolean, JWT client-side decode (verify değil), üç ayrı auth state kaynağı, PII ifşası.
4. **`/uploads` dizini tamamen açık.** Nakliyeci belgeleri, profil fotoğrafları — autentikasyon olmadan herkes erişebilir.
5. **Frontend-backend sözleşme uyumsuzluğu yaygın.** Status enum drift, Payment akışı kopuk, Review akışı kopuk, CarrierRespond admin endpoint erişim hatası.
6. **Ölü kod yığını.** storage.ts legacy fonksiyonları, OfferRequestForm carrier matching, OfferComparison↔MyOffers duplikasyonu.
7. **UTF-8 encoding bozuk.** CarrierOnboarding.tsx'te tüm Türkçe karakterler mojibake.
8. **Şifre sıfırlama token'ı güvensiz.** 6 karakter, Math.random — brute force'a açık.

---

## 11. İyileştirme Önerileri

### Kısa Vadeli (Hemen)

| # | Öneri | Etki |
|---|-------|------|
| 1 | `/uploads` route'una auth middleware ekle veya signed URL pattern'ına geç | Belge ifşasını önler |
| 2 | `generateToken()`'ı `crypto.randomBytes(32).toString('hex')` ile değiştir | Brute force'u imkansız kılar |
| 3 | Reset token'ı HTTP yanıtından kaldır, e-posta servisine yönlendir (Nodemailer + SMTP en azından) | Güvenli şifre sıfırlama |
| 4 | `NotificationController.markRead`'e ownership kontrolü ekle | IDOR'u kapatır |
| 5 | `ShipmentService.assignCarrier`'a ownership kontrolü ekle | Yetkisiz carrier atamayı önler |
| 6 | `CarrierOnboarding.tsx` dosyasını UTF-8 olarak yeniden kaydet | UI'daki Türkçe karakter bozukluğunu düzeltir |
| 7 | `History.tsx`'teki yorum gönderimini gerçek `ReviewService` API'sine bağla | Yorumları DB'ye kaydet |
| 8 | Dashboard `normalizeStatus`'u backend enum'ları ile eşle | Durum bilgisi doğruluğu |
| 9 | CarrierRespond'daki admin settings çağrısını public config endpoint'ine yönlendir | Platform ayarlarının nakliyeciye ulaşmasını sağla |
| 10 | `RegisterUser.tsx` şifre placeholder'ını `"En az 8 karakter, 1 büyük harf, 1 rakam"` yap | Kullanıcı beklentisini düzelt |

### Orta Vadeli (Sprint Bazlı)

| # | Öneri | Etki |
|---|-------|------|
| 11 | Global state management (React Context veya Zustand) ile auth state'i merkezileştir | Üçlü auth state sorununu çözer |
| 12 | E-posta servisi entegrasyonu (Nodemailer + SMTP / SendGrid) | Doğrulama, bildirim, şifre sıfırlama akışlarını etkinleştirir |
| 13 | Ödeme gateway entegrasyonu (İyzico/PayTR) | Gerçek para akışını sağlar |
| 14 | `apiClient.ts`'ye generic error handler ekle (500, 403, 404, network) | Kullanıcıya anlamlı hata mesajları |
| 15 | `OfferService.acceptOffer`'a DB-level locking veya atomic CAS pattern ekle | Race condition'ı önler |
| 16 | Frontend'de tüm ham `fetch` çağrılarını `apiClient`'a migre et | Tutarlı auth header ve error handling |
| 17 | `storage.ts` legacy fonksiyonlarını ve referanslarını temizle | Ölü kod eliminasyonu |
| 18 | `OfferComparison.tsx` ve `MyOffers.tsx`'i ortak bileşene refactor et | Kod duplikasyonunu azalt |
| 19 | Messages sayfasına polling (refetchInterval) veya WebSocket ekle | Gerçek zamanlı mesajlaşma |
| 20 | Backend'e yapısal loglama (Winston/Pino) ekle | Operasyonel görünürlük |

### Uzun Vadeli (Mimari)

| # | Öneri | Etki |
|---|-------|------|
| 21 | Upload sistemi S3/MinIO'ya taşı + signed URL pattern | Ölçeklenebilir, güvenli dosya erişimi |
| 22 | Admin token'ı httpOnly cookie'ye taşı | XSS token çalma riskini elimine eder |
| 23 | Payment ve EarningsLog arasına reconciliation mekanizması kur | Finansal tutarlılık |
| 24 | Health endpoint'ine DB connection check ekle | Gerçek sağlık durumu |
| 25 | MIME type magic bytes doğrulaması ekle (file-type kütüphanesi) | Kötü amaçlı dosya yükleme koruması |

---

## 12. Önceliklendirilmiş Bulgular (P0–P3)

### P0 — Kritik (Üretime Çıkmadan MUTLAKA Düzeltilmeli)

| # | Bulgu | Dosya | Açıklama |
|---|-------|-------|----------|
| P0-1 | `/uploads` dizini erişim kontrolsüz | `src/index.ts` | Nakliyeci belgeleri (kimlik, vergi, sigorta) auth olmadan indirilebilir. KVKK ihlali riski. |
| P0-2 | Şifre sıfırlama token'ı güvensiz | `AuthService.ts` | 6 karakter Math.random + HTTP yanıtında döndürülüyor. Brute force ile herhangi bir hesap ele geçirilebilir. |
| P0-3 | Ödeme sistemi tamamen sahte | `Payment.tsx` + `PaymentService.ts` | Her iki katmanda sahte. Frontend kredi kartı bilgisi toplayıp hiçbir yere göndermemiyor — PCI-DSS riski. Kredi kartı formu ya kaldırılmalı ya da gerçek gateway entegre edilmeli. |
| P0-4 | E-posta servisi yok | `AuthService.ts` | Şifre sıfırlama ve doğrulama token'ları HTTP yanıtında döndürülüyor. Güvenlik açığı. |

### P1 — Yüksek Öncelik (İlk Sprint'te Düzeltilmeli)

| # | Bulgu | Dosya | Açıklama |
|---|-------|-------|----------|
| P1-1 | Notification IDOR | `NotificationController.ts` | Herhangi bir kullanıcı başka kullanıcının bildirimini okundu yapabilir. |
| P1-2 | assignCarrier ownership kontrolü yok | `ShipmentService.ts` | Herhangi bir müşteri herhangi bir gönderiye nakliyeci atayabilir. |
| P1-3 | getShipmentById yetki kontrolü yok | `ShipmentService.ts` | Herhangi bir autentike kullanıcı herhangi bir gönderiyi görebilir. |
| P1-4 | CarrierOnboarding UTF-8 bozuk | `CarrierOnboarding.tsx` | Tüm Türkçe karakterler mojibake. Sayfa kullanılamaz. |
| P1-5 | Yorum akışı backend'e bağlı değil | `History.tsx` | Backend ReviewService çalışıyor ama frontend çağırmıyor. |
| P1-6 | Frontend admin auth sadece localStorage boolean | `AdminProtectedRoute.tsx` | Herhangi bir string ile admin UI'ına erişilebilir. |
| P1-7 | Offer accept race condition | `OfferService.ts` | Eşzamanlı kabul çağrıları aynı gönderi için iki teklif kabul edebilir. |
| P1-8 | Üçlü auth state senkron sorunu | `storage.ts` + `auth.ts` + direkt localStorage | JWT expired ama currentUser geçerli → sonsuz 401 loop riski. |

### P2 — Orta Öncelik (Planlı Sprint'te Ele Alınmalı)

| # | Bulgu | Dosya | Açıklama |
|---|-------|-------|----------|
| P2-1 | Dashboard status mapping hatalı | `Dashboard.tsx` | completed→delivered, in_transit→matched, offer_received→pending. İstatistikler yanıltıcı. |
| P2-2 | OfferRequestForm carrier matching ölü kod | `OfferRequestForm.tsx` | ~100 satır filtreleme kodu hiçbir zaman çalışmıyor. |
| P2-3 | CarrierRespond admin endpoint erişemiyor | `CarrierRespond.tsx` | min_offer_price her zaman varsayılan 100₺. |
| P2-4 | RegisterCarrier vehicleTypeIds boş | `RegisterCarrier.tsx` | Nakliyeci kayıtta araç tipi bilgisi kaydedilmiyor. |
| P2-5 | Tutarsız HTTP client kullanımı | Birçok sayfa | Ham fetch vs apiClient karışımı → auth header eksikliği riski. |
| P2-6 | PII ifşası (nakliyeci) | `CarrierProfile.tsx` | E-posta, telefon, vergi no herkese açık. KVKK riski. |
| P2-7 | storage.ts ölü kod | `storage.ts` | ~200 satır kullanılmayan prototip kodu. |
| P2-8 | Mesajlaşma real-time değil | `Messages.tsx` | Tek seferlik fetch, polling/WebSocket yok. |
| P2-9 | bcrypt round tutarsızlığı | `CustomerService.ts` vs `CarrierAuthService.ts` | 12 vs 10 round. |
| P2-10 | Carrier entity araç bilgisi çift tutulmuş | `Carrier` entity | `vehicleBrand/Model/Year/CapacityM3` + ayrı `Vehicle` entity. |
| P2-11 | Admin CSV export sayfalanmış verinin sayfası | `AdminCarriers.tsx` | Sadece mevcut sayfa export edilir, tam veri değil. |

### P3 — Düşük Öncelik (Backlog)

| # | Bulgu | Dosya | Açıklama |
|---|-------|-------|----------|
| P3-1 | Login error state'i başarı için kullanılıyor | `Login.tsx` | Kırmızı hata kutusunda yeşil ✅ emoji. |
| P3-2 | RegisterUser placeholder yanlış | `RegisterUser.tsx` | "6 karakter" yazıyor, 8 karakter istiyor. |
| P3-3 | Earnings %12 hardcoded | `Earnings.tsx` | Gerçek veriden bağımsız sabit gösterim. |
| P3-4 | OfferComparison ↔ MyOffers duplikasyonu | Her iki dosya | ~280+270 satır neredeyse identik. |
| P3-5 | foundedYear 2025 hardcoded | `RegisterCarrier.tsx` | 2026'da bozulacak. |
| P3-6 | NotificationBell boş catch blokları | `NotificationBell.tsx` | Hata sessizce yutulur. |
| P3-7 | Bildirim çift tip sabitleri | `NotificationBell.tsx` | `offer_received` + `NEW_OFFER` → eski/yeni format karışımı. |
| P3-8 | window.confirm() kullanımı | `ShipmentDetail.tsx` | Tarayıcı native dialog, UX tutarsızlığı. |
| P3-9 | Health endpoint DB kontrol yapmıyor | `src/index.ts` | Sadece `{ success: true }` döner. |
| P3-10 | Payment migration'da carrierId FK yok | Migration dosyası | Carrier bazlı ödeme sorgusu yapılamaz. |

---

## Özet Metrikler

| Kategori | Sayı |
|----------|------|
| P0 (Kritik) | 4 |
| P1 (Yüksek) | 8 |
| P2 (Orta) | 11 |
| P3 (Düşük) | 10 |
| **Toplam Bulgu** | **33** |
| Güvenlik Açığı | 8 |
| Mantık Hatası | 8 |
| Eksik Özellik | 10 |
| Ölü Kod | 5 |
| Tutarsızlık | 7 |

---

*Bu rapor statik kod analizi ile hazırlanmıştır. Runtime testleri, yük testleri ve penetrasyon testleri ayrıca yapılmalıdır.*
