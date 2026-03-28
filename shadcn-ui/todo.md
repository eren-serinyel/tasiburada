# Taşıburada - Development Plan & Progress

## ✅ Backend — Tamamlandı

### Auth & Kullanıcı
- [x] Müşteri kayıt / giriş (JWT — firstName, lastName payload'a eklendi)
- [x] Nakliyeci kayıt / giriş (JWT — companyName payload'a eklendi)
- [x] JWT auth middleware (authenticateCustomer, authenticateCarrier, authenticateToken)
- [x] Müşteri profil görüntüle / güncelle / şifre değiştir
- [x] Rate limiting (global API, login, register)

### Shipment (Taşıma)
- [x] Taşıma oluştur / güncelle / sil
- [x] Taşıma detay (carrier + customer nested)
- [x] Durum geçişleri: pending → offer_received → matched → in_transit → completed / cancelled
- [x] `PUT /shipments/:id/start` — nakliyeci taşımayı başlatır
- [x] `PUT /shipments/:id/complete` — nakliyeci taşımayı teslim eder
- [x] `PUT /shipments/:id/cancel` — müşteri taşımayı iptal eder
- [x] FK cascade delete kuralları normalize (migration çalıştırıldı)

### Offer (Teklif)
- [x] Nakliyeci teklif verir (`POST /offers`)
- [x] Müşteri kabul / reddeder (`PUT /offers/:id/accept`, `/reject`)
- [x] Nakliyecinin tekliflerini listele (`GET /carriers/me/offers`)
- [x] Müşterinin gelen tekliflerini listele (`GET /customers/offers`)
- [x] Nakliyeci teklif güncelle (fiyat, mesaj) — `PUT /offers/:id`
- [x] Nakliyeci teklif geri çek / iptal et — `PUT /offers/:id/withdraw` (WITHDRAWN status)

### Nakliyeci Profil
- [x] Şirket bilgisi, faaliyet bilgisi, araçlar, hizmet türleri
- [x] Belgeler (multer upload)
- [x] Profil fotoğrafı upload
- [x] Güvenlik ayarları, bildirim tercihleri
- [x] Profil tamamlanma skoru

### Nakliyeci İstatistikleri
- [x] `totalOffers` artırma — teklif verildiğinde
- [x] `completedShipments` artırma + `successRate` hesaplama — taşıma tamamlandığında
- [x] `cancelledShipments` artırma + `successRate` hesaplama — iptal edildiğinde
- [x] `rating` güncelleme — yorum yapıldığında
- [x] `GET /carriers/me/stats` — dashboard istatistikleri
- [x] `GET /carriers/me/earnings-history` — işlem bazlı kazanç geçmişi
- [x] Taşıma tamamlandığında `CarrierEarningsLog`'a kayıt ekleme

### Review (Değerlendirme)
- [x] Müşteri taşımaya yorum yazar
- [x] Müşteri carrier ID üzerinden yorum yazar
- [x] Carrier yorumları listeleme
- [x] Ortalama puan otomatik güncelleme

### Bildirimler
- [x] `GET /notifications` — bildirim listesi
- [x] `PUT /notifications/:id/read` — okundu
- [x] `PUT /notifications/read-all` — tümünü okundu
- [x] `GET /notifications/unread-count`

### Admin Panel
- [x] Admin auth (ayrı token)
- [x] Nakliyeci onay kuyruğu, belge doğrulama
- [x] Nakliyeci / Müşteri / Taşıma / Yorum listesi ve yönetimi
- [x] Admin dashboard istatistikleri, denetim logu
- [x] Dashboard trend endpoint + gerçek veri
- [x] CarrierDetail İşler/Yorumlar API bağlantısı
- [x] Teklifler sayfası (iptal işlemi)
- [x] Belgeler sayfası (onay/red + bildirim)
- [x] Raporlar sayfası (KPI, trend grafikleri, top nakliyeciler)
- [x] Ayarlar sayfası (genel, komisyon, bildirim, güvenlik)
- [x] Admin yönetimi sayfası (CRUD)

---

## ✅ Frontend — Tamamlandı

### Altyapı
- [x] Merkezi `apiClient.ts` (token inject + 401 handler)
- [x] `auth.ts` yardımcıları: `getAuthToken`, `getUserType`, `getUserId`, `getUserName`, `getUserEmail`
- [x] Navbar, JWT payload'dan isim / email gösteriyor
- [x] Protected route yapısı (role bazlı)
- [x] Tüm console.log / console.warn / console.error temizliği

### Sayfalar
- [x] Landing page (Index.tsx)
- [x] Giriş (Login.tsx)
- [x] Müşteri kayıt (RegisterUser.tsx)
- [x] Nakliyeci kayıt (RegisterCarrier.tsx)
- [x] Dashboard — müşteri + nakliyeci (aktif işler `Promise.allSettled` ile)
- [x] İlanlarım / Shipment List (ShipmentList.tsx)
- [x] İlan detay — rol bazlı butonlar (ShipmentDetail.tsx)
  - Nakliyeci: Taşımayı Başlat (matched), Teslim Edildi (in_transit), Teklif Ver (pending/offer_received)
  - Müşteri: Ödeme Yap (matched/in_transit), İptal Et (pending/matched), Değerlendir (completed)
- [x] İlan oluştur (CreateShipment.tsx)
- [x] Teklif karşılaştırma (OfferComparison.tsx) — API bağlı
- [x] Gelen tekliflerim (MyOffers.tsx) — kabul / reddet
- [x] Nakliyeci tekliflerim (CarrierOffers.tsx)
- [x] Nakliyeci teklif ver (CarrierRespond.tsx)
- [x] Ödeme sayfası (Payment.tsx) — API'den shipment çekiyor, sade kart formu
- [x] Bildirimler (Notifications.tsx) — API bağlı, okundu işaretle
- [x] Geçmiş (History.tsx) — durum filtreli, API bağlı
- [x] Profil (Profile.tsx) — API bağlı
- [x] Nakliyeci değerlendirme / yorumlar (CarrierReviews.tsx)
- [x] Nakliyeci liste + dizin (CarrierList, CarrierDirectory)
- [x] Nakliyeci detay sayfası (CarrierDetailPage.tsx)
- [x] Nakliyeci profil sayfası (CarrierProfile.tsx)
- [x] Admin panel (Dashboard, Carriers, Customers, Shipments, Reviews, CarrierDetail, ApprovalQueue, AuditLog)
- [x] Mesajlar (Messages.tsx) — UI hazır, backend yok

### Eksik / localStorage hâlâ kullanılan
- [x] **Payments.tsx** — localStorage'dan API'ye geçiş (tamamlanan taşımalar üzerinden) ✅
- [x] **Earnings.tsx** — localStorage'dan API'ye geçiş (`/carriers/me/stats` + earnings-history) ✅

---

## 🔜 Sıradaki Geliştirmeler (Öncelik Sırasıyla)

1. ~~Earnings & Payments API entegrasyonu~~ ✅ TAMAMLANDI
   - ~~Backend: `ShipmentService.completeShipmentByCarrier()` içinde `CarrierEarningsLog` kaydı~~ ✅
   - ~~Backend: `GET /carriers/me/earnings-history` endpoint~~ ✅
   - ~~Frontend: `Earnings.tsx` → stats + earnings history API~~ ✅
   - ~~Frontend: `Payments.tsx` → tamamlanan taşımalar API~~ ✅

2. ~~Nakliyeci teklif güncelle / geri çek~~ ✅ TAMAMLANDI
   - ~~Backend: `PUT /offers/:id` (fiyat, mesaj, tahmini süre)~~ ✅
   - ~~Backend: `PUT /offers/:id/withdraw` (WITHDRAWN status + bildirim)~~ ✅
   - ~~Frontend: CarrierOffers.tsx güncelle/iptal butonları aktif~~ ✅

3. ~~Admin Panel Güçlendirme (Sprint 5)~~ ✅ TAMAMLANDI
   - ~~Dashboard trend gerçek API verisi~~ ✅
   - ~~CarrierDetail İşler + Yorumlar sekmeleri~~ ✅
   - ~~Shipments search + Reviews rating backend~~ ✅
   - ~~Admin Teklifler sayfası~~ ✅
   - ~~Admin Belgeler sayfası (belge doğrulama)~~ ✅
   - ~~Admin Raporlar sayfası (grafikler, tablolar)~~ ✅
   - ~~Admin Ayarlar sayfası~~ ✅
   - ~~Admin Yönetimi sayfası (CRUD)~~ ✅

4. **[CURRENT]** Mesajlaşma (Messages) backend
   - Entitiy: Conversation, Message
   - Routes: `GET /messages/:conversationId`, `POST /messages`

5. Kariyer takvimi (CarrierCalendar.tsx) — gerçek shipment verisiyle

6. E-posta bildirimleri (kayıt, teklif geldi, taşıma tamamlandı)

7. Harita entegrasyonu (Leaflet veya Google Maps) rota görselleştirme