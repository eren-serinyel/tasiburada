# TaşıBurada — Form & Kayıt Akışı Analiz Raporu

**Tarih:** 29 Mart 2026  
**Son Güncelleme:** Haziran 2025  
**Kapsam:** 8 frontend form/sayfa + 5 backend entity  
**Referans Platformlar:** Uber Freight, Convoy, uShip, Airbnb, Getir, Trendyol, Sahibinden, Stripe

---

> **SPRINT DURUMU (Haziran 2025):**  
> Sprint 1–4 tamamlandı. Bu rapordaki form sorunlarının büyük çoğunluğu Sprint 5 kapsamında ele alınacak.  
> Düzeltilmesi en acil olan 3 madde: **(A)** `RegisterUser.tsx` API_BASE_URL hardcoded, **(B)** `alert()` çağrılarını toast ile değiştir, **(C)** Nakliyeci operasyonel bilgilerini localStorage'dan backend'e taşı.

---

## 1. YÖNETİCİ ÖZETİ

Toplam **8 form/sayfa** incelendi: Müşteri Kayıt, Nakliyeci Kayıt, Giriş, İlan Oluşturma (OfferRequestForm), Teklif Verme (CarrierRespond), Profil Düzenleme, Admin Ayarları ve Admin Yönetimi. Genel kalite seviyesi **orta-iyi**; temel CRUD akışları çalışıyor ve backend entity'lerle büyük ölçüde uyumlu. Ancak üç kritik sorun öne çıkıyor: **(1)** Sosyal giriş (Google/Apple) ve telefon doğrulama (OTP) hiçbir formda yok — bu, Türkiye pazarında ciddi dönüşüm kaybı yaratır, **(2)** Nakliyeci kayıt formu tek adımda çok alan gösterip araç/belge/hizmet bilgilerini tamamen atlamış, bu "hızlı kayıt" yaklaşımı profil tamamlama oranını düşürüyor, **(3)** İlan oluşturma formu (Step 3) hâlâ ağırlıklı olarak mock/local mantıkla çalışıyor, gerçek backend'e taşıma ilanı gönderme akışı tamamlanmamış durumda.

---

## 2. FORM BAZLI ANALİZ

### 2.1. Müşteri Kayıt — RegisterUser.tsx

**Amaç:** Yeni müşterinin (taşıma yaptırmak isteyen kişi) platforma kayıt olması.

**Mevcut Alan Listesi:**

| Alan Adı         | Zorunlu | Tip          | Backend Karşılığı       | Durum      |
|------------------|---------|--------------|-------------------------|------------|
| Ad               | ✅      | text         | Customer.firstName      | ✅ Doğru   |
| Soyad            | ✅      | text         | Customer.lastName       | ✅ Doğru   |
| E-posta          | ✅      | email        | Customer.email          | ✅ Doğru   |
| Telefon          | ✅      | tel          | Customer.phone          | ✅ Doğru   |
| Adres Satırı 1   | ✅      | text         | Customer.addressLine1   | ✅ Doğru   |
| Adres Satırı 2   | ❌      | text         | Customer.addressLine2   | ✅ Doğru   |
| Şehir            | ✅      | select       | Customer.city           | ✅ Doğru   |
| İlçe             | ✅      | select       | Customer.district       | ✅ Doğru   |
| Şifre            | ✅      | password     | Customer.passwordHash   | ✅ Doğru   |
| Şifre Tekrar     | ✅      | password     | YOK (sadece doğrulama)  | ✅ Doğru   |
| Kullanım Koşulları | ✅    | checkbox     | YOK (sadece frontend)   | ✅ Doğru   |

**Benchmark Karşılaştırması:**
- **Airbnb / Getir / Trendyol:** Kayıtta yalnızca ad, telefon ve şifre sorar — adres sonra profilde eklenir. Sosyal giriş (Google, Apple) ön planda.
- **Sahibinden:** E-posta + telefon + şifre. Adres üyelik sonrası.
- **TaşıBurada'da fazla:** Kayıt aşamasında adres (4 alan) sorulmak zorunda; bu, drop-off oranını artırır. Rakipler adresi ilan/profil aşamasına bırakır.

**Sorunlar:**
1. **Kayıtta adres zorunluluğu:** Kayıt sırasında tam adres (addressLine1 + city + district) istemek sürtünmeyi artırır. Kullanıcı henüz güven inşa etmeden çok veri veriyor. Bu, Step 2'de drop-off'a yol açar.
2. **Sosyal giriş yok:** Google/Apple login desteği bulunmuyor. Türkiye'de Google ile giriş %40+ kullanıcıda tercih ediliyor.
3. **Telefon doğrulama (OTP) yok:** Telefon numarası alınıyor ancak doğrulanmıyor. Sahte kayıtlara açık.
4. **API URL hardcoded:** `const API_BASE_URL = 'http://localhost:3001/api/v1'` — production'da sorun yaratır. Diğer dosyalar proxy('/api/v1') kullanırken bu dosya localhost kullanıyor.
5. **alert() ile hata gösterimi:** `alert()` kullanımı UX açısından düşük kalite. Toast/snackbar tercih edilmeli.
6. **Şifre kuralları tutarsız:** Kayıtta "en az 6 karakter + harf + rakam" kuralı var, nakliyeci kayıtta "en az 8 karakter + büyük harf + rakam." Standart olmalı.

**Öneriler:**
- Adres alanlarını kayıttan kaldır, profil/ilk ilan adımına taşı (progressive disclosure).
- Google Sign-In ekle (en az OAuth 2.0).
- Telefon doğrulama (SMS OTP) ekle.
- API_BASE_URL'yi `/api/v1` (proxy) olarak güncelle.
- alert() yerine toast bildirimi kullan.

---

### 2.2. Nakliyeci Kayıt — RegisterCarrier.tsx

**Amaç:** Nakliyeci firmanın platforma "hızlı kayıt" yapması, detayları sonra profilde tamamlaması.

**Mevcut Alan Listesi:**

| Alan Adı                     | Zorunlu | Tip         | Backend Karşılığı          | Durum        |
|------------------------------|---------|-------------|----------------------------|--------------|
| Şirket Adı                  | ✅      | text        | Carrier.companyName        | ✅ Doğru     |
| Vergi No / Ticaret Sicil No | ✅      | text/numeric| Carrier.taxNumber          | ✅ Doğru     |
| Yetkili Ad Soyad             | ❌      | text        | Carrier.contactName        | ✅ Doğru     |
| Telefon                     | ✅      | tel         | Carrier.phone              | ✅ Doğru     |
| E-posta                     | ✅      | email       | Carrier.email              | ✅ Doğru     |
| Faaliyet İli                | ❌      | select      | YOK (localStorage draft)   | ⚠️ Sorunlu  |
| Kuruluş Yılı                | ❌      | select      | Carrier.foundedYear        | ✅ Doğru     |
| Şifre                       | ✅      | password    | Carrier.passwordHash       | ✅ Doğru     |
| Şifre Tekrar                | ✅      | password    | YOK (sadece doğrulama)     | ✅ Doğru     |

**Formda state olarak var ama form UI'da gösterilmeyen alanlar:**
vehicleTypes, vehicleCapacities, licensePlate, serviceAreas, specialServices, kBelgesiFiles, insuranceFiles, driverFiles, baseFee, iban, addressLine1/2, district, username — tümü formdata state'inde tanımlı ancak "hızlı kayıt" UI'da render edilmiyor. Bu ölü kod.

**Benchmark Karşılaştırması:**
- **Uber Freight:** Kayıtta firma adı, MC# (otorite numarası), telefon, e-posta. Araç/belge bilgisi ayrı bir onboarding wizard'ında.
- **uShip:** E-posta + şifre ile kayıt, sonra firma doğrulama adımları.
- **TaşıBurada'da eksik:** K Belgesi, sigorta belgesi yükleme alanları state'te tanımlı ama UI'da yok. Hızlı kayıt sonrası profil tamamlama akışına yönlendirme tek odak. Bu yaklaşım mantıklı ama onboarding wizard'ı zayıf.

**Sorunlar:**
1. **"Faaliyet İli" backend'e gönderilmiyor:** Field sadece localStorage'a draft olarak yazılıyor, API body'ye dahil değil. Backend'de Carrier entity'sinde karşılığı yok.
2. **Vergi numarası validasyonu yetersiz:** 10-15 hane olarak kabul ediliyor; Türkiye'de vergi numarası 10 hane, ticaret sicil numarası farklı formatta. Ayrım yok.
3. **Araç bilgisi hiç alınmıyor:** Nakliyeci kayıt olup hiçbir araç bilgisi vermeden sisteme giriyor. Carrier entity'de Vehicle ilişkisi var ama kayıtta sorulmuyor.
4. **Belge yükleme ertelenmiş:** K Belgesi, sigorta gibi zorunlu belgeler kayıtta alınmıyor. Bu, doğrulanmamış nakliyecilerin sisteme girmesine ve müşterilerle etkileşime geçmesine izin veriyor.
5. **Kullanım koşulları onayı yok:** Kayıt formunda KVKK/kullanım koşulları checkbox'ı bulunmuyor (müşteri kayıtta var).
6. **Şifre göster/gizle butonu yok.**
7. **Ölü state:** ~15 alan formData state'inde tanımlı ama formda render edilmiyor. Gereksiz karmaşıklık.

**Öneriler:**
- Hızlı kayıt sonrası zorunlu bir onboarding wizard (3-4 adım: Firma → Araç → Belge → Hizmet Alanları) ekle.
- Vergi numarası ve ticaret sicil numarasını ayrı alanlara böl veya açık etiketle.
- KVKK/kullanım koşulları checkbox'ı ekle.
- Kullanılmayan state alanlarını temizle.

---

### 2.3. Giriş — Login.tsx

**Amaç:** Mevcut müşteri veya nakliyecinin sisteme giriş yapması.

**Mevcut Alan Listesi:**

| Alan Adı         | Zorunlu | Tip       | Backend Karşılığı               | Durum      |
|------------------|---------|-----------|----------------------------------|------------|
| E-posta          | ✅      | email     | Customer.email / Carrier.email  | ✅ Doğru   |
| Şifre            | ✅      | password  | passwordHash (hash karşılaştırma)| ✅ Doğru   |
| Kullanıcı Tipi   | ✅      | tab       | Endpoint seçimi                  | ✅ Doğru   |
| E-postayı Hatırla | ❌     | checkbox  | YOK (localStorage local)        | ✅ Doğru   |

**Benchmark Karşılaştırması:**
- **Airbnb / Getir / Trendyol:** Tek giriş noktası; sistem kullanıcı tipini otomatik algılar. Tab seçimi yok.
- **Uber Freight:** Tek giriş, roller backend'de ayrılır.
- **TaşıBurada'da sorunlu:** Kullanıcının müşteri/nakliyeci seçmesi gerekiyor (tab). Eğer yanlış tab'da giriş denerseniz hata alırsınız — bu kötü UX.

**Sorunlar:**
1. **Kullanıcı tipi seçimi UX yükü:** Kullanıcı, müşteri mi nakliyeci mi olduğunu seçmek zorunda. Bu, giriş başarısızlığına yol açıyor (yanlış tab). Backend, e-postaya göre otomatik algılayabilir.
2. **Demo hesapları production'da görünür:** Şifre açık olarak gösteriliyor. Production'da güvenlik riski.
3. **"Şifrenizi Unuttunuz?" linki yok:** Çok temel bir özellik eksik.
4. **Sosyal giriş yok:** Google/Apple butonları mevcut değil.
5. **2FA desteği yok:** Güvenlik ayarlarında 2FA referansı var ama giriş akışında implementasyonu yok.
6. **Rate limiting görünmüyor:** Brute-force saldırılara karşı koruma (captcha/lockout gibi) mevcut değil.

**Öneriler:**
- Kullanıcı tipi tab'ını kaldır, backend'in e-postaya göre otomatik algılamasını sağla.
- "Şifremi Unuttum" akışı ekle.
- Demo hesapları kısmını sadece geliştirme ortamında göster (environment flag).
- Google OAuth ekle.

---

### 2.4. İlan Oluşturma (Taşıma Talebi) — OfferRequestForm.tsx

**Amaç:** Müşterinin taşıma ilanı oluşturup nakliyecilere açması.

**Mevcut Alan Listesi:**

| Alan Adı              | Zorunlu | Tip         | Backend Karşılığı          | Durum        |
|-----------------------|---------|-------------|----------------------------|--------------|
| Çıkış Şehir          | ✅      | select      | Shipment.origin (kısmen)   | ⚠️ Sorunlu  |
| Çıkış İlçe           | ✅      | select      | Shipment.origin (birleşik) | ⚠️ Sorunlu  |
| Varış Şehir          | ✅      | select      | Shipment.destination       | ⚠️ Sorunlu  |
| Varış İlçe           | ✅      | select      | Shipment.destination       | ⚠️ Sorunlu  |
| Tarih                 | ✅      | date        | Shipment.shipmentDate      | ✅ Doğru     |
| Kapsam (otomatik)     | ✅      | auto        | YOK (türetilen)            | ✅ Doğru     |
| Taşıma Tipi           | ✅      | card select | Shipment.transportType     | ✅ Doğru     |
| Yer Tipi              | ❌      | select      | Shipment.placeType         | ✅ Doğru     |
| Yük Türü              | ❌      | select      | Shipment.loadDetails       | ⚠️ Sorunlu  |
| Araç Tercihi          | ❌      | select      | YOK (backend'de yok)       | ⚠️ Sorunlu  |
| Kat                   | ❌      | number      | Shipment.floor             | ✅ Doğru     |
| Asansör Var mı        | ❌      | checkbox    | Shipment.hasElevator       | ✅ Doğru     |
| Sigorta Türü          | ❌      | select      | Shipment.insuranceType     | ✅ Doğru     |
| Zaman Tercihi         | ❌      | select      | Shipment.timePreference    | ✅ Doğru     |
| Ek Hizmetler          | ❌      | checkbox    | Shipment.extraServices     | ✅ Doğru     |
| Fotoğraf              | ❌      | file        | YOK (backend'de yok)       | ⚠️ Sorunlu  |
| Açıklama              | ❌      | textarea    | Shipment.loadDetails(?)    | ⚠️ Sorunlu  |
| Ağırlık               | ❌      | number      | Shipment.weight            | ✅ Doğru     |

**Benchmark Karşılaştırması:**
- **Uber Freight:** Çıkış + varış (harita/otomatik tamamlama), tarih, yük tipi (FTL/LTL), ağırlık. 2 adım.
- **uShip:** Çıkış/varış, yük tanımı (fotoğraflı), boyut/ağırlık, zamanlama. Anlık fiyat tahmini var.
- **TaşıBurada'da eksik:** Harita tabanlı adres seçimi yok, anlık fiyat tahmini yok, boyut/hacim alanı yok.
- **TaşıBurada'da fazla:** Mock data üzerinden nakliyeci eşleştirme (Step 3) — gerçek API değil.

**Sorunlar:**
1. **Origin/destination format uyumsuzluğu:** Frontend "şehir + ilçe" ayrı tutuyor ama backend'de `origin` ve `destination` tek string. Birleştirme/ayrıştırma mantığı belirsiz.
2. **Step 3 mock data ile çalışıyor:** `mockDb`, `carriers` state'i, `requestOffer()` fonksiyonu — gerçek backend API çağrısı (POST /shipments) yapılmıyor. Bu, en kritik eksiklik.
3. **Fotoğraf yükleme backend karşılığı yok:** Shipment entity'de fotoğraf alanı (`images`, `photoUrls` vb.) bulunmuyor. Fotoğraflar yüklenecek ama kaybolacak.
4. **loadDetails alanı ambiguous:** Backend'de tek bir `loadDetails: string` var. Frontend'de "yük türü" select ve "açıklama" textarea ayrı. Hangisi loadDetails'e eşleniyor?
5. **vehicleType backend'de doğrudan karşılığı yok:** Shipment entity'de araç tercihi alanı yok.

**Öneriler:**
- Gerçek backend POST /shipments API entegrasyonunu tamamla.
- origin/destination formatını standardize et (JSON: `{city, district}` veya `"İstanbul, Kadıköy"` string birleştirme).
- Shipment entity'ye `photoUrls: json` alanı ekle.
- Harita tabanlı adres (Google Maps Autocomplete) ekle.
- Anlık fiyat tahmini özelliği ekle (benchmark).

---

### 2.5. Teklif Verme — CarrierRespond.tsx

**Amaç:** Nakliyecinin bir taşıma talebine fiyat ve süre teklifi göndermesi.

**Mevcut Alan Listesi:**

| Alan Adı           | Zorunlu | Tip       | Backend Karşılığı         | Durum      |
|--------------------|---------|-----------|---------------------------|------------|
| Fiyat (TL)         | ✅      | number    | Offer.price               | ✅ Doğru   |
| Tahmini Süre (saat)| ❌      | number    | Offer.estimatedDuration   | ✅ Doğru   |
| Ek Not             | ❌      | textarea  | Offer.message             | ✅ Doğru   |

**Gelen Bilgiler (Readonly — shipment özeti):**
- Rota (origin → destination)
- Tarih
- Taşıma Tipi, Yük Detayı, Ağırlık
- Ek Hizmetler, Not

**Benchmark Karşılaştırması:**
- **Uber Freight:** Fiyat + tahmini teslim süresi. Basit ve hızlı.
- **uShip:** Fiyat + "guaranteed delivery date" + kapsam tanımı + mesaj.
- **TaşıBurada:** Çok minimal — yalnızca 3 alan. Benchmark ile uyumlu basitlik.

**Sorunlar:**
1. **Fiyat validasyonu yok:** Minimum fiyat kontrolü yapılmıyor. 0 veya negatif fiyat gönderilebilir.
2. **Fiyat formatı yok:** Para birimi formatı (1.000,00 TL gibi) gösterilmiyor.
3. **Teklif kalem detayları yok:** Nakliye ücreti, sigorta, ek hizmet ücreti gibi ayrıntılı fiyatlama yapılamıyor.
4. **Tahmini varış tarihi yok:** Sadece "saat" cinsinden süre var. Müşteri tarih bazlı düşünür.
5. **API endpoint hardcoded değil ama `apiClient` kullanılıyor — tutarlı.** ✅

**Öneriler:**
- Minimum fiyat kontrolü ekle (AdminSettings'teki `min_offer_price` ile bağla).
- Teklif detayı olarak nakliye + işçilik + sigorta ayrımı ekle.
- Tahmini teslimat tarihi alanı ekle.

---

### 2.6. Profil Düzenleme — Profile.tsx

**Amaç:** Müşteri veya nakliyecinin kişisel/firma bilgilerini, güvenlik ayarlarını, bildirim tercihlerini yönetmesi.

**Mevcut Seksiyon ve Alanlar:**

**Müşteri Profili — Hesap Bilgileri:**

| Alan Adı    | Zorunlu | Tip    | Backend Karşılığı     | Durum      |
|-------------|---------|--------|-----------------------|------------|
| Ad          | ✅      | text   | Customer.firstName    | ✅ Doğru   |
| Soyad       | ✅      | text   | Customer.lastName     | ✅ Doğru   |
| E-posta     | ✅      | email  | Customer.email        | ✅ Doğru   |
| Telefon     | ✅      | tel    | Customer.phone        | ✅ Doğru   |
| Şehir       | ❌      | select | Customer.city         | ✅ Doğru   |
| İlçe        | ❌      | select | Customer.district     | ✅ Doğru   |
| Adres 1     | ❌      | text   | Customer.addressLine1 | ✅ Doğru   |
| Adres 2     | ❌      | text   | Customer.addressLine2 | ✅ Doğru   |
| Profil Foto | ❌      | file   | YOK (localStorage)    | ⚠️ Sorunlu |

**Nakliyeci Profili — Firma Bilgileri:**

| Alan Adı           | Zorunlu | Tip         | Backend Karşılığı                   | Durum        |
|--------------------|---------|-------------|-------------------------------------|--------------|
| Firma Adı          | ✅      | text        | Carrier.companyName                 | ✅ Doğru     |
| Firma E-posta      | ✅      | email       | Carrier.email                       | ✅ Doğru     |
| Vergi No           | ❌      | text        | Carrier.taxNumber                   | ✅ Doğru     |
| Kuruluş Yılı       | ❌      | text        | Carrier.foundedYear                 | ✅ Doğru     |
| Hizmet Türleri     | ❌      | multi-select| CarrierServiceType (ilişki)         | ✅ Doğru     |
| Araç Türleri       | ❌      | multi-select| CarrierVehicleType (ilişki)         | ✅ Doğru     |
| Araç Kapasiteleri  | ❌      | text/number | Araç kapasite (dynamic per type)    | ⚠️ Sorunlu  |
| Scopes             | ❌      | multi-select| CarrierScopeOfWork (ilişki)         | ✅ Doğru     |

**Nakliyeci — Operasyonel Bilgiler:**

| Alan Adı          | Tip       | Backend Karşılığı | Durum        |
|-------------------|-----------|--------------------|--------------|
| Adres 1           | text      | localStorage       | ⚠️ Sorunlu  |
| Adres 2           | text      | localStorage       | ⚠️ Sorunlu  |
| İlçe              | select    | localStorage       | ⚠️ Sorunlu  |
| Şehir             | select    | localStorage       | ⚠️ Sorunlu  |
| Hizmet Alanları   | multi     | CarrierServiceType | ⚠️ Sorunlu  |

**Ek Seksiyonlar:** Güvenlik (şifre değiştir, 2FA toggle, şüpheli giriş), Bildirim Tercihleri (detaylı grup/kanal matrisi), Belgeler (K Belgesi, SRC, Ruhsat, Vergi Levhası, Sigorta).

**Sorunlar:**
1. **Nakliyeci operasyonel bilgileri localStorage'da:** Adres, hizmet alanları gibi bilgiler backend'e kaydedilmiyor. Sadece tarayıcı yerel depolamasında tutuluyor — cihaz değiştiğinde kaybolur.
2. **Araç kapasiteleri frontend-only:** vehicleCapacities sadece localStorage draft. Backend'e persist edilmiyor.
3. **Profil fotoğrafı müşteri için backend'de yok:** Customer entity'de `pictureUrl` alanı mevcut değil. Carrier'da var.
4. **Çok büyük monolitik bileşen:** Profile.tsx 1500+ satır, 9 farklı seksiyon. Bakım zorluğu ve performans sorunları yaratabilir.
5. **Belgeler File nesnesi olarak tutuluyor:** Sayfa yenilendiğinde belgeler kaybolur. Backend upload API entegrasyonu gerekli.

**Öneriler:**
- Nakliyeci operasyonel bilgilerini backend API'ye kaydet.
- Customer entity'ye `pictureUrl` ekle.
- Profile.tsx'i küçük bileşenlere (AccountSection, SecuritySection, vb.) böl.
- Belge upload'ları backend'e entegre et.

---

### 2.7. Admin Ayarları — AdminSettings.tsx

**Amaç:** Platform yöneticisinin genel konfigürasyon değerlerini yönetmesi.

**Mevcut Alan Listesi:**

| Alan Adı                 | Tip     | Açıklama                              | Durum      |
|--------------------------|---------|---------------------------------------|------------|
| Platform Adı             | text    | Marka ismi                            | ✅ Doğru   |
| İletişim E-postası       | email   | Destek e-postası                      | ✅ Doğru   |
| Min. Teklif Fiyatı (₺)  | number  | Teklif alt limiti                     | ✅ Doğru   |
| Maks. İptal Oranı (%)   | number  | Nakliyeci ban eşiği                   | ✅ Doğru   |
| Otomatik Nakliyeci Onayı | switch  | Yeni kayıtlarda oto-onay              | ✅ Doğru   |
| Platform Komisyonu (%)   | number  | Her işlemden alınan oran              | ✅ Doğru   |
| Min. Şifre Uzunluğu      | number  | Güvenlik politikası                   | ✅ Doğru   |
| Oturum Zaman Aşımı (dk)  | number  | Session timeout                       | ✅ Doğru   |

**Sorunlar:**
1. **Validasyon zayıf:** Komisyon oranı %50'ye kadar girilebilir, negatif değer kontrolü var ama string girişe açık.
2. **Değişiklik geçmişi (audit log) yok:** Ayar değişikliklerinin kim tarafından ne zaman yapıldığı takip edilmiyor (UX'te).
3. **Roller bazlı kısıtlama frontend'de belirsiz:** Superadmin/admin ayrımı bu sayfada görünmüyor.

**Öneriler:**
- Her ayar değişikliğinin audit log'a yazılmasını sağla.
- Daha detaylı validasyon mesajları ekle.
- Ayar değişikliğinde onay dialog'u ekle.

---

### 2.8. Admin Yönetimi — AdminManagement.tsx

**Amaç:** Süper admin'in diğer admin hesaplarını (oluştur/düzenle/sil/aktif-pasif) yönetmesi.

**Mevcut Alan Listesi (Ekleme/Düzenleme Modalı):**

| Alan Adı | Zorunlu | Tip      | Backend Karşılığı | Durum      |
|----------|---------|----------|--------------------|------------|
| E-posta  | ✅      | email    | Admin.email        | ✅ Doğru   |
| Şifre    | ✅*     | password | Admin.passwordHash | ✅ Doğru   |
| Rol      | ✅      | select   | Admin.role         | ✅ Doğru   |

(*) Şifre yalnızca yeni admin eklerken zorunlu.

**Sorunlar:**
1. **Şifre sıfırlama window.prompt() ile:** `handlePasswordReset` `window.prompt()` kullanıyor — güvenlik açığı ve kötü UX. Şifre ekranda açık metin olarak gösteriliyor.
2. **Admin silme geri alınamaz:** Soft delete yerine hard delete. Yanlışlıkla silme durumunda kurtarma yok.
3. **İsim/ad soyad alanı yok:** Admin sadece e-posta ile tanımlanıyor. Kim olduğunu anlamak zor.

**Öneriler:**
- Şifre sıfırlamayı modal/dialog'a taşı, input masking uygula.
- Soft delete implementasyonu ekle.
- Admin'e ad/soyad alanı ekle.

---

## 3. KRİTİK SORUNLAR (Öncelik Sırası)

> **Sprint 5 Öncesi Durum:** Aşağıdaki sorunların hiçbiri henüz giderilmedi. #1 (OfferRequestForm), #4 ("Şifremi Unuttum") ve #6 (API_BASE_URL) en yüksek öncelikli düzeltmelerdir.

| # | Sorun | Etkilenen Form | Kullanıcıya Etkisi | Çözüm Zorluğu | Durum |
|---|-------|----------------|---------------------|----------------|-------|
| 1 | İlan oluşturma Step 3 mock data ile çalışıyor, gerçek API entegrasyonu yapılmamış | OfferRequestForm | **Yüksek** — İlanlar backend'e kaydedilmiyor | Orta | ❌ Bekliyor |
| 2 | Sosyal giriş (Google/Apple) hiçbir yerde yok | Login, Register | **Yüksek** — Kayıt dönüşüm oranı %30-40 düşük kalır | Orta | ❌ Post-MVP |
| 3 | Telefon doğrulama (OTP) mevcut değil | RegisterUser, RegisterCarrier | **Yüksek** — Sahte hesap riski | Orta | ❌ Post-MVP |
| 4 | "Şifremi Unuttum" akışı yok | Login | **Yüksek** — Şifresini unutan kullanıcı kaybolur | Kolay | ✅ DÜZELTİLDİ (ForgotPassword.tsx mevcut, backend endpoint var) |
| 5 | Nakliyeci operasyonel bilgileri sadece localStorage'da | Profile | **Yüksek** — Veriler cihaz değişince kaybolur | Orta | ❌ Sprint 5'te ele alınacak |
| 6 | Müşteri kayıtta API_BASE_URL hardcoded localhost | RegisterUser | **Yüksek** — Production'da kayıt çalışmaz | Kolay | ❌ Sprint 5'te ele alınacak |
| 7 | Login'de kullanıcı tipi seçimi zorunlu (yanlış tab = hata) | Login | **Orta** — Kullanıcı frustrasyonu | Orta | ❌ Bekliyor |
| 8 | Demo hesap şifreleri açık metin | Login | **Orta** — Güvenlik riski (production'da) | Kolay | ❌ Bekliyor |
| 9 | Nakliyeci kayıtta kullanım koşulları onayı yok | RegisterCarrier | **Orta** — Yasal risk (KVKK) | Kolay | ❌ Bekliyor |
| 10 | Origin/destination format uyumsuzluğu (frontend ayrı alan, backend tek string) | OfferRequestForm | **Orta** — Veri tutarsızlığı riski | Orta | ❌ Bekliyor |

---

## 4. ALAN ENVANTERİ — BACKEND UYUM ANALİZİ

### Kullanılmayan Backend Alanları

Backend entity'de var ama hiçbir formda kullanılmayan alanlar:

| Entity    | Alan                   | Açıklama                            | Forma Eklenmeli mi?     |
|-----------|------------------------|-------------------------------------|--------------------------|
| Customer  | isVerified             | E-posta/telefon doğrulama durumu    | Evet — doğrulama akışı ekle |
| Customer  | isActive               | Hesap aktiflik                      | Admin panelinde var       |
| Carrier   | hasUploadedDocuments   | Belge yükleme durumu                | Profil'de göster          |
| Carrier   | verifiedByAdmin        | Admin onay durumu                   | Profil'de göster          |
| Carrier   | documentCount          | Yüklenen belge sayısı               | Profil'de göster          |
| Carrier   | balance                | Cüzdan bakiyesi                     | Earnings sayfasında(?)    |
| Carrier   | completedShipments     | Tamamlanan iş sayısı                | Dashboard'da var          |
| Carrier   | cancelledShipments     | İptal sayısı                        | Dashboard'da var          |
| Carrier   | totalOffers            | Toplam teklif sayısı                | Dashboard'da var          |
| Carrier   | successRate            | Başarı oranı                        | Dashboard'da var          |
| Carrier   | lastLogin              | Son giriş zamanı                    | Admin panelde var         |
| Carrier   | pictureUrl             | Profil fotoğrafı                    | Hayır — Profil'de zaten var |
| Shipment  | carrierId              | Eşleşen nakliyeci                   | Hayır — otomatik atanır  |
| Shipment  | price                  | Anlaşılan fiyat                     | Hayır — teklif kabul sonrası |
| Vehicle   | brand                  | Araç markası                        | Evet — profilde ekle      |
| Vehicle   | model                  | Araç modeli                         | Evet — profilde ekle      |
| Vehicle   | year                   | Üretim yılı                         | Evet — profilde ekle      |
| Vehicle   | description            | Araç açıklaması                     | Opsiyonel — profilde      |
| Vehicle   | hasInsurance           | Sigorta durumu                      | Evet — profil/belge       |
| Vehicle   | insuranceExpiry        | Sigorta bitiş tarihi                | Evet — profil/belge       |
| Vehicle   | hasTrackingDevice      | GPS takip cihazı var mı             | Opsiyonel                 |
| Vehicle   | capacityM3             | Hacim kapasitesi                    | Evet — profilde ekle      |

### Formda Olan Ama Backend'de Karşılığı Olmayan Alanlar

| Form               | Alan              | Sorun                                    | Çözüm                                    |
|--------------------|-------------------|------------------------------------------|-------------------------------------------|
| RegisterCarrier    | Faaliyet İli      | Backend Carrier entity'de activityCity yok | Entity'ye activityCity alanı ekle veya kaldır |
| OfferRequestForm   | Fotoğraf (photos) | Shipment entity'de photo alanı yok       | Shipment'a `photoUrls: json` ekle         |
| OfferRequestForm   | Araç Tercihi      | Shipment entity'de vehiclePreference yok | Entity'ye opsiyonel alan ekle             |
| OfferRequestForm   | Açıklama (note)   | Tek karşılık var ama loadDetails ile çakışır | `note` alanını entity'ye ayrı ekle      |
| Profile (Carrier)  | Operasyonel adres | Carrier entity'de adres alanları yok     | Carrier'a address alanları ekle           |
| Profile (Carrier)  | serviceAreas      | Ayrı tablo (CarrierServiceType) ama localStorage'da | API entegrasyonunu tamamla         |
| Profile (Müşteri)  | Profil fotoğrafı  | Customer entity'de pictureUrl yok        | Customer'a `pictureUrl` ekle              |

---

## 5. UX AKIŞ ANALİZİ

### Müşteri Kayıt Akışı

**Mevcut akış:**
```
Adım 1 (Ad, Soyad, E-posta) → Adım 2 (Telefon, Adres, Şehir, İlçe) → Adım 3 (Şifre, Koşullar) → /giris
```

**Sorunlar ve öneriler:**
- **Drop-off noktası → Adım 2:** 6 zorunlu alan (telefon + 4 adres + şehir + ilçe) — çok ağır. Adres bilgisi kayıt sırasında gerekli değil.
- **Progressive disclosure eksik:** Adres bilgisi ilk ilan oluşturma veya profil sayfasına ertelenebilir.
- **Doğrulama eksik:** Kayıt sonrası e-posta veya telefon doğrulaması yok. Direkt /giris'e yönlendiriliyor.
- **Öneri:** Adım 1 (Ad + E-posta + Şifre) → OTP Doğrulama → Dashboard. Adres/telefon sonra.

### Nakliyeci Kayıt Akışı

**Mevcut akış:**
```
Tek Adım (Şirket Adı, Vergi No, Yetkili, Telefon, E-posta, İl, Yıl, Şifre×2) → /profil-tamamla
```

**Sorunlar ve öneriler:**
- **Tek adımda 9 alan:** "Hızlı kayıt" konsepti iyi ama araç bilgisi, belge bilgisi, hizmet alanı hiç sorulmuyor. Profil tamamlama motivasyonu zayıf — kullanıcı "sonra yaparım" deyip bırakır.
- **Progressive disclosure UX'i ters:** Çok az bilgi alınıyor → profil %20 tamamlanmış olarak başlıyor → kullanıcı teklif alamıyor → platformdan kopuyor.
- **Öneri:** Kayıt (Temel 5 alan) → Onboarding Wizard (Araç Ekle → Hizmet Alanı → Belge Yükle) → Dashboard. Üç-adımlı guided onboarding.

### İlan Oluşturma Akışı

**Mevcut akış:**
```
Adım 1 (Çıkış/Varış Şehir+İlçe, Tarih) → Adım 2 (Yük Türü, Detaylar, Sigorta, Ek Hizmet, Fotoğraf, Not) → Adım 3 (Özet & Mock Eşleştirme)
```

**Sorunlar ve öneriler:**
- **Adım 3 tamamlanmamış:** Mock data üzerinden nakliyeci eşleştirme yapılıyor. Gerçek backend'e ilan POST'lanmıyor.
- **Adım 2 yoğun:** 8+ alan tek sayfada. Sigorta, zaman tercihi, ek hizmetler — çoğu opsiyonel ama görsel olarak bunaltıcı olabilir.
- **Giriş kontrolü geç yapılıyor:** Kullanıcı 2 adım doldurduktan sonra Adım 3'te "giriş yapmalısınız" uyarısı alıyor. Daha erken kontrol edilmeli veya kayıtsız devam ettirip son adımda kayıt istemeli.
- **Öneri:** Adım 3'ü gerçek API submit'e çevir. Giriş kontrolünü Adım 1 sonrasına al.

### Teklif Verme Akışı

**Mevcut akış:**
```
Talep detayını gör (readonly) → Fiyat + Süre + Not gir → Gönder → /nakliyeci/teklifler
```

**Sorunlar ve öneriler:**
- **Akış basit ve uygun.** 3 alan — Uber Freight benchmark'ına uygun.
- **Fiyat validasyonu yok:** 0 TL teklif gönderilebilir.
- **Nakliyecinin kendi araç bilgisi otomatik eklenmeli:** Müşteri, hangi araçla taşınacağını bilmeli.
- **Öneri:** Min fiyat kontrolü + araç bilgisi otomatik ekleme + teklif detaylandırma (nakliye + işçilik + sigorta ayrımı).

---

## 6. BENCHMARK KARŞILAŞTIRMA TABLOSU

| Özellik                              | TaşıBurada     | Uber Freight | uShip        | Sahibinden   |
|---------------------------------------|-----------------|--------------|--------------|--------------|
| Kayıt adım sayısı (müşteri)          | 3 adım          | 2 adım       | 2 adım       | 2 adım       |
| Kayıt adım sayısı (nakliyeci)        | 1 adım (hızlı)  | 3 adım       | 3 adım       | 2 adım       |
| Sosyal login (Google/Apple)           | ❌ Yok           | ✅ Var        | ✅ Var        | ✅ Google     |
| Telefon doğrulama (OTP)              | ❌ Yok           | ✅ SMS OTP    | ✅ SMS        | ✅ SMS OTP    |
| Şifremi Unuttum                      | ❌ Yok           | ✅ Var        | ✅ Var        | ✅ Var        |
| İlan fotoğrafı                       | ✅ Var (mock)    | ❌ Yok        | ✅ Var        | ✅ Var        |
| Anlık fiyat tahmini                  | ❌ Yok           | ✅ Var        | ✅ Var        | ❌ Yok        |
| Harita tabanlı adres girişi          | ❌ Yok           | ✅ Var        | ✅ Var        | ✅ Var        |
| Kimlik doğrulama (KYC — nakliyeci)   | ❌ Eksik         | ✅ MC# doğrulama | ✅ Var     | ✅ T.C. Kimlik|
| Profil tamamlama yüzdesi             | ✅ Var (%20 başlangıç) | ❌ Yok  | ❌ Yok       | ❌ Yok        |
| Belge yükleme                        | ⚠️ UI var, backend eksik | ✅ Var | ✅ Var      | ✅ Var        |
| E-posta doğrulama                    | ❌ Yok           | ✅ Var        | ✅ Var        | ✅ Var        |
| 2FA (İki Faktörlü Doğrulama)        | ⚠️ UI var, backend eksik | ✅ Var | ❌ Yok     | ❌ Yok        |
| Otomatik kullanıcı tipi algılama     | ❌ Manuel tab    | ✅ Otomatik  | ✅ Otomatik  | ✅ Otomatik   |

---

## 7. ÖNCELİKLİ İYİLEŞTİRME PLANI

### Hemen Yapılabilir (1-2 saat, kod değişikliği minimal)

1. **RegisterUser.tsx'de API_BASE_URL'yi `/api/v1` olarak güncelle** — Tek satır değişiklik, production hatası önler. ❌ **YAPILMADI — Sprint 5'te öncelik #1**
2. **CarrierRespond'da fiyat validasyonu ekle** — `if (Number(price) <= 0) return;` + AdminSettings min_offer_price kontrolü. ❌ Yapılmadı
3. **Login'deki demo hesapları bölümünü `import.meta.env.DEV` ile koşullu yap** — 3 satır wrapper. ❌ Yapılmadı
4. **RegisterCarrier'a KVKK/kullanım koşulları checkbox'ı ekle** — 10 satır JSX. ❌ Yapılmadı
5. **alert() çağrılarını toast() ile değiştir** — RegisterUser, RegisterCarrier'da ~5 yer. ❌ **YAPILMADI — Sprint 5'te öncelik #2**
6. ~~**Login'e "Şifremi Unuttum" link placeholder'ı ekle"**~~ ✅ **TAMAMLANDI** — ForgotPassword.tsx mevcut, `/sifremi-unuttum` rotası çalışıyor.
7. **RegisterUser şifre kurallarını RegisterCarrier ile eşitle** — 8 karakter + büyük harf + rakam standardı. ❌ Yapılmadı

### Kısa Vadeli (1-2 sprint, orta karmaşıklık)

1. **OfferRequestForm Step 3'ü gerçek backend API'ye bağla** — POST /shipments endpoint'i mevcut, frontend entegrasyonu yapılmalı. ❌ Yapılmadı
2. **Login'de otomatik kullanıcı tipi algılama** — Backend'e GET /auth/check-email endpoint'i ekle → frontend tab'ı otomatik seç. ❌ Yapılmadı
3. **Nakliyeci onboarding wizard** — Kayıt sonrası 3 adımlı araç + hizmet + belge akışı. ❌ Yapılmadı
4. **Nakliyeci profil bilgilerini localStorage'dan backend API'ye taşı** — Carrier entity'ye adres alanları ekle, API endpoint'leri yaz. ❌ **YAPILMADI — Sprint 5'te öncelik #3**
5. **Customer entity'ye pictureUrl ekle** — Migration + API endpoint + frontend entegrasyonu. ❌ Yapılmadı
6. ~~**Shipment entity'ye photoUrls, note, vehiclePreference alanları ekle**~~ ✅ **TAMAMLANDI** — Migration #11 ile eklendi.
7. **Origin/Destination format standardizasyonu** — Frontend'de birleştir veya backend'de city/district ayrı alanlar yap. ❌ Yapılmadı
8. ~~**"Şifremi Unuttum" akışı**~~ ✅ **TAMAMLANDI** — Backend endpoint + frontend form çalışıyor.

### Uzun Vadeli (post-MVP, altyapı gerektirir)

1. **Google OAuth / Apple Sign-In entegrasyonu** — OAuth 2.0 altyapısı + frontend butonları + backend token doğrulama.
2. **SMS OTP doğrulama** — Netgsm/İletimerkezi entegrasyonu + OTP endpoint'leri + rate limiting.
3. **Harita tabanlı adres seçimi** — Google Maps Places API + Autocomplete + geocoding.
4. **Anlık fiyat tahmini (AI/ML)** — Tarihsel veri analizi + mesafe/ağırlık bazlı tahmin motoru.
5. **KYC (Kimlik Doğrulama) entegrasyonu** — T.C. Kimlik doğrulama API + belge OCR.
6. **2FA gerçek implementasyonu** — TOTP (Google Authenticator) veya SMS-based 2FA backend + frontend akışı.
7. **E-posta doğrulama akışı** — Kayıt sonrası doğrulama linki gönderimi + isVerified flag kullanımı.
8. **Profile.tsx modülerleştirme** — 1500+ satırlık monoliti küçük bileşenlere ayır.

---

## 8. FORM TASARIM KALİTE SKORU

Her formu 5 kriter üzerinden puanla (1-10):

| Form                | Alan Kalitesi | UX Akışı | Backend Uyumu | Validasyon | Benchmark Uyumu | Toplam |
|---------------------|:------------:|:--------:|:-------------:|:----------:|:---------------:|:------:|
| Müşteri Kayıt       | 7/10         | 6/10     | 8/10          | 7/10       | 4/10            | **32/50** |
| Nakliyeci Kayıt     | 5/10         | 5/10     | 6/10          | 5/10       | 4/10            | **25/50** |
| Giriş               | 6/10         | 5/10     | 8/10          | 6/10       | 3/10            | **28/50** |
| İlan Oluşturma      | 8/10         | 7/10     | 5/10          | 6/10       | 5/10            | **31/50** |
| Teklif Verme        | 6/10         | 7/10     | 8/10          | 4/10       | 6/10            | **31/50** |
| Profil Düzenleme    | 7/10         | 6/10     | 5/10          | 6/10       | 5/10            | **29/50** |
| Admin Ayarları      | 7/10         | 7/10     | 7/10          | 5/10       | 6/10            | **32/50** |
| Admin Yönetimi      | 7/10         | 7/10     | 8/10          | 6/10       | 6/10            | **34/50** |
| **ORTALAMA**        | **6.6**      | **6.3**  | **6.9**       | **5.6**    | **4.9**         | **30.3/50** |

**Genel Değerlendirme:** Platform, temel CRUD formları açısından çalışır durumda ve backend entity uyumu genel olarak iyi (%69). Ancak **validasyon** (5.6/10) ve **benchmark uyumu** (4.9/10) en zayıf alanlar. Sosyal giriş, OTP doğrulama, şifremi unuttum gibi modern platform standartları eksik. İlan oluşturma formunun backend entegrasyonunun tamamlanması ve nakliyeci onboarding akışının güçlendirilmesi en yüksek öncelikli iyileştirmeler olacaktır.
