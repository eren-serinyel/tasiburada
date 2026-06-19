# Tasiburada Mimari Rehberi

Bu dosya Claude'un projeyi hizli ve dogru anlamasi icin hazirlanmistir. Amac: "nerede ne var", katmanlar nasil konusuyor, kritik is akislari nerelerde duruyor ve degisiklik yaparken nelere dikkat edilmeli sorularina tek yerden cevap vermek.

## Kisa Ozet

Tasiburada, musteriler ile nakliyecileri eslestiren bir nakliyat platformudur. Repo iki ana uygulamadan olusur:

- Backend: Kok dizindeki TypeScript + Express + TypeORM + MySQL uygulamasi.
- Frontend: `shadcn-ui/` altindaki Vite + React + Tailwind + shadcn/Radix uygulamasi.

Backend DDD benzeri katmanli bir mimari kullanir:

```text
src/
  domain/           Entity, enum, value object ve domain error'lari
  application/      Is kurallari, servisler, DTO'lar
  infrastructure/   TypeORM data source, migration, repository, upload altyapisi
  presentation/     Express route, controller ve middleware'ler
  database/seed/    Seed verisi ve seeder'lar
  __tests__/        Jest testleri ve entegrasyon akislari
```

Frontend rota ve sayfa odakli ilerler:

```text
shadcn-ui/src/
  App.tsx           Tum React Router rota agaci
  main.tsx          AuthProvider + App bootstrap
  context/          AuthContext
  lib/              apiClient, auth/storage helper'lari, domain sabitleri
  pages/            Musteri, nakliyeci, admin ve bilgi sayfalari
  components/       Layout, Navbar, formlar, profil/admin/shared/ui bilesenleri
```

## Calistirma ve Komutlar

Backend:

```bash
npm install
npm run migration:run
npm run seed
npm run dev
npm test
npm run build
```

Frontend:

```bash
cd shadcn-ui
pnpm install
pnpm dev
pnpm build
pnpm lint
```

Veritabani MySQL'dir. `docker-compose.yml` MySQL icin vardir. Backend `src/infrastructure/database/data-source.ts` uzerinden `.env` okur. `JWT_SECRET` yoksa backend baslamadan cikar.

## Backend Giris Noktasi

Ana dosya: `src/index.ts`

Bu dosya:

- `dotenv` ve `reflect-metadata` yukler.
- Express uygulamasini kurar.
- Helmet, CORS, Morgan, JSON/body limitleri ve rate limitleri baglar.
- `/uploads/pictures/:filename` herkese acik profil fotografi servisini verir.
- `/uploads/documents/:filename` icin token ve ownership kontrolu yapar.
- `/api/v1` altina `src/presentation/routes/index.ts` route agacini baglar.
- `initializeDatabase()` ile TypeORM baglantisini acar.
- Port doluysa tercih edilen porttan itibaren uygun port arar.
- Global error handler ve 404 handler tanimlar.

## API Route Haritasi

Tum API'ler `/api/v1` altindadir.

`src/presentation/routes/index.ts` ana route kaydi:

- `/auth`: genel auth yardimlari; email check, sifre sifirlama, email dogrulama.
- `/customers`: musteri kayit/giris/profil/adres/favori/teklif goruntuleme.
- `/carriers`: nakliyeci kayit/giris/profil/onboarding/belge/arac/yetkinlik/arama.
- `/vehicle-types`: arac tipi lookup.
- `/shipments`: tasima talebi CRUD, pending ilanlar, durum gecisleri, invite.
- `/offers`: nakliyeci teklif olusturma/guncelleme/geri cekme, musteri kabul/red.
- `/notifications`: bildirim listeleme, okundu isaretleme.
- `/payments`: manuel odeme kaydi ve odeme serbest birakma.
- `/ai`: auth gerektiren chat/status endpointleri.
- `/converter`: hacim/yuk converter katalog, session, estimate, shipment'a uygulama.
- `/reviews`: yorum olusturma/guncelleme/silme/listeleme.
- `/admin`: admin panel API'leri; login haric hepsi admin token ister.
- `/config`: public config.
- `/health`: saglik kontrolu.

## Katmanlarin Sorumlulugu

### Domain Layer

Konum: `src/domain`

Bu katman TypeORM entity'lerini ve enum'lari icerir. Is kurallarinin buyuk kismi servislerde olsa da tablo modelinin kaynagi burasidir.

Ana entity'ler:

- `Customer`: musteri hesap bilgileri, adres iliskileri, reset/verification tokenlari.
- `Carrier`: nakliyeci firma hesabi, admin onay durumu, profil, istatistik, belge, arac ve yetkinlik iliskileri.
- `Shipment`: tasima talebi; origin/destination, kategori, tarih, ekstra hizmetler, converter sonucu, statu.
- `Offer`: nakliyecinin shipment'a verdigi teklif.
- `Payment`: kabul edilmis teklif icin manuel odeme kaydi ve platform komisyonu.
- `Review`: musteri/nakliyeci yorumlari.
- `Notification`: musteri, nakliyeci ve admin bildirimleri.
- `Admin`, `AuditLog`, `PlatformSetting`: admin panel ve platform ayarlari.
- `CarrierDocument`, `CarrierVehicle`, `CarrierActivity`, `CarrierProfileStatus`, `CarrierSecuritySettings`: nakliyeci profil/onboarding parcasi.
- `CarrierLoadTypeCapability`, `CarrierExtraServiceCapability`: nakliyecinin hangi yuk tipi ve ek hizmetleri destekledigini tutar.
- `ServiceType`, `ScopeOfWork`, `VehicleType`, `ExtraService`: lookup/katalog entity'leri.
- `ConverterSession`, `ConverterAnswer`, `ConverterResult`, `ConverterItemCatalog`, `ConverterVehicleRule`: hacim converter modeli.
- `ContactFilterLog`, `MatchCooldown`, `CustomerCarrierRelation`, `FavoriteCarrier`, `CustomerAddress`, `CustomerPreference`: guvenlik, eslesme ve musteri deneyimi destek modelleri.

Onemli enum'lar:

- `ShipmentStatus`: `pending`, `offer_received`, `matched`, `in_transit`, `completed`, `cancelled`.
- `OfferStatus`: `pending`, `accepted`, `rejected`, `withdrawn`, `cancelled`.
- `CarrierApprovalState`: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- `PaymentStatus`: `pending`, `authorized`, `captured`, `completed`, `failed`, `refunded`.

### Application Layer

Konum: `src/application`

Controller'lar ince tutulmaya calisilir; asil is kurallari servislerdedir.

Ana servisler:

- `AuthService`: musteri/nakliyeci sifre sifirlama, email dogrulama, email tip kontrolu.
- `CustomerService`, `CustomerAddressService`, `FavoriteCarrierService`, `CustomerOfferService`: musteri hesap, adres, favori ve teklif goruntuleme.
- `CarrierAuthService`: nakliyeci kayit/giris/JWT.
- `CarrierApprovalService`: admin onay state machine, claim/release/approve/reject/suspend.
- `CarrierProfileStatusService`: profil tamamlama yuzdesi ve approval readiness.
- `CarrierCapabilityService`: yuk tipi ve ek hizmet yetkinlikleri.
- `CarrierSearchService`: public nakliyeci arama filtrelerini normalize eder ve repository'ye verir.
- `ShipmentService`: shipment create/update/list/detail/status transitions, PII maskeleme, matching, notification, cooldown.
- `OfferService`: teklif create/update/accept/reject/withdraw, atomic kabul islemi, yetkinlik ve anti-disintermediation kontrolleri.
- `MatchingService`: shipment ile carrier uygun mu sorusunun merkezi kontrolu.
- `PaymentService`: kabul edilen teklif icin odeme kaydi, platform fee, tamamlanmis tasimada release.
- `ReviewService`: yorum akisları.
- `NotificationService`: bildirim olusturma, okundu, event tabanli bildirimler.
- `PlatformPolicyService`: iletisim yasagi, cooldown, dogrudan iletisim ne zaman gorulur gibi platform kurallari.
- `ContactSafetyService`: telefon/email/link/mesajlasma uygulamasi paylasimini yakalar, loglar, gerekirse admin'e bildirir.
- `ConverterService`: hacim tahmini, arac onerisi, converter sonucunu shipment'a uygulama.
- `AiService`: OpenAI uyumlu gateway uzerinden chat/status.

DTO'lar `src/application/dto` altindadir. Converter DTO'lari `src/application/dto/converter/ConverterDto.ts` icindedir.

### Infrastructure Layer

Konum: `src/infrastructure`

- `database/data-source.ts`: TypeORM DataSource. Entity ve migration glob'larini ts-node veya dist runtime'a gore secer. `synchronize: false`; migration beklenir.
- `database/migrations`: tum sema evrimi. Yeni tablo/kolon icin migration yaz veya generate et.
- `repositories`: TypeORM repository wrapper'lari. Ortak CRUD `BaseRepository.ts` icinde.
- `upload/uploadMiddleware.ts`: multer tabanli dosya yukleme ayarlari.

Repository'ler servislerin DB erisim katmanidir. Bazi servisler karmasik transaction/query icin dogrudan `AppDataSource` da kullanir; bu projede bu normaldir.

### Presentation Layer

Konum: `src/presentation`

- `routes`: endpoint path ve middleware baglama.
- `controllers`: request/response uyarlama. Genelde service cagirir, HTTP status/json doner.
- `middleware/auth.ts`: JWT token okuma ve `authenticateCustomer`, `authenticateCarrier`, `authenticateAdmin`, `requireSuperadmin`.
- `middleware/rateLimiter.ts`: auth ve request rate limitleri.
- `middleware/validateConverterRequest.ts`: converter request validation.
- `middleware/checkCarrierProfileCompletion.ts`: nakliyeci profil tamamlama gate'i.

## Kritik Is Akislari

### Auth ve Yetkilendirme

Iki kullanici tipi vardir: `customer` ve `carrier`. Admin ayri `admins` tablosundadir.

- Musteri endpointleri `authenticateCustomer`.
- Nakliyeci endpointleri `authenticateCarrier`.
- Admin endpointleri `authenticateAdmin`; superadmin islemleri `requireSuperadmin`.
- JWT payload icinde `type`, `customerId` veya `carrierId` veya `adminId`, `email`, admin icin `role` bulunur.
- Frontend token'i `localStorage` icinde `authToken` anahtariyla saklar.

### Nakliyeci Onboarding ve Admin Onayi

Nakliyeci `Carrier` entity'sinde hem eski `verifiedByAdmin` bayragi hem yeni `approvalState` state machine'i vardir. Teklif verme ve public listing icin pratikte ikisi de onemlidir:

- `verifiedByAdmin === true`
- `approvalState === APPROVED`
- `isActive === true`

Onboarding parcali tablolara yayilir:

- Sirket bilgisi: `Carrier`
- Faaliyet bilgisi: `CarrierActivity`
- Araclar: `CarrierVehicle`, `CarrierVehicleType`
- Hizmet tipleri: `CarrierServiceType`
- Calisma kapsami: `CarrierScopeOfWork`
- Belgeler: `CarrierDocument`
- Guvenlik/notification/earnings: ilgili `Carrier*` entity'leri
- Profil yuzdesi: `CarrierProfileStatus`

Admin onay kuyrugu ve state gecisleri `AdminController`, `CarrierApprovalService`, `AdminService` etrafindadir.

### Shipment Akisi

Temel statu gecisleri `ShipmentService.ensureStatusTransition()` icinde:

```text
PENDING -> OFFER_RECEIVED | MATCHED | CANCELLED
OFFER_RECEIVED -> MATCHED | CANCELLED
MATCHED -> IN_TRANSIT | CANCELLED
IN_TRANSIT -> COMPLETED
COMPLETED -> terminal
CANCELLED -> terminal
```

Musteri shipment olusturur veya gunceller. Nakliyeci pending shipment listesini gorurken sistem:

- `MatchingService` ile nakliyeci uygunlugunu kontrol eder.
- Aktif cooldown olan musteri/nakliyeci eslerini gizler.
- Musteri PII ve acik adresi maskeler.
- `contactPhone` gibi dogrudan iletisim alanlarini gizler.

Shipment detayinda gorunurluk kullanici tipine gore degisir:

- Admin tam gorur.
- Musteri sadece kendi shipment'ini gorur.
- Carrier sadece atanmis ise daha fazla detay gorur; aksi halde musteri PII ve adres maskelemesi devam eder.

### Matching Mantigi

Merkez: `src/application/services/MatchingService.ts`

Bir carrier su kosullari saglamazsa shipment icin uygun sayilmaz:

- Carrier kaydi var.
- `isActive` true.
- `verifiedByAdmin` true.
- `approvalState` `APPROVED`.
- Sehir ici/sehirler arasi scope uyumlu.
- Sehir ici islerde carrier faaliyet sehri shipment origin sehriyle uyumlu.
- Shipment kategori/yuk tipi carrier load capability ile uyumlu.
- Istenen ekstra hizmetler carrier extra service capability ile uyumlu.
- Arac tipi tercihi varsa carrier bunu destekliyor.
- Carrier takvim/availableDates shipment tarihine uygunsa geciyor.

`MATCHING_DEBUG=true` yapilirsa mismatch reason console debug'a yazilir.

### Teklif Akisi

Merkez: `src/application/services/OfferService.ts`

Nakliyeci teklif olustururken:

- Shipment `PENDING` veya `OFFER_RECEIVED` olmali.
- Carrier aktif, admin onayli ve `APPROVED` olmali.
- Carrier ile musteri arasinda aktif cooldown olmamali.
- Carrier shipment'in yuk tipi/ek hizmet yetkinliklerini karsilamali.
- Teklif mesaji platform disi iletisim icermemeli.
- Fiyat platform minimumunun altinda olmamali.
- Ayni carrier ayni shipment'a aktif teklif vermisse yeni kayit acmak yerine mevcut teklif guncellenir.
- Ilk teklif gelirse shipment status `OFFER_RECEIVED` olur.

Musteri teklif kabul edince transaction kullanilir:

- Offer pessimistic lock ile kilitlenir.
- Shipment pessimistic lock ile kilitlenir.
- Kabul edilen offer `ACCEPTED` olur.
- Diger pending offer'lar `REJECTED` olur.
- Shipment `MATCHED`, `carrierId`, `price`, `matchedAt` ile guncellenir.

Carrier kabul edilmis teklifi geri cekerse shipment tekrar `PENDING`'e donebilir ve diger reddedilmis teklifler tekrar `PENDING` olabilir.

### Odeme Akisi

Merkez: `src/application/services/PaymentService.ts`

Odeme su anda manuel/provider placeholder modelindedir:

- Sadece `ACCEPTED` offer ve `MATCHED` shipment icin odeme kaydi acilir.
- Platform komisyonu `PLATFORM_COMMISSION_RATE` env degerinden, yoksa %10 varsayilanindan hesaplanir.
- Odeme `PENDING` baslar.
- Musteri, shipment `COMPLETED` olduktan sonra `confirmRelease` ile odemeyi `COMPLETED` yapabilir.
- Carrier'a payment released bildirimi best-effort gonderilir.

### Iletisim Guvenligi ve Anti-Disintermediation

Bu proje dogrudan telefon/e-posta/link paylasimini engellemeye calisir.

Onemli dosyalar:

- `src/utils/security.ts`: metin analizi ve contact rule tespiti.
- `src/application/services/contact-safety/ContactSafetyService.ts`: analiz, loglama, admin escalations.
- `src/application/services/PlatformPolicyService.ts`: policy uygulama, contact reveal, cooldown.
- `src/domain/entities/ContactFilterLog.ts`: yakalanan ihlal kayitlari.

Teklif mesajlari, shipment notlari ve load details gibi yuzeylerde contact info bloklanir veya loglanir. Admin panelde `contact-filter-logs` endpointleri ve sayfasi vardir.

### Cooldown Mantigi

`MatchCooldown` ve `PlatformPolicyService` belirli iptal/ihlallerden sonra ayni musteri-nakliyeci eslesmesinin tekrar teklif/eslesme yapmasini engeller. Shipment listeleme ve teklif/assign kontrollerinde bu dikkate alinir.

### Converter / Hacim Hesaplama

Backend:

- Route: `src/presentation/routes/converterRoutes.ts`
- Controller: `src/presentation/controllers/ConverterController.ts`
- Service: `src/application/services/ConverterService.ts`
- DTO: `src/application/dto/converter/ConverterDto.ts`
- Entity: `ConverterSession`, `ConverterAnswer`, `ConverterResult`, `ConverterItemCatalog`, `ConverterVehicleRule`
- Dokumanlar: `docs/converter/v1/`

Akis:

1. Kullanici aktif item katalogunu alir.
2. Converter session olusturur.
3. Esya listesi, kat/asansor, ozel esya gibi cevaplarla estimate alir.
4. Sistem min/max m3, tahmini kg, arac onerisi, confidence, warning ve ekstra hizmet onerileri uretir.
5. Kullanici sonucu kendi shipment'ina uygularsa bos alanlar doldurulur; dolu alanlar overwrite edilmez.

Frontend karsiligi:

- `shadcn-ui/src/pages/VolumeCalculatorLanding.tsx`
- `shadcn-ui/src/components/converter/*`
- `shadcn-ui/src/lib/converterApi.ts`
- `shadcn-ui/src/lib/converterCategories.ts`

## Frontend Mimari

Giris:

- `shadcn-ui/src/main.tsx`: session TTL kontrolu, `AuthProvider`, React render.
- `shadcn-ui/src/App.tsx`: tum route agaci, QueryClient, TooltipProvider, Toaster, BrowserRouter.
- `shadcn-ui/src/lib/config.ts`: `VITE_API_URL` veya varsayilan `/api/v1`.
- `shadcn-ui/src/lib/apiClient.ts`: token ekler, 401'de localStorage temizler ve `/giris`'e yonlendirir.
- `shadcn-ui/src/context/AuthContext.tsx`: localStorage/session'dan kullanici durumunu kurar.

Sayfa gruplari:

- Public/landing: `Index`, `RoleHome`, `CustomerHome`, `CarrierHome`, bilgi sayfalari.
- Auth: `Login`, `RegisterUser`, `RegisterCarrier`, `ForgotPassword`, `VerifyEmail`.
- Musteri: `OfferRequest`, `MyOffers`, `OfferComparison`, `Payments`, `History`, `FavoriteCarriers`.
- Nakliyeci: `CarrierOnboarding`, `CarrierOffers`, `CarrierRespond`, `Earnings`, `CarrierCalendar`, profil bolumleri.
- Ortak auth: `Dashboard`, `ShipmentList`, `ShipmentDetail`, `Notifications`, `Messages`, `Profile`.
- Public carrier discovery: `CarrierList`, `CarrierDirectory`, `CarrierDetailPage`.
- Admin: `pages/admin/*`, `AdminLayout`, `AdminProtectedRoute`, shared admin components.

Koruma:

- Normal kullanici korumasi: `ProtectedRoute`.
- Admin korumasi: `AdminProtectedRoute`.
- Kullanici rolu frontend'de `AuthContext.userType` uzerinden secilir ama backend kontrolleri asil guvenlik kaynagidir.

UI:

- shadcn/Radix UI bilesenleri `shadcn-ui/src/components/ui`.
- Genel layout `Layout`, `Navbar`, `Footer`.
- Profil form parcalari `components/profile`.
- Admin ortak bilesenleri `components/admin/shared`.

## Database, Migration ve Seed

TypeORM code-first entity'ler vardir fakat `synchronize: false`; sema migration ile yonetilir.

- DataSource: `src/infrastructure/database/data-source.ts`
- Migration'lar: `src/infrastructure/database/migrations`
- Seed girisi: `src/database/seed/seed.ts`
- Seeder'lar: `src/database/seed/seeders`
- Seed sabitleri/data: `src/database/seed/data`

Onemli seed alanlari:

- Lookup verileri: vehicle types, service types, scope of work, extra services.
- Demo customer/carrier/shipment/offer/admin.
- Converter katalog ve arac kurallari.

Yeni entity/kolon eklerken:

1. Entity'yi guncelle.
2. Migration ekle.
3. Gerekiyorsa seed'i guncelle.
4. Ilgili repository/service/controller/route ve frontend API kullanimlarini hizala.
5. Test ekle veya mevcut akis testini guncelle.

## Testler

Jest config: `jest.config.ts`

Testler `src/__tests__` altinda. Test isimleri proje kapsamlarini iyi anlatir:

- `auth-*`: auth ve guvenlik.
- `customer-flow*`: musteri akis/frotend contract.
- `carrier-*`: nakliyeci onboarding, approval, capability, public trust.
- `shipment-lifecycle-hardening.test.ts`: shipment statu ve lifecycle guvenligi.
- `offer-*`: teklif ve shipment eslesme akisi.
- `payment-flow.test.ts`: odeme.
- `converter-api-flow.test.ts`: converter API.
- `contact-safety-*`: iletisim filtreleme ve admin bildirimleri.
- `admin-*`: admin panel API contractlari.

Genel test komutu:

```bash
npm test
```

Belirli test:

```bash
npm test -- --testPathPattern=offer-shipment-flow
```

## Degisiklik Yaparken Dikkat Edilecekler

- Token ve role kontrollerini sadece frontend'e birakma; backend middleware/service ownership kontrolu yapmali.
- `ShipmentStatus` ve `OfferStatus` gecislerini elle dagitma; `ShipmentService` ve `OfferService` icindeki transaction/status kurallarini takip et.
- Carrier teklif verebilir mi sorusunda `isActive`, `verifiedByAdmin`, `approvalState`, capability ve cooldown kontrollerini birlikte dusun.
- Musteri/nakliyeci PII maskeleme kurallarini bozma. Carrier public/pending gorunumlerinde telefon, email, acik adres gorunmemeli.
- Teklif mesaji, shipment notu ve load details gibi serbest metin alanlarinda `PlatformPolicyService.enforceNoContactInfo`/contact safety akisini atlama.
- Payment provider su anda gercek gateway degil; `manual` model. Gercek odeme eklenirse `PaymentService` transaction sinirlari ve status modeli korunmali.
- Converter apply idempotent ve bos alanlari doldurma mantigina sahiptir; mevcut shipment alanlarini rastgele overwrite etme.
- TypeORM decimal alanlar bazen string donebilir; bazi entity'lerde transformer var. Fiyat/agirlik/komisyon hesaplarinda `Number(...)` kullanimi yaygin.
- Frontend `apiClient` relative path'i `APP_CONFIG.apiBaseUrl` ile tamamlar. Ciplak `fetch` kullanacaksan token/401 davranisini kacirmamaya dikkat et.
- Mevcut dosyalarda bazi Turkce metinler mojibake gorunebilir. Yeni metin eklerken UTF-8 kullan; mevcut API mesajlarini degistirmek test contractlarini etkileyebilir.

## Hangi Istege Hangi Dosyadan Baslanir?

- Backend endpoint nerede? `src/presentation/routes/*Routes.ts`, sonra ilgili controller, sonra service.
- Is kuralini degistirmek: once `src/application/services`.
- DB alani eklemek: `src/domain/entities`, migration, seed/test.
- Nakliyeci arama/listing: `CarrierSearchService`, `CarrierRepository`, frontend `lib/carrierSearch.ts`, `pages/CarrierList.tsx`, `components/carriers`.
- Teklif akisi: `OfferService`, `OfferController`, `offerRoutes`, frontend `MyOffers`, `OfferComparison`, `CarrierOffers`, `CustomerOfferCard`.
- Shipment akisi: `ShipmentService`, `ShipmentController`, `shipmentRoutes`, frontend `OfferRequest`, `ShipmentList`, `ShipmentDetail`.
- Admin panel: backend `adminRoutes`, `AdminController`, `AdminService`; frontend `pages/admin/*`.
- Profil/onboarding: backend `CarrierProfileController` ve `application/services/carrier/*`; frontend `CarrierOnboarding`, `Profile`, `components/profile/*`.
- Converter: `ConverterService`, `converterRoutes`, `docs/converter/v1`, frontend converter component/lib dosyalari.
- Contact safety: `utils/security.ts`, `ContactSafetyService`, `PlatformPolicyService`, `ContactFilterLog`, admin contact filter sayfalari.
- Notification: `NotificationService`, `notifications/notificationEvents.ts`, `Notification` entity, frontend `NotificationBell`, `Notifications`.

## Kisa Veri Akisi Ornekleri

Musteri teklif talebi olusturur:

```text
Frontend OfferRequest -> apiClient POST /shipments
  -> shipmentRoutes.authenticateCustomer
  -> ShipmentController.create
  -> ShipmentService.createShipment
  -> ShipmentRepository + ExtraService relations
  -> NotificationService eligible carrier notifications
```

Nakliyeci teklif verir:

```text
CarrierOffers/CarrierRespond -> apiClient POST /offers
  -> offerRoutes.authenticateCarrier
  -> OfferController.create
  -> OfferService.createOffer
  -> capability + cooldown + contact safety checks
  -> OfferRepository
  -> Shipment status PENDING -> OFFER_RECEIVED
  -> NotificationService customer.offer_received
```

Musteri teklif kabul eder:

```text
OfferComparison/MyOffers -> apiClient PUT/POST /offers/:id/accept
  -> authenticateCustomer
  -> OfferService.acceptOffer
  -> DB transaction + pessimistic locks
  -> accepted offer ACCEPTED, other offers REJECTED
  -> shipment MATCHED + carrierId + price
  -> NotificationService carrier.offer_accepted
```

Nakliyeci tasimayi tamamlar:

```text
Carrier UI -> PUT /shipments/:id/start -> MATCHED -> IN_TRANSIT
Carrier UI -> PUT /shipments/:id/complete -> IN_TRANSIT -> COMPLETED
  -> Carrier stats and earnings log update
  -> CustomerCarrierRelation upsert
  -> NotificationService customer.shipment_completed
```

Converter sonucu shipment'a uygulanir:

```text
VolumeCalculator -> POST /converter/sessions
  -> POST /converter/sessions/:id/estimate
  -> POST /converter/sessions/:id/apply-to-shipment
  -> ConverterService bos shipment alanlarini doldurur
```

## Proje Disiplini

Bu repo genis ama duzenli. En guvenli ilerleme sekli:

1. Route'u bul.
2. Controller'dan service'e git.
3. Service icindeki ownership, status, policy ve transaction kontrollerini oku.
4. Entity/repository iliskilerini kontrol et.
5. Frontend'de `apiClient` ve ilgili sayfa/lib contract'ini kontrol et.
6. Degisiklikten sonra ilgili Jest testini calistir.

