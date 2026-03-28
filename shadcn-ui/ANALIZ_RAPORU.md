# TaşıBurada — Kapsamlı Denetim ve Analiz Raporu

> Bu rapor; Admin Paneli, Kullanıcı Tarafı, MVP Önceliklendirme ve Uygulama Planı olmak üzere **4 faz** halinde hazırlanmıştır.  
> **Tarih:** Haziran 2025  
> **Kapsam:** Backend (22 entity, 60+ endpoint), Frontend (40+ sayfa/component), Admin Panel (10 sayfa)

---

# ═══════════════════════════════════════════════════════════════
# FAZ 1 — ADMİN PANELİ DENETİMİ
# ═══════════════════════════════════════════════════════════════

## 1.1 Mevcut Admin Paneli Durumu

### Mevcut Sayfalar (10 adet)

| # | Sayfa | Rota | Durum |
|---|-------|------|-------|
| 1 | AdminLogin | `/admin/giris` | ✅ Çalışıyor |
| 2 | AdminDashboard | `/admin/panel` | ⚠️ Kısmi (sahte trend verisi) |
| 3 | AdminCarriers | `/admin/nakliyeciler` | ✅ Çalışıyor |
| 4 | AdminCarrierDetail | `/admin/nakliyeciler/:carrierId` | ⚠️ Kısmi (İşler ve Yorumlar sekmeleri boş) |
| 5 | AdminCustomers | `/admin/musteriler` | ⚠️ Alan adı uyumsuzlukları |
| 6 | AdminShipments | `/admin/ilanlar` | ⚠️ Alan adı uyumsuzlukları, arama backend yok |
| 7 | AdminReviews | `/admin/yorumlar` | ⚠️ Rating filtre backend desteği yok |
| 8 | AdminApprovalQueue | `/admin/onay-kuyrugu` | ✅ Çalışıyor |
| 9 | AdminAuditLog | `/admin/audit-log` | ⚠️ Alan adı uyumsuzlukları |
| 10 | AdminLayout + Sidebar | — | ✅ Çalışıyor |

### Sidebar'da Olup Sayfası OLMAYAN Rotalar (5 adet)

| # | Sidebar Öğesi | Rota | İkon |
|---|--------------|------|------|
| 1 | **Teklifler** | `/admin/teklifler` | HandCoins |
| 2 | **Belgeler** | `/admin/belgeler` | FileCheck |
| 3 | **Raporlar** | `/admin/raporlar` | BarChart3 |
| 4 | **Ayarlar** | `/admin/ayarlar` | Settings |
| 5 | **Admin Yönetimi** | `/admin/yonetim` | UserCog |

---

## 1.2 Mevcut Sayfa Eleştirileri

### 1.2.1 AdminDashboard — Eleştiri

**Mevcut durum:**
- 8 KPI kartı (2 satır × 4)
- 1 alan grafiği (30 günlük trend) — **Math.random() ile sahte veri üretiliyor**
- 1 pasta grafiği (ilan dağılımı) — gerçek veri ama statik
- Bekleyen nakliyeciler listesi (son 5)
- Son yorumlar listesi (son 5)

**Eksiklikler:**
1. **Gerçek trend verisi yok** — 30 günlük grafik tamamen sahte. Backend'de zaman serisi endpoint'i mevcut değil.
2. **Gelir metrikleri yok** — Platform üzerinden yapılan toplam işlem hacmi, komisyon geliri, ortalama sipariş değeri gibi finansal KPI'lar eksik.
3. **Uyarı/Alert sistemi yok** — Süresi geçmiş belgeler, yanıtlanmamış teklifler, uzun süredir bekleyen ilanlar için uyarı yok.
4. **Son aktiviteler akışı yok** — Yeni kayıtlar, yeni ilanlar, yeni teklifler gibi canlı aktivite akışı eksik.
5. **Karşılaştırmalı metrik yok** — Bu hafta vs. geçen hafta, bu ay vs. geçen ay gibi trend göstergeleri (↑↓) sahte veya yok.
6. **Hızlı eylem butonları yetersiz** — Sadece "Bekleyen Nakliyeciler" linki var. Hızlı ilan onaylama, acil destek talepleri gibi kısayollar yok.
7. **Dönüşüm metrikleri yok** — İlan→Teklif→Eşleşme→Tamamlanma oranları gibi funnel metrikleri eksik.

### 1.2.2 AdminCarriers — Eleştiri

**Mevcut durum:** Tablo + tabs (Tümü/Bekleyen/Onaylı/Reddedilen) + arama + sayfalandırma

**Eksiklikler:**
1. **Şehir filtresi yok** — Sadece metin arama var, şehre göre filtreleme yok.
2. **Tarih aralığı filtresi yok** — Kayıt tarihine göre filtreleme yok.
3. **Toplu eylem yok** — Birden fazla nakliyeciyi seçip toplu onay/red yapılamıyor.
4. **Dışa aktarım yok** — CSV/Excel export özelliği yok.
5. **Sıralama yok** — Puana, kayıt tarihine, iş sayısına göre sıralama yok.
6. **Profil tamamlama yüzdesi gösterilmiyor** — Tablo satırında profil tamamlama durumu yok.
7. **Son giriş tarihi yok** — Aktiflik durumunu değerlendirmek için lastLogin bilgisi kullanılmıyor.

### 1.2.3 AdminCarrierDetail — Eleştiri

**Mevcut durum:** 4 sekme (Genel, Belgeler, İşler, Yorumlar) + KPI kartları + Onayla/Reddet butonları

**Eksiklikler:**
1. **İşler sekmesi boş** — Backend, carrier detayında shipment'ları döndürmüyor.
2. **Yorumlar sekmesi boş** — Backend, carrier detayında review'ları döndürmüyor.
3. **Araç bilgileri yetersiz** — Sadece vehicles ilişkisi yükleniyor ama detaylı gösterim yok.
4. **Hizmet alanları gösterilmiyor** — CarrierActivity'deki serviceAreas bilgisi çekilmiyor.
5. **Kazanç bilgileri yok** — Bu nakliyecinin toplam kazancı, aylık kazancı gösterilmiyor.
6. **Belge doğrulama iş akışı yetersiz** — Her belgeyi tek tek onaylamak/reddetmek için UI yok; sadece carrier-seviye verify var.
7. **Notlar/İletişim yok** — Adminin nakliyeci hakkında not bırakabileceği bir alan yok.

### 1.2.4 AdminCustomers — Eleştiri

**Mevcut durum:** Tablo + tabs (Tümü/Aktif/Pasif) + arama + aktif/pasif toggle

**Eksiklikler:**
1. **Alan adı uyumsuzluğu** — Frontend `customer.name/surname` bekliyor, backend `firstName/lastName` döndürüyor.
2. **Müşteri detay sayfası yok** — Satıra tıklayınca gidilecek detay sayfası mevcut değil.
3. **İlan sayısı gösterilmiyor** — Her müşterinin kaç ilan verdiği tabloda yok.
4. **Harcama bilgisi yok** — Toplam harcama, ortalama sipariş değeri yok.
5. **Adres bilgisi yok** — Şehir/ilçe bilgisi tabloda gösterilmiyor.

### 1.2.5 AdminShipments — Eleştiri

**Mevcut durum:** Tablo + 6 durum sekmesi + arama

**Eksiklikler:**
1. **Ciddi alan adı uyumsuzlukları:**
   - Frontend `s.title` bekliyor → Backend'de `title` alanı yok (loadDetails var)
   - Frontend `s.originCity/destinationCity` → Backend'de `origin/destination` (string)
   - Frontend `s.customer.name/surname` → Backend'de `firstName/lastName`
2. **Arama backend desteği yok** — `AdminService.getShipments()` search parametresi kabul etmiyor.
3. **Detay sayfası yok** — İlan satırına tıklayınca gidilecek admin-seviye detay sayfası yok.
4. **Fiyat bilgisi gösterilmiyor** — Teklif edilen/kabul edilen fiyat tabloda yok.
5. **Nakliyeci bilgisi yok** — Eşleşmiş ilanlar için atanan nakliyeci gösterilmiyor.
6. **Tarih aralığı filtresi yok**.
7. **Yük tipi filtresi yok**.

### 1.2.6 AdminReviews — Eleştiri

**Mevcut durum:** Tablo + yıldız filtre sekmeleri + silme

**Eksiklikler:**
1. **Rating filtresi backend'de yok** — Frontend 1-5 yıldız tabları gösteriyor ama backend filter desteklemiyor.
2. **Alan adı uyumsuzluğu** — `review.customer.name/surname` vs `firstName/lastName`.
3. **Yorum gizleme yok** — Sadece tam silme var, gizleme/askıya alma yok.
4. **Yorum detayı yok** — Hangi ilan/nakliyeci için yapıldığı linki yok.
5. **Şikâyet yönetimi yok** — Raporlanmış yorumları ayrı görecek bir filtre yok.

### 1.2.7 AdminApprovalQueue — Eleştiri

**Mevcut durum:** Kart tabanlı layout + Onayla/Reddet/İncele butonları

**Eksiklikler:**
1. **Belge önizleme yok** — Nakliyecinin yüklediği belgeleri kuyruktan göremiyorsun.
2. **Sıralama yok** — En eski bekleyenler önce gelmeli.
3. **Toplu onay yok** — Birden fazla nakliyeciyi seçip toplu onaylama yok.
4. **Bekleyen belge sayısı yok** — Her nakliyeci kartında kaç belge beklediği görünmüyor.

### 1.2.8 AdminAuditLog — Eleştiri

**Mevcut durum:** Tablo + arama + sayfalandırma

**Eksiklikler:**
1. **Alan adı uyumsuzluğu** — Frontend `entityType/entityId/adminName` kullanıyor, backend `targetType/targetId` döndürüyor, `adminName` döndürmüyor.
2. **Tarih aralığı filtresi yok**.
3. **İşlem tipi filtresi yok**.
4. **Admin filtresi yok** — Hangi adminin yaptığını filtreleyemiyorsun..
5. **Detay modalı yok** — Audit log girdisine tıklayınca detaylı JSON görüntüleme yok.

---

## 1.3 Eksik Admin Sayfaları — Detaylı Spesifikasyonlar

### 1.3.1 Admin Teklifler Sayfası (`/admin/teklifler`)

**Amaç:** Platformdaki tüm teklifleri izlemek, müdahale etmek.

**Backend gereksinimi:**
- `GET /admin/offers?status=pending|accepted|rejected&page=X&limit=X&search=X` (YENİ endpoint)
- `DELETE /admin/offers/:offerId` (YENİ endpoint)

**Tablo kolonları:**

| Kolon | Kaynak | Açıklama |
|-------|--------|----------|
| Teklif ID | `offer.id` (ilk 8 char) | Kopyalanabilir |
| İlan | `offer.shipment.origin → destination` | İlan detayına link |
| Nakliyeci | `offer.carrier.companyName` | Nakliyeci detayına link |
| Müşteri | `offer.shipment.customer.fullName` | — |
| Fiyat | `offer.price` | ₺ formatında |
| Durum | `offer.status` | StatusBadge (pending/accepted/rejected) |
| Tarih | `offer.offeredAt` | Göreceli tarih |
| İşlemler | — | Görüntüle, İptal Et, Sil |

**Filtreler:** Durum tabs (Tümü/Bekleyen/Kabul/Red), arama, sayfalandırma

**Aksiyonlar:**
- Teklifi iptal et (status → rejected, audit log)
- Teklifi sil (soft delete, audit log)
- İlanı görüntüle (link)
- Nakliyeci profilini görüntüle (link)

---

### 1.3.2 Admin Belgeler Sayfası (`/admin/belgeler`)

**Amaç:** Nakliyecilerin yüklediği belgeleri tek merkezden yönetmek ve doğrulamak.

**Backend gereksinimi:**
- `GET /admin/documents?status=PENDING|APPROVED|REJECTED&type=X&page=X&search=X` (YENİ endpoint)
- `PUT /admin/documents/:documentId/verify` (body: `{ approved: boolean, reason?: string }`) (YENİ endpoint)

**Tablo kolonları:**

| Kolon | Kaynak | Açıklama |
|-------|--------|----------|
| Nakliyeci | `carrier.companyName` | Nakliyeci detayına link |
| Belge Tipi | `document.type` | Badge (K Belgesi, SRC, Ruhsat, Vergi, Sigorta) |
| Durum | `document.status` | StatusBadge (PENDING/APPROVED/REJECTED) |
| Dosya | `document.fileUrl` | Önizleme/İndir butonu |
| Yükleme Tarihi | `document.uploadedAt` | Göreceli tarih |
| Doğrulama Tarihi | `document.verifiedAt` | — veya tarih |
| İşlemler | — | Onayla, Reddet (nedenli), Önizle |

**Filtreler:** 
- Durum tabs: Tümü / Bekleyen / Onaylı / Reddedilen
- Belge tipi dropdown: K Belgesi, SRC, Ruhsat, Vergi Levhası, Sigorta
- Arama: Nakliyeci adı/e-posta

**Detay Modalı:**
- Belge büyük önizleme (resim/PDF)
- Nakliyeci bilgileri (ad, telefon, vergi no)
- Onay/Red butonları + Optional red nedeni textarea
- Geçmiş durum değişiklikleri

**İş akışı:**
1. Nakliyeci belge yükler → status: PENDING
2. Admin belgeler sayfasında görür
3. Admin belgeyi açar, inceler
4. Onaylar → status: APPROVED, verifiedAt set, audit log
5. Reddederse → status: REJECTED, audit log (nedenle), nakliyeciye bildirim

---

### 1.3.3 Admin Raporlar Sayfası (`/admin/raporlar`)

**Amaç:** Platform performansını izlemek, trend analizi yapmak, karar destek.

**Backend gereksinimi:**
- `GET /admin/reports/overview?period=week|month|quarter|year` (YENİ endpoint)
- `GET /admin/reports/revenue?period=...&groupBy=day|week|month` (YENİ endpoint)
- `GET /admin/reports/carriers?period=...` (YENİ endpoint)
- `GET /admin/reports/shipments?period=...` (YENİ endpoint)

**Alt sekmeleri:**

#### Sekme 1: Genel Bakış
- **KPI Kartları:** Toplam Gelir (₺), Toplam İlan, Toplam Teklif, Eşleşme Oranı (%), Ortalama Teslim Süresi
- **Grafik 1:** Aylık İlan Trendi (AreaChart, son 12 ay)
- **Grafik 2:** Aylık Teklif/Eşleşme Trendi (BarChart, yan yana)
- **Grafik 3:** Gelir Trendi (AreaChart, kümülatif)

#### Sekme 2: Nakliyeci Analizi
- **KPI:** Yeni Kayıt, Aktif Nakliyeci, Ortalama Profil Tamamlama %
- **Tablo:** En çok iş alan Top 10 nakliyeci (ad, şehir, iş sayısı, puan, kazanç)
- **Grafik:** Nakliyeci dağılımı (şehirlere göre, pasta)

#### Sekme 3: İlan Analizi
- **KPI:** Toplam İlan, Eşleşme Oranı, Ortalama Teklif Süresi, İptal Oranı
- **Grafik 1:** Yük tipi dağılımı (pie/donut)
- **Grafik 2:** Şehir çifti ısı haritası (en popüler güzergahlar)
- **Tablo:** En popüler güzergahlar (çıkış → varış, sayı, ort. fiyat)

#### Sekme 4: Müşteri Analizi
- **KPI:** Toplam Müşteri, Aktif Müşteri (son 30 gün), Yeni Kayıt (bu ay)
- **Grafik:** Müşteri büyüme trendi (line chart)
- **Tablo:** En aktif müşteriler (ad, ilan sayısı, harcama)

---

### 1.3.4 Admin Ayarlar Sayfası (`/admin/ayarlar`)

**Amaç:** Platform yapılandırma ve parametrelerini yönetmek.

**Backend gereksinimi:**
- `GET /admin/settings` (YENİ endpoint)
- `PUT /admin/settings` (YENİ endpoint)

**Bölümleri:**

#### Bölüm 1: Genel Ayarlar
- Platform adı
- Platform logosu
- İletişim e-postası
- Telefon numarası
- Minimum teklif fiyatı (₺)
- Maksimum iptal oranı (%)
- Otomatik onay: Açık/Kapalı (nakliyeci kayıt sonrası otomatik onay)

#### Bölüm 2: Komisyon Ayarları
- Platform komisyon oranı (%)
- Minimum komisyon tutarı (₺)
- Kampanya döneminde komisyon oranı (%)

#### Bölüm 3: Bildirim Ayarları
- E-posta bildirim: Açık/Kapalı
- SMS bildirim: Açık/Kapalı
- Yeni kayıt admin bildirimi
- Yeni ilan admin bildirimi

#### Bölüm 4: Güvenlik
- Minimum şifre uzunluğu
- 2FA zorunluluğu (adminler için)
- Oturum zaman aşımı (dakika)
- Başarısız giriş kilitleme eşiği

---

### 1.3.5 Admin Yönetimi Sayfası (`/admin/yonetim`)

**Amaç:** Admin kullanıcılarını yönetmek (sadece superadmin erişimli).

**Backend gereksinimi:**
- `GET /admin/admins?page=X&limit=X` (YENİ endpoint)
- `POST /admin/admins` (YENİ endpoint)
- `PUT /admin/admins/:adminId` (YENİ endpoint)
- `DELETE /admin/admins/:adminId` (YENİ endpoint)

**Tablo kolonları:**

| Kolon | Kaynak | Açıklama |
|-------|--------|----------|
| E-posta | `admin.email` | — |
| Rol | `admin.role` | Badge (admin/superadmin) |
| Durum | `admin.isActive` | Aktif/Pasif toggle |
| Son Giriş | `admin.lastLogin` | Göreceli tarih veya "Hiç" |
| Kayıt Tarihi | `admin.createdAt` | — |
| İşlemler | — | Düzenle, Sil, Şifre Sıfırla |

**Yeni Admin Ekleme Formu:**
- E-posta (zorunlu)
- Şifre (zorunlu, min 8 karakter)
- Rol seçimi: admin / superadmin
- Aktif: Evet/Hayır

**Güvenlik:** Sadece `superadmin` rolündeki adminler bu sayfaya erişebilmeli.

---

## 1.4 Profesyonel Dashboard Tasarımı (Hedef)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ UYARI BANDI: 3 nakliyeci onay bekliyor | 7 belge beklemede     │
│                  2 ilan 48 saattir yanıtsız                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Toplam   │  │ Aktif    │  │ Eşleşme  │  │ Toplam   │           │
│  │ İlan     │  │ İlan     │  │ Oranı    │  │ Gelir    │           │
│  │ 1.247    │  │ 89       │  │ %72.4    │  │ ₺842K    │           │
│  │ ↑12%     │  │ ↑5%      │  │ ↓2.1%    │  │ ↑18%     │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                     │
│  ┌───────────────────────────────────┐  ┌─────────────────────┐    │
│  │  30 Günlük İlan Trendi           │  │  Durum Dağılımı     │    │
│  │  [═══════════════════AreaChart]   │  │  [PieChart]         │    │
│  │  Gerçek API verisinden           │  │                     │    │
│  └───────────────────────────────────┘  └─────────────────────┘    │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │  Son Aktiviteler    │  │  Hızlı Eylemler     │                  │
│  │  • Yeni kayıt: X    │  │  [Nakliyeci Onayla] │                  │
│  │  • Yeni ilan: Y     │  │  [Belge Doğrula]    │                  │
│  │  • Teklif: Z        │  │  [Rapor İndir]      │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐                  │
│  │  Bekleyen Nakliyeci │  │  Son Yorumlar       │                  │
│  │  (Mevcut widget)    │  │  (Mevcut widget)    │                  │
│  └─────────────────────┘  └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1.5 FAZ 1 Özet: Admin Panel Değerlendirmesi

| Kategori | Mevcut | Olması Gereken | Eksik |
|----------|--------|----------------|-------|
| Sayfalar | 10 | 15 | 5 yeni sayfa |
| Dashboard KPI | 8 (sahte trend) | 12+ (gerçek veri) | Trend API, Mali KPI'lar |
| Tablo Filtreleri | Temel (tabs+search) | Gelişmiş (tarih, çoklu, sıralama) | Tarih aralığı, dışa aktarım |
| Detay Sayfaları | 1 (CarrierDetail) | 4 (Carrier, Customer, Shipment, Offer) | 3 yeni detay sayfası |
| Backend Endpoint'ler | 14 | 25+ | 11+ yeni endpoint |
| Alan Adı Uyumluluğu | %40 | %100 | Kritik düzeltmeler gerekli |

---

# ═══════════════════════════════════════════════════════════════
# FAZ 2 — KULLANICI TARAFI ANALİZİ
# ═══════════════════════════════════════════════════════════════

## 2.1 Mantık Hataları ve Mock Data Kullanımı

### 2.1.1 KRİTİK: Mock Data Kullanan Sayfalar

Aşağıdaki sayfalar gerçek API yerine `localStorage` veya `mockDb` kullanmaktadır. Bu, bir MVP için **kabul edilemez** düzeyde kritik bir sorundur:

| # | Sayfa | Mock Kullanımı | Gerçek API Mevcut mu? | Etki |
|---|-------|---------------|----------------------|------|
| 1 | **ShipmentDetail.tsx** | localStorage (`shipments`, `users`, `payments`) | Kısmen (`GET /shipments/:id` var) | Kullanıcı ilan detayını göremez |
| 2 | **CarrierOffers.tsx** | localStorage (`offers`, `shipments`) | Evet (`GET /carriers/me/offers` var) | Nakliyeci tekliflerini yönetemez |
| 3 | **CarrierRespond.tsx** | mockDb (`addOffer`, `addNotification`) | Evet (`POST /offers/` var) | Teklif vermek çalışmaz |
| 4 | **MyOffers.tsx** | mockDb (`getAllOffers`, `updateOffer`) | Evet (`GET /customers/offers`, `PUT /offers/:id/accept\|reject`) | Müşteri teklif kabul/red yapamaz |
| 5 | **Payment.tsx** | localStorage (`payments`, `shipments`) | Hayır (ödeme backend'i yok) | Ödeme sistemi tamamen sahte |
| 6 | **Payments.tsx** | localStorage (`payments`) | Hayır | Ödeme geçmişi sahte |
| 7 | **Earnings.tsx** | localStorage (`payments`) | Kısmen (`carrier_earnings_log` entity var ama endpoint yok) | Kazanç tamamen sahte |
| 8 | **Notifications.tsx** | mockDb (`getAllNotifications`) | Hayır (bildirim backend'i yok) | Bildirimler tamamen sahte |
| 9 | **History.tsx** | localStorage (`shipments`) | Evet (`GET /customers/shipments` var) | Geçmiş sahte |
| 10 | **CarrierCalendar.tsx** | localStorage (`availability_X`) | Hayır (takvim backend'i yok) | Takvim tamamen sahte |
| 11 | **Dashboard.tsx** | mockDb (reviewsApi) + localStorage | Kısmen (API + mock karışık) | Karışık veri kaynağı, tutarsız |
| 12 | **CarrierProfile.tsx** | reviewsApi (localStorage) | Kısmen | Kullanıcı yorumları sahte |

### 2.1.2 Backend Olan Ama Frontend Bağlanmamış Sayfalar

Bu sayfalar API kullanabilecekken localStorage kullanıyor:

| Sayfa | Mevcut Veri Kaynağı | Bağlanması Gereken API |
|-------|---------------------|----------------------|
| CarrierOffers | localStorage → `offers` | `GET /api/v1/carriers/me/offers` |
| CarrierRespond | mockDb.addOffer() | `POST /api/v1/offers/` |
| MyOffers | mockDb.getAllOffers() | `GET /api/v1/customers/offers` |
| MyOffers → Accept | mockDb.updateOffer() | `PUT /api/v1/offers/:id/accept` |
| MyOffers → Reject | mockDb.updateOffer() | `PUT /api/v1/offers/:id/reject` |
| History | localStorage → `shipments` | `GET /api/v1/customers/shipments` |
| ShipmentDetail | localStorage | `GET /api/v1/shipments/:id` |
| Dashboard (carrier reviews) | reviewsApi (mock) | `GET /api/v1/carriers/me/reviews` |

### 2.1.3 Backend Olmayan ve Sıfırdan Yazılması Gereken

| Özellik | Frontend Sayfası | Gerekli Backend |
|---------|-----------------|----------------|
| Bildirim sistemi | Notifications.tsx, NotificationBell | Entity + Service + Controller + Routes |
| Ödeme sistemi | Payment.tsx, Payments.tsx | Payment entity + entegrasyon |
| Kazanç yönetimi | Earnings.tsx | Endpoint'ler (entity var, endpoint yok) |
| Nakliyeci takvimi | CarrierCalendar.tsx | CarrierAvailability entity + endpoints |
| Mesaj sistemi (polling/WS) | Messages.tsx | WebSocket veya polling |
| Destek talepleri | Support.tsx | SupportTicket entity + endpoints |
| Kampanya/Kupon | Campaigns.tsx | Campaign entity + endpoints |
| Sadakat programı | Loyalty.tsx | LoyaltyPoints entity + endpoints |

---

## 2.2 Alan Adı Uyumsuzlukları (Frontend ↔ Backend)

### 2.2.1 Customer Alanları

| Frontend Kullanımı | Backend Döndürdüğü | Etkilenen Sayfalar |
|-------------------|--------------------|--------------------|
| `customer.name` | `customer.firstName` | AdminCustomers, AdminShipments, AdminReviews, Dashboard |
| `customer.surname` | `customer.lastName` | AdminCustomers, AdminShipments, AdminReviews |
| `customer.fullName` | Yok (getter var entity'de ama serialize edilmiyor) | Birçok sayfa |

### 2.2.2 Shipment Alanları

| Frontend Kullanımı | Backend Döndürdüğü | Etkilenen Sayfalar |
|-------------------|--------------------|--------------------|
| `shipment.title` | Yok (`loadDetails` var) | AdminShipments, ShipmentList, Dashboard |
| `shipment.originCity` | `shipment.origin` (düz string) | AdminShipments, ShipmentList |
| `shipment.destinationCity` | `shipment.destination` (düz string) | AdminShipments, ShipmentList |
| `shipment.loadType` | `shipment.loadDetails` | ShipmentList (hardcoded 'ev-esyasi') |
| `shipment.distance` | Yok (hesaplanmıyor) | ShipmentList (hardcoded 0) |
| `shipment.description` | Yok (entity'de yok) | ShipmentList |

### 2.2.3 AuditLog Alanları

| Frontend Kullanımı | Backend Döndürdüğü | Etkilenen Sayfalar |
|-------------------|--------------------|--------------------|
| `log.entityType` | `log.targetType` | AdminAuditLog |
| `log.entityId` | `log.targetId` | AdminAuditLog |
| `log.adminName` | Yok (sadece adminId var) | AdminAuditLog |

### 2.2.4 Offer Alanları

| Frontend Kullanımı | Backend Döndürdüğü | Etkilenen Sayfalar |
|-------------------|--------------------|--------------------|
| `offer.carrier` (nesne) | İlişki join gerekli | OfferComparison |
| `offer.estimatedDuration` | Yok (entity'de yok) | CarrierRespond, MyOffers |
| `offer.validUntil` | Yok (entity'de yok) | Çeşitli |

---

## 2.3 Form Analizi

### 2.3.1 Müşteri Kayıt Formu (RegisterUser.tsx)

**Mevcut alanlar (3 adım):**

| Adım | Alan | Zorunlu | Validasyon | Backend Alanı |
|------|------|---------|-----------|---------------|
| 1 | Ad | ✅ | Min 2 karakter | firstName |
| 1 | Soyad | ✅ | Min 2 karakter | lastName |
| 1 | E-posta | ✅ | E-posta formatı | email |
| 2 | Telefon | ✅ | Min 10 karakter | phone |
| 2 | Adres Satırı 1 | ✅ | — | addressLine1 |
| 2 | Adres Satırı 2 | ❌ | — | addressLine2 |
| 2 | Şehir | ✅ | Dropdown | city |
| 2 | İlçe | ✅ | Dynamic dropdown | district |
| 3 | Şifre | ✅ | Min 6 karakter | password → passwordHash |
| 3 | Şifre Tekrar | ✅ | Eşleşme kontrolü | — |
| 3 | Kullanım Şartları | ✅ | Checkbox | — |

**Değerlendirme:** ✅ Yeterli. Backend entity alanlarıyla uyumlu.

**Eksiklikler:**
- Telefon formatı doğrulaması (sadece rakam, 5XX XXX XX XX formatı) yok
- E-posta benzersizlik kontrolü (submit sonrası hata yerine, anlık kontrol olmalı)
- KVKK onay metni yok

### 2.3.2 Nakliyeci Kayıt Formu (RegisterCarrier.tsx)

**Mevcut alanlar (tek sayfa):**

| Alan | Zorunlu | Validasyon | Backend Alanı |
|------|---------|-----------|---------------|
| Firma Adı | ✅ | — | companyName |
| Vergi Numarası | ✅ | 11 hane | taxNumber |
| Yetkili Adı | ✅ | — | contactName |
| Telefon | ✅ | — | phone |
| E-posta | ✅ | E-posta formatı | email |
| Araç Tipleri | ✅ | Multi-select | → CarrierVehicleType |
| Kapasite (her araç tipi için) | ✅ | Sayı (kg) | → CarrierVehicleType.capacityKg |
| Şifre | ✅ | Min 6 karakter | password → passwordHash |
| Şifre Tekrar | ✅ | Eşleşme | — |

**Değerlendirme:** ⚠️ Kısmen yeterli.

**Eksiklikler:**
- Şehir/İlçe bilgisi yok — kayıt sonrasında profil tamamlama zorunlu
- Hizmet alanları (şehiriçi/şehirlerarası) yok — kayıtta sorulmuyor
- Hizmet türleri (ev taşıma, ofis taşıma vs.) yok — kayıtta sorulmuyor
- TCKN veya ticaret sicil no yok
- Kuruluş yılı yok (entity'de `foundedYear` var)

### 2.3.3 İlan Oluşturma Formu (OfferRequestForm.tsx)

**Mevcut alanlar (3 adım):**

| Adım | Alan | Zorunlu | Backend Alanı |
|------|------|---------|---------------|
| 1 | Çıkış Şehri | ✅ | origin (kısmi — şehir+ilçe birleştiriliyor) |
| 1 | Çıkış İlçesi | ✅ | origin |
| 1 | Varış Şehri | ✅ | destination |
| 1 | Varış İlçesi | ✅ | destination |
| 1 | Taşınma Tarihi | ✅ | shipmentDate |
| 2 | Yük Tipi | ✅ | loadDetails |
| 2 | Ağırlık (kg) | ❌ | weight |
| 2 | Bina Tipi | ❌ | placeType |
| 2 | Kat | ❌ | floor |
| 2 | Asansör | ❌ | hasElevator |
| 2 | Açıklama | ❌ | — (entity'de yok!) |
| 2 | Sigorta | ❌ | insuranceType |
| 2 | Sigorta Tipi | ❌ | insuranceType |
| 2 | Zaman Tercihi | ❌ | timePreference |
| 2 | Ek Hizmetler | ❌ | extraServices (JSON) |

**Değerlendirme:** ✅ İyi kapsamda. Shipment entity ile büyük ölçüde uyumlu.

**Eksiklikler:**
- `description` formu dolduruyor ama entity'de `description` alanı yok — form verisi kaybolur
- `transportType` entity'de var ama formda yok — backend alanı kullanılmıyor
- Fotoğraf ekleme yok — yükün fotoğrafı çekilemiyor
- Adres detayı yok — sadece şehir+ilçe, mahalle/sokak detayı yok

### 2.3.4 Teklif Verme Formu (CarrierRespond.tsx)

**Mevcut alanlar:**

| Alan | Zorunlu | Backend Alanı |
|------|---------|---------------|
| Fiyat (₺) | ✅ | price |
| Tahmini Süre (saat) | ❌ | — (entity'de yok!) |
| Ek Not | ❌ | message |

**Değerlendirme:** ⚠️ Mock data kullanıyor, gerçek API'ye bağlanmamış.

**Eksiklikler:**
- `estimatedDuration` backend entity'de yok — form alanı backend'e yazılmıyor
- Minimum/maximum fiyat validasyonu yok
- Teklif geçerlilik süresi (`validUntil`) entity'de yok

### 2.3.5 Profil Düzenleme (Profile.tsx — 9 Bölüm)

**Bölüm bazlı analiz:**

| Bölüm | Backend API | Durum |
|-------|-------------|-------|
| Hesap (müşteri) | PUT /customers/profile | ✅ Gerçek API |
| Hesap (nakliyeci) | PUT /carriers/me ??? (belirsiz) | ⚠️ Karışık |
| Adresler | CRUD /customers/me/addresses | ⚠️ Backend entity yok! CustomerAddress tablosu yok |
| Ödemeler (kart) | — | ❌ Backend yok, localStorage |
| Güvenlik | PUT /security/password, 2FA | ✅ Gerçek API (kısmen) |
| Bildirimler | — | ❌ Müşteri için backend yok, nakliyeci kısmen var |
| Şirket (nakliyeci) | PUT /carriers/me/company-info | ✅ Gerçek API |
| Operasyon (nakliyeci) | PUT /carriers/{id}/activity | ✅ Gerçek API |
| Belgeler (nakliyeci) | PUT /carriers/{id}/documents | ✅ Gerçek API |
| Ödeme Bilgileri (nakliyeci) | PUT /carriers/me/earnings | ✅ Gerçek API |

**Kritik sorunlar:**
1. Müşteri adres CRUD'u için backend entity/tablo yok — frontend mock
2. Kredi kartı yönetimi için backend yok — frontend mock
3. Müşteri bildirim tercihleri için backend yok
4. Profil fotoğrafı yükleme müşteri için çalışmıyor (sadece nakliyeci endpoint'i var)

---

## 2.4 Tablo/Liste Analizi

### 2.4.1 ShipmentList (Müşteri + Nakliyeci)

**Mevcut kolonlar:** Güzergah, durum, açıklama, yük tipi, ağırlık, mesafe, fiyat, tarih.

**Sorunlar:**
- `loadType` her ilan için `'ev-esyasi'` hardcoded
- `distance` her ilan için `0` hardcoded
- Nakliyeciler için "Teklif Ver" butonu her zaman disabled
- Filtreleme client-side (küçük veri setleri için OK, ama ölçeklenemez)

### 2.4.2 CarrierList (Nakliyeci Arama)

**Mevcut:** 16+ filtre, kart tabanlı grid, gerçek API (`GET /carriers/search`)

**Değerlendirme:** ✅ En olgun sayfa. Filtreler çalışıyor, sayfalandırma var, skeleton loading var.

**Eksiklikler:**
- Harita görünümü yok (lat/lng verisi var ama kullanılmıyor)
- Karşılaştırma özelliği yok (birden fazla nakliyeciyi yanyana)
- Favorilere ekleme yok

### 2.4.3 OfferComparison (Teklif Karşılaştırma)

**Mevcut:** Kart tabanlı, fiyata göre sıralı, en ucuz işaretli, kabul butonu.

**Değerlendirme:** ⚠️ Gerçek API kullanıyor ama detay eksik.

**Eksiklikler:**
- Nakliyeci araç bilgisi `"-"` hardcoded
- Nakliyeci hizmet alanları `"-"` hardcoded
- Nakliyeci puanı gösterilmiyor (API'den gelmiyor)
- Karşı teklif/pazarlık mekanizması yok

---

## 2.5 Rol Bazlı Erişim Analizi

### 2.5.1 Koruma Durumu

| Rota | Guard | Sorun |
|------|-------|-------|
| `/teklif-talebi` | ProtectedRoute(customer) | ✅ Doğru |
| `/nakliyeci/teklifler` | ProtectedRoute(carrier) | ✅ Doğru |
| `/nakliyeci/yanit/:id` | ProtectedRoute(carrier) | ⚠️ Guard var ama içerideki rol kontrolü zayıf |
| `/nakliyeci/kazanc` | ProtectedRoute(carrier) | ✅ Doğru |
| `/takvim` | ProtectedRoute(carrier) | ✅ Doğru |
| `/ilanlar` | Yok | ⚠️ Her iki rol de görebilmeli ama rol bazlı özelleştirme yok |
| `/tekliflerim` | Yok | ❌ Guard yok — herkes erişebilir |
| `/odeme/:id` | Yok | ❌ Guard yok — sadece müşteri erişmeli |
| `/odemeler` | Yok | ❌ Guard yok — sadece müşteri erişmeli |
| `/bildirimler` | Yok | ❌ Guard yok |
| `/mesajlar` | Yok | ⚠️ İçeride kontrol var ama route guard yok |
| `/profilim` | Yok | ⚠️ İçeride kontrol var ama route guard yok |
| `/ilan/:id` | Yok | ⚠️ Herkes görebilir ama eylemler rol bazlı olmalı |
| `/gecmis` | Yok | ❌ Guard yok |

### 2.5.2 Eksik Korumalar

**Kritik:** 8 rota guard/koruma eksik. Özellikle:
- `/odeme/:id` - Herhangi biri ödeme sayfasına erişebilir
- `/odemeler` - Herhangi biri ödeme geçmişini görebilir  
- `/tekliflerim` - Herhangi biri tekliflere erişebilir
- `/gecmis` - Herhangi biri geçmişi görebilir

---

## 2.6 Kullanıcı Akışı Analizi

### 2.6.1 Müşteri Ana Akışı

```
Kayıt → Giriş → İlan Ver → Teklifleri Bekle → Teklifleri Karşılaştır → 
Teklif Kabul → Ödeme → Teslimat Takip → Tamamlandı → Yorum Yap
```

**Kırılan noktalar:**
1. ✅ Kayıt → Çalışıyor (gerçek API)
2. ✅ Giriş → Çalışıyor
3. ✅ İlan Ver → Çalışıyor (OfferRequestForm, gerçek API)
4. ⚠️ Teklifleri Bekle → Bildirim sistemi mock
5. ✅ Teklifleri Karşılaştır → OfferComparison gerçek API kullanıyor
6. ✅ Teklif Kabul → Gerçek API (PUT /offers/:id/accept)
7. ❌ Ödeme → Tamamen mock (Payment.tsx localStorage)
8. ❌ Teslimat Takip → ShipmentDetail tamamen mock
9. ❌ Tamamlandı → Durum güncelleme mock
10. ⚠️ Yorum Yap → CarrierProfile'dan mockDb ile yapılıyor

### 2.6.2 Nakliyeci Ana Akışı

```
Kayıt → Profil Tamamla → Belge Yükle → Admin Onayı Bekle → 
Müsait İlanları Gör → Teklif Ver → Müşteri Kabul Etsin → 
Taşıma Yap → İş Tamamla → Kazanç Gör
```

**Kırılan noktalar:**
1. ✅ Kayıt → Çalışıyor
2. ✅ Profil Tamamla → Profile.tsx, gerçek API (kısmen)
3. ✅ Belge Yükle → Gerçek API
4. ✅ Admin Onayı → Admin panelden çalışıyor
5. ✅ İlanları Gör → ShipmentList, gerçek API (GET /shipments/pending)
6. ❌ Teklif Ver → CarrierRespond mockDb kullanıyor, gerçek API'ye bağlanmamış
7. — Müşteri Kabul → Müşteri tarafı (bkz. yukarı)
8. ❌ Taşıma Yap → Durum güncelleme yok (PUT /shipments/:id/start var ama frontend bağlı değil)
9. ❌ İş Tamamla → Durum güncelleme yok (PUT /shipments/:id/complete var ama frontend bağlı değil)
10. ❌ Kazanç → Earnings.tsx tamamen mock

---

# ═══════════════════════════════════════════════════════════════
# FAZ 3 — MVP ANALİZİ VE ÖNCELİKLENDİRME
# ═══════════════════════════════════════════════════════════════

## 3.1 Önceliklendirme Kriterleri

- **MUST (Olmazsa Olmaz):** Bu olmadan platform kullanılamaz
- **SHOULD (Olmalı):** Kullanıcı deneyimini ciddi şekilde etkiler
- **NICE (İyi Olur):** Profesyonellik katar ama işlevselliği engellemez
- **POST-MVP (Sonra):** İlk sürümde gerekli değil

---

## 3.2 MUST — Olmazsa Olmaz (Temel Akış Çalışmalı)

### M1. Mock Data → Gerçek API Geçişi [KRİTİK]

| ID | Görev | Etki | Tahmini Karmaşıklık |
|----|-------|------|----------------------|
| M1.1 | ~~CarrierRespond → `POST /api/v1/offers/` bağla~~ | ~~Nakliyeci teklif verebilsin~~ | ✅ TAMAMLANDI |
| M1.2 | ~~MyOffers → `GET /customers/offers` + `PUT /offers/:id/accept\|reject` bağla~~ | ~~Müşteri teklif yönetebilsin~~ | ✅ TAMAMLANDI |
| M1.3 | ~~CarrierOffers → `GET /carriers/me/offers` bağla~~ | ~~Nakliyeci tekliflerini görsün~~ | ✅ TAMAMLANDI |
| M1.4 | ~~ShipmentDetail → `GET /shipments/:id` bağla~~ | ~~İlan detayı gerçek olsun~~ | ✅ TAMAMLANDI |
| M1.5 | ~~History → `GET /customers/shipments` bağla~~ | ~~Gerçek geçmiş~~ | ✅ TAMAMLANDI |
| M1.6 | ~~Dashboard → reviews mockDb kaldır, gerçek review API bağla~~ | ~~Tutarlı veri~~ | ✅ TAMAMLANDI |
| M1.7 | ~~ShipmentList → hardcoded loadType/distance düzelt~~ | ~~Doğru veri gösterimi~~ | ✅ TAMAMLANDI |
| M1.8 | ~~ShipmentList → nakliyeci "Teklif Ver" butonunu aktif et~~ | ~~Nakliyeci bid yapabilsin~~ | ✅ TAMAMLANDI |

### M2. Alan Adı Uyumsuzlukları Düzeltme [KRİTİK]

| ID | Görev | Detay |
|----|-------|-------|
| M2.1 | ~~Customer firstName/lastName mapping~~ | ✅ TAMAMLANDI |
| M2.2 | ~~Shipment origin/destination mapping~~ | ✅ TAMAMLANDI |
| M2.3 | ~~AuditLog targetType/targetId mapping~~ | ✅ TAMAMLANDI |
| M2.4 | ~~Offer estimatedDuration~~ | ✅ TAMAMLANDI — Entity'ye eklendi |

### M3. Nakliyeci Teklif Verme Akışı (Uçtan Uca) ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| M3.1 | ~~ShipmentList'te nakliyeci için "Teklif Ver" butonunu aktifleştir~~ ✅ |
| M3.2 | ~~Butona tıklayınca `/nakliyeci/yanit/:shipmentId` sayfasına yönlendir~~ ✅ |
| M3.3 | ~~CarrierRespond'u gerçek API'ye bağla (`POST /api/v1/offers/`)~~ ✅ |
| M3.4 | ~~Teklif sonrası ilan durumunu `offer_received` olarak güncelle~~ ✅ (backend otomatik) |
| M3.5 | Müşteriye bildirim gönder (en azından in-app) — Sprint 4'e ertelendi |

### M4. Müşteri Teklif Kabul/Red Akışı (Uçtan Uca) ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| M4.1 | ~~OfferComparison'da teklif kabul edildiğinde shipment status → `matched`~~ ✅ (backend otomatik) |
| M4.2 | ~~Kabul edildikten sonra diğer teklifleri otomatik reddet~~ ✅ (backend otomatik) |
| M4.3 | Nakliyeciye bildirim gönder — Sprint 4'e ertelendi |

### M5. Shipment Durum Akışı ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| M5.1 | ~~Nakliyeci: "Taşımayı Başlat" butonu → `PUT /shipments/:id/start`~~ ✅ TAMAMLANDI |
| M5.2 | ~~Nakliyeci: "Teslim Edildi" butonu → `PUT /shipments/:id/complete`~~ ✅ TAMAMLANDI |
| M5.3 | ~~ShipmentDetail'da gerçek timeline (API'den status)~~ ✅ TAMAMLANDI |
| M5.4 | ~~Durum değiştiğinde iki tarafa da bildirim~~ ✅ TAMAMLANDI |

### M6. Temel Koruma Eksiklikleri

| ID | Görev |
|----|-------|
| M6.1 | ~~`/tekliflerim` → ProtectedRoute(customer) ekle~~ | ✅ TAMAMLANDI |
| M6.2 | ~~`/odeme/:shipmentId` → ProtectedRoute(customer) ekle~~ | ✅ TAMAMLANDI |
| M6.3 | ~~`/odemeler` → ProtectedRoute(customer) ekle~~ | ✅ TAMAMLANDI |
| M6.4 | ~~`/gecmis` → ProtectedRoute(customer) ekle~~ | ✅ TAMAMLANDI |
| M6.5 | ~~`/bildirimler` → ProtectedRoute ekle (her iki rol)~~ | ✅ TAMAMLANDI |
| M6.6 | ~~`/profilim` → ProtectedRoute ekle (her iki rol)~~ | ✅ TAMAMLANDI |

---

## 3.3 SHOULD — Olmalı (Kullanıcı Deneyimi)

### S1. Bildirim Sistemi ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| S1.1 | ~~Backend: Notification entity + service + controller + routes~~ ✅ |
| S1.2 | ~~Backend: Teklif geldiğinde, durum değiştiğinde otomatik bildirim oluştur~~ ✅ |
| S1.3 | ~~Frontend: Notifications.tsx → gerçek API bağla~~ ✅ |
| S1.4 | ~~Frontend: NotificationBell → gerçek bildirim sayısı getir~~ ✅ |
| S1.5 | ~~Polling ile periyodik güncelleme (her 30 saniye)~~ ✅ |

### S2. Admin Panel Düzeltmeleri

| ID | Görev |
|----|-------|
| S2.1 | AdminDashboard trend grafiğini gerçek veriye bağla (backend time-series endpoint gerekli) |
| S2.2 | AdminCarrierDetail → İşler sekmesine o nakliyecinin shipment'larını getir |
| S2.3 | AdminCarrierDetail → Yorumlar sekmesine o nakliyecinin review'larını getir |
| S2.4 | AdminShipments → search backend desteği ekle |
| S2.5 | AdminReviews → rating filtresi backend desteği ekle |
| S2.6 | Admin Teklifler sayfası oluştur |
| S2.7 | Admin Belgeler sayfası oluştur (belge doğrulama iş akışı) |

### S3. Ödeme Sistemi (Basit MVP) ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| S3.1 | ~~Payment entity oluştur (shipmentId, customerId, amount, method, status)~~ ✅ |
| S3.2 | ~~Payment Service + Controller + Routes~~ ✅ |
| S3.3 | ~~Payment.tsx → gerçek API'ye bağla (henüz 3rd party entegrasyon olmadan, kayıt tut)~~ ✅ |
| S3.4 | ~~Payments.tsx → gerçek ödeme geçmişi~~ ✅ |

### S4. Kazanç Sistemi ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| S4.1 | ~~CarrierEarningsLog endpoint'leri oluştur (GET /carriers/me/earnings-log)~~ ✅ |
| S4.2 | ~~İş tamamlandığında otomatik kazanç kaydı oluştur~~ ✅ |
| S4.3 | ~~Earnings.tsx → gerçek API bağla~~ ✅ |

### S5. Yorum Sistemi Düzeltmesi ✅ TAMAMLANDI

| ID | Görev |
|----|-------|
| S5.1 | ~~CarrierProfile → review yazmayı gerçek API'ye bağla (`POST /api/v1/reviews`)~~ ✅ |
| S5.2 | ~~CarrierDetailPage → reviews gerçek API'den gelsin~~ ✅ |
| S5.3 | ~~Dashboard (carrier) → reviews gerçek API'den gelsin~~ ✅ |

---

## 3.4 NICE — İyi Olur (Profesyonellik)

### N1. Admin Raporlar Sayfası

| ID | Görev |
|----|-------|
| N1.1 | Backend: Aggregation endpoint'leri (gelir, trend, top nakliyeciler) |
| N1.2 | Frontend: AdminReports sayfası (grafikler, tablolar) |

### N2. Admin Ayarlar Sayfası

| ID | Görev |
|----|-------|
| N2.1 | Backend: Settings entity + CRUD |
| N2.2 | Frontend: AdminSettings form sayfası |

### N3. Admin Yönetimi Sayfası

| ID | Görev |
|----|-------|
| N3.1 | Backend: Admin CRUD endpoint'leri (superadmin only) |
| N3.2 | Frontend: AdminManagement sayfa + form |

### N4. UI/UX İyileştirmeleri

| ID | Görev |
|----|-------|
| N4.1 | Nakliyeci arama → harita görünümü |
| N4.2 | Nakliyeci karşılaştırma (yan yana) |
| N4.3 | Favorilere ekleme |
| N4.4 | CSV/Excel dışa aktarım (admin tablolarda) |
| N4.5 | Toplu eylemler (admin tablolarda) |
| N4.6 | Gelişmiş filtreleme (tarih aralığı, çoklu filtre) |

### N5. Carrier Calendar Gerçek Entegrasyon

| ID | Görev |
|----|-------|
| N5.1 | Backend: CarrierAvailability entity + endpoints |
| N5.2 | Frontend: Gerçek API'ye bağla |
| N5.3 | İlan eşleştirmede müsaitlik kontrolü |

---

## 3.5 POST-MVP — Sonra

| ID | Özellik | Neden Sonra |
|----|---------|-------------|
| P1 | Gerçek ödeme entegrasyonu (iyzico/stripe) | 3rd party gerekli |
| P2 | WebSocket/real-time mesajlaşma | Altyapı gerekli |
| P3 | SMS/E-posta bildirim gönderimi | 3rd party gerekli |
| P4 | Sadakat programı (Loyalty.tsx) | Tamamen statik, öncelik düşük |
| P5 | Kampanya/Kupon sistemi (Campaigns.tsx) | Tamamen statik, öncelik düşük |
| P6 | Canlı destek (Support.tsx) | 3rd party veya chat altyapısı gerekli |
| P7 | Fiyat tahmin algoritması | ML/istatistik gerekli |
| P8 | Mobil uygulama | PWA veya native |

---

## 3.6 MVP Özet Tablosu

| Kategori | Görev Sayısı | Etki |
|----------|-------------|------|
| **MUST** | 30 görev | Platform temel akışı çalışır hale gelir |
| **SHOULD** | 20 görev | Profesyonel kullanıcı deneyimi |
| **NICE** | 15 görev | Rekabetçi avantaj |
| **POST-MVP** | 8 görev | Büyüme aşaması |

---

# ═══════════════════════════════════════════════════════════════
# FAZ 4 — UYGULAMA PLANI
# ═══════════════════════════════════════════════════════════════

## 4.1 Uygulama Sırası

Aşağıdaki sıra, **bağımlılıkları** ve **etkiyi** göz önünde bulundurarak belirlenmiştir.

### Sprint 1: Temel Düzeltmeler (Alan Uyumluluğu + Mock Temizleme) ✅ TAMAMLANDI

```
Sıra  Görev                                                Bağımlılık     Durum
────  ─────────────────────────────────────────────────────  ──────────     ─────
1.1   M2.1 — Customer firstName/lastName mapping düzelt     Yok            ✅
1.2   M2.2 — Shipment origin/destination mapping düzelt     Yok            ✅
1.3   M2.3 — AuditLog targetType/targetId mapping düzelt    Yok            ✅
1.4   M1.7 — ShipmentList hardcoded loadType/distance düzelt Yok            ✅
1.5   M6.1-M6.6 — Route guard'ları ekle                    Yok            ✅
1.6   M1.5 — History → gerçek API bağla                    1.2            ✅
1.7   M1.4 — ShipmentDetail → gerçek API bağla             1.2            ✅
1.8   M1.6 — Dashboard reviews → gerçek API bağla          Yok            ✅
```

### Sprint 2: Nakliyeci Teklif Akışı ✅ TAMAMLANDI

```
Sıra  Görev                                                Bağımlılık     Durum
────  ─────────────────────────────────────────────────────  ──────────     ─────
2.1   M2.4 — Offer estimatedDuration entity'e ekle (migration) Yok            ✅
2.2   M1.1 — CarrierRespond → POST /offers/ bağla          2.1            ✅
2.3   M1.8 — ShipmentList "Teklif Ver" butonu aktifleştir   2.2            ✅
2.4   M3.1-M3.5 — Uçtan uca teklif akışı                   2.2, 2.3       ✅
2.5   M1.2 — MyOffers → gerçek API bağla                   Yok            ✅
2.6   M1.3 — CarrierOffers → gerçek API bağla              Yok            ✅
2.7   M4.1-M4.3 — Teklif kabul/red akışı                   2.5            ✅
```

### Sprint 3: Shipment Yaşam Döngüsü ✅ TAMAMLANDI

```
Sıra  Görev                                                Bağımlılık     Durum
────  ─────────────────────────────────────────────────────  ──────────     ─────
3.1   M5.1 — Nakliyeci "Taşımayı Başlat" butonu            Sprint 2       ✅
3.2   M5.2 — Nakliyeci "Teslim Edildi" butonu               3.1            ✅
3.3   M5.3 — ShipmentDetail gerçek timeline                 3.1, 3.2       ✅
3.4   S5.1-S5.3 — Yorum sistemi gerçek API                 Sprint 2       ✅
```

### Sprint 4: Bildirim + Ödeme + Kazanç ✅ TAMAMLANDI

```
Sıra  Görev                                                Bağımlılık     Durum
────  ─────────────────────────────────────────────────────  ──────────     ─────
4.1   S1.1 — Notification backend (entity/service/controller) Yok          ✅
4.2   S1.2 — Otomatik bildirim tetikleyicileri              4.1            ✅
4.3   S1.3-S1.5 — Frontend bildirim entegrasyonu            4.1            ✅
4.4   S3.1-S3.4 — Ödeme sistemi (basit kayıt)              Sprint 3       ✅
4.5   S4.1-S4.3 — Kazanç sistemi                           Sprint 3       ✅
```

### Sprint 5: Admin Panel Güçlendirme

```
Sıra  Görev                                                Bağımlılık
────  ─────────────────────────────────────────────────────  ──────────
5.1   S2.1 — Dashboard trend verisi backend endpoint        Yok
5.2   S2.2-S2.3 — CarrierDetail İşler+Yorumlar sekmeleri   Yok
5.3   S2.4-S2.5 — Shipments search + Reviews rating filter Yok
5.4   S2.6 — Admin Teklifler sayfası                       Yok
5.5   S2.7 — Admin Belgeler sayfası                        Yok
5.6   N1.1-N1.2 — Admin Raporlar sayfası                   5.1
5.7   N2.1-N2.2 — Admin Ayarlar sayfası                    Yok
5.8   N3.1-N3.2 — Admin Yönetimi sayfası                   Yok
```

---

## 4.2 Her Sprint İçin Backend Değişiklikleri

### Sprint 1 Backend
- Yok (sadece frontend mapping düzeltmeleri)
- Opsiyonel: AdminService.getShipments() → search parametresi ekle

### Sprint 2 Backend ✅ TAMAMLANDI
- ~~Offer entity'ye `estimatedDuration` (int, nullable) ve `validUntil` (datetime, nullable) ekle~~ → estimatedDuration eklendi
- ~~Migration oluştur~~ → TypeORM synchronize ile otomatik

### Sprint 3 Backend ✅ TAMAMLANDI
- ~~ShipmentService.start() ve .complete() metodları zaten var~~ ✅
- ~~İş tamamlandığında → CarrierEarningsLog kaydı oluştur~~ ✅
- ~~İş tamamlandığında → Carrier.completedShipments++ güncelle~~ ✅

### Sprint 4 Backend ✅ TAMAMLANDI
- ~~**YENİ Entity:** Notification (id, userId, userType, type, title, message, isRead, relatedId, actionUrl, createdAt)~~ ✅
- ~~**YENİ Service:** NotificationService (create, getByUser, markRead, markAllRead, getUnreadCount)~~ ✅
- ~~**YENİ Controller + Routes:** 5 endpoint~~ ✅
- ~~**YENİ Entity:** Payment (id, shipmentId, customerId, amount, method, status, createdAt)~~ ✅
- ~~**YENİ Service:** PaymentService (create, getByCustomer, getByShipment)~~ ✅
- ~~**YENİ Endpoint:** GET /carriers/me/earnings-log~~ ✅

### Sprint 5 Backend
- **YENİ Endpoint:** GET /admin/stats/trends?period=30d (zaman serisi)
- **YENİ Endpoint:** GET /admin/carriers/:id/shipments (o nakliyecinin ilanları)
- **YENİ Endpoint:** GET /admin/carriers/:id/reviews (o nakliyecinin yorumları)
- **YENİ Endpoint:** GET /admin/offers (teklifler listesi)
- **YENİ Endpoint:** GET /admin/documents (belgeler listesi)
- **YENİ Endpoint:** PUT /admin/documents/:id/verify (belge doğrulama)
- **YENİ Endpoint:** GET /admin/reports/* (raporlama endpoint'leri)
- **YENİ Entity:** PlatformSettings (key-value)
- **YENİ Endpoint:** Admin CRUD (superadmin)

---

## 4.3 Dosya Etki Haritası

### En Çok Değişecek Dosyalar

| Dosya | Değişiklik Türü | Sprint |
|-------|----------------|--------|
| shadcn-ui/src/pages/ShipmentDetail.tsx | Komple yeniden yazım | 1, 3 |
| shadcn-ui/src/pages/CarrierRespond.tsx | Mock → API bağlantısı | 2 |
| shadcn-ui/src/pages/MyOffers.tsx | Mock → API bağlantısı | 2 |
| shadcn-ui/src/pages/CarrierOffers.tsx | Mock → API bağlantısı | 2 |
| shadcn-ui/src/pages/ShipmentList.tsx | Mapping düzeltme + buton | 1, 2 |
| shadcn-ui/src/pages/Dashboard.tsx | Mock review kaldır + mapping | 1 |
| shadcn-ui/src/pages/History.tsx | Mock → API bağlantısı | 1 |
| shadcn-ui/src/pages/Notifications.tsx | Mock → API (yeni backend) | 4 |
| shadcn-ui/src/pages/Payment.tsx | Mock → API (yeni backend) | 4 |
| shadcn-ui/src/pages/Payments.tsx | Mock → API (yeni backend) | 4 |
| shadcn-ui/src/pages/Earnings.tsx | Mock → API (yeni backend) | 4 |
| shadcn-ui/src/pages/admin/AdminDashboard.tsx | Sahte trend → gerçek | 5 |
| shadcn-ui/src/pages/admin/AdminCarrierDetail.tsx | Boş sekmeler doldur | 5 |
| shadcn-ui/src/App.tsx | Route guard eklemeleri | 1 |
| src/domain/entities/Offer.ts | estimatedDuration, validUntil | 2 |
| src/application/services/AdminService.ts | Yeni metodlar | 5 |

### Yeni Oluşturulacak Dosyalar

| Dosya | Amaç | Sprint |
|-------|------|--------|
| src/domain/entities/Notification.ts | Bildirim entity | 4 |
| src/domain/entities/Payment.ts | Ödeme entity | 4 |
| src/application/services/NotificationService.ts | Bildirim servisi | 4 |
| src/application/services/PaymentService.ts | Ödeme servisi | 4 |
| src/presentation/controllers/NotificationController.ts | Bildirim controller | 4 |
| src/presentation/controllers/PaymentController.ts | Ödeme controller | 4 |
| src/presentation/routes/notificationRoutes.ts | Bildirim routes | 4 |
| src/presentation/routes/paymentRoutes.ts | Ödeme routes | 4 |
| shadcn-ui/src/pages/admin/AdminOffers.tsx | Admin teklifler | 5 |
| shadcn-ui/src/pages/admin/AdminDocuments.tsx | Admin belgeler | 5 |
| shadcn-ui/src/pages/admin/AdminReports.tsx | Admin raporlar | 5 |
| shadcn-ui/src/pages/admin/AdminSettings.tsx | Admin ayarlar | 5 |
| shadcn-ui/src/pages/admin/AdminManagement.tsx | Admin yönetimi | 5 |

---

## 4.4 Doğrulama Kontrol Noktaları

Her sprint sonunda doğrulanacak senaryolar:

### Sprint 1 Sonrası ✅ TAMAMLANDI
- [x] AdminCustomers tablosunda isimler doğru görünüyor
- [x] AdminShipments tablosunda güzergah doğru görünüyor
- [x] AdminAuditLog tablosunda veriler doğru görünüyor
- [x] ShipmentList'te yük tipi ve mesafe doğru
- [x] Korumasız rotalar artık guard'lı
- [x] History sayfası gerçek API'den veri çekiyor
- [x] ShipmentDetail gerçek API'den veri çekiyor

### Sprint 2 Sonrası ✅ TAMAMLANDI
- [x] Nakliyeci, ilanlar listesinden "Teklif Ver" yapabiliyor
- [x] Teklif, CarrierRespond'dan gerçek API'ye gidiyor
- [x] Müşteri, MyOffers'dan teklifleri görebiliyor
- [x] Müşteri teklif kabul/red yapabiliyor
- [x] Nakliyeci, CarrierOffers'dan kendi tekliflerini görebiliyor

### Sprint 3 Sonrası ✅ TAMAMLANDI
- [x] Nakliyeci taşımayı başlatabiliyor (pending → in_transit)
- [x] Nakliyeci teslimi tamamlayabiliyor (in_transit → completed)
- [x] ShipmentDetail'da gerçek timeline çalışıyor
- [x] Müşteri tamamlanan iş için yorum yazabiliyor

### Sprint 4 Sonrası ✅ TAMAMLANDI
- [x] Bildirimler gerçek API'den geliyor
- [x] Teklif geldiğinde bildirim oluşuyor
- [x] Durum değiştiğinde bildirim oluşuyor
- [x] Ödeme kaydı oluşturabiliyor
- [x] Nakliyeci kazanç geçmişini görebiliyor

### Sprint 5 Sonrası ✓
- [ ] Admin dashboard gerçek trend verisi gösteriyor
- [ ] Admin nakliyeci detayında işler ve yorumlar dolmuş
- [ ] Admin teklifler sayfası çalışıyor
- [ ] Admin belgeler sayfası ile doğrulama yapılabiliyor
- [ ] Admin raporlar sayfasında grafikler görünüyor
- [ ] Admin ayarlar sayfası çalışıyor (superadmin)
- [ ] Admin yönetimi sayfası çalışıyor (superadmin)

---

# Sonuç

Bu rapor, TaşıBurada platformunun mevcut durumunun kapsamlı bir denetimini sunmaktadır. **30+ kritik sorun** tespit edilmiş olup, bunların büyük çoğunluğu mock data kullanımı ve frontend-backend alan uyumsuzluklarından kaynaklanmaktadır.

**En acil öncelikler:**
1. Mock data → gerçek API geçişi (8 sayfa)
2. Alan adı uyumsuzlukları düzeltme (3+ entity)
3. Route guard eksiklikleri (8 rota)
4. Nakliyeci teklif verme akışının uçtan uca çalışması

**Plan:** 5 sprint halinde, bağımlılık sırasına göre sistematik uygulama. Sprint 1-3 tamamlandığında platform temel akışı (ilan → teklif → kabul → taşıma → tamamlanma) çalışır hale gelecektir.
