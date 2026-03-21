# Taşıburada Backend API

**Taşıburada** - Profesyonel Nakliyat Platformu Backend'i

## 🏗️ Mimari

Bu proje **Domain-Driven Design (DDD)** prensiplerine göre tasarlanmış, katmanlı mimari yapısına sahiptir:

```
src/
├── domain/           # Domain Layer
│   ├── entities/     # Entity sınıfları (Carrier, Customer, Shipment, Offer, Vehicle)
│   └── valueObjects/ # Value Object'ler
├── application/      # Application Layer  
│   ├── services/     # Business logic servisler
│   └── dto/          # Data Transfer Objects
├── infrastructure/   # Infrastructure Layer
│   ├── database/     # TypeORM konfigürasyonu ve migrationlar
│   └── repositories/ # Repository pattern implementasyonları
└── presentation/     # Presentation Layer
    ├── controllers/  # HTTP controllers
    ├── routes/       # Express route tanımları
    └── middleware/   # Authentication vs. middleware'ler
```

## 🚀 Teknoloji Stack'i

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** TypeORM (Code-First yaklaşım)
- **Database:** MySQL
- **Authentication:** JWT
- **Validation:** class-validator
- **Security:** Helmet, CORS
- **Logging:** Morgan

## 📦 Kurulum (Yeni Bilgisayar)

### Gereksinimler

- **Node.js** v18+
- **MySQL 8.0** (yerel kurulum veya Docker)
- **npm** veya **pnpm**

### Yöntem A: Docker ile MySQL (Önerilen)

Docker yüklüyse tek komutla MySQL ayağa kalkar:

```bash
docker-compose up -d
```

Bu komut `tasiburada_dev` veritabanını otomatik oluşturur.

### Yöntem B: Manuel MySQL Kurulumu

1. MySQL 8.0'ı kurun ve çalıştırın
2. Veritabanını oluşturun:
```sql
CREATE DATABASE tasiburada_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Proje Kurulumu

```bash
# 1. Repo'yu klonla
git clone https://github.com/KULLANICI/tasiburada.git
cd tasiburada

# 2. Bağımlılıkları yükle
npm install

# 3. .env dosyasını oluştur
cp .env.example .env
# .env dosyasını kendi MySQL bilgilerinle düzenle

# 4. Migration + Seed (veritabanı tabloları ve temel veriler)
npm run setup

# 5. Backend'i başlat
npm run dev
```

### Frontend (shadcn-ui)

```bash
cd shadcn-ui
pnpm install
pnpm dev
```

### Ortam Değişkenleri (.env)

`.env.example` dosyasını `.env` olarak kopyalayıp düzenleyin:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password_here
DB_NAME=tasiburada_dev
DB_POOL=10
NODE_ENV=development
```

> **Not:** `.env` dosyası GitHub'a yüklenmez (güvenlik). Her bilgisayarda kendi `.env` dosyanızı oluşturmalısınız.

## 🔗 API Endpoints

### Health Check
```
GET /api/v1/health
```

### Customer (Müşteri) Endpoints
```
POST   /api/v1/customers/register      # Müşteri kayıt
POST   /api/v1/customers/login         # Müşteri giriş
GET    /api/v1/customers/profile       # Profil görüntüle (Auth)
PUT    /api/v1/customers/profile       # Profil güncelle (Auth)
PUT    /api/v1/customers/change-password # Şifre değiştir (Auth)
GET    /api/v1/customers/shipments     # Müşterinin taşıma istekleri (Auth)
```

### Shipment (Taşıma) Endpoints
```
POST   /api/v1/shipments                    # Taşıma isteği oluştur (Auth)
PUT    /api/v1/shipments/:id               # Taşıma isteği güncelle (Auth)
GET    /api/v1/shipments/:id               # Taşıma isteği detay
GET    /api/v1/shipments/my-shipments      # Benim taşıma isteklerim (Auth)
PUT    /api/v1/shipments/:id/assign-carrier # Nakliyeci ata (Auth)
PUT    /api/v1/shipments/:id/cancel        # Taşıma isteği iptal (Auth)
GET    /api/v1/shipments/search            # Taşıma arama
GET    /api/v1/shipments/pending           # Bekleyen taşıma istekleri
GET    /api/v1/shipments/stats             # İstatistikler
```

### Carrier Register (Nakliyeci Kayıt) Endpoints
```
POST   /api/v1/carriers/register         # Hızlı kayıt (Fast Register)
PUT    /api/v1/carriers/profile/:id      # Profil tamamlama/güncelleme
POST   /api/v1/carriers/documents        # Belge yükleme
PUT    /api/v1/carriers/verify/:id       # Admin doğrulaması
```

## 📊 Entity Yapıları

### Customer (Müşteri)
- Kişisel bilgiler (ad, soyad, email, telefon)
- Adres bilgileri (şehir, ilçe, detaylı adres)
- Hesap durumu (aktif/pasif, doğrulanmış/değil)

### Carrier (Nakliyeci)  
- Şirket bilgileri (firma adı, vergi no, yetkili kişi)
- İletişim bilgileri (telefon, email)
- Araç türleri (desteklenen araç çeşitleri)
- Konum bilgileri (şehir, ilçe)
- Rating ve tamamlanan iş sayısı

### Shipment (Taşıma İsteği)
- Çıkış ve varış noktaları (şehir, ilçe, adres)
- Tarih ve fiyat aralığı bilgileri
- Kargo türü ve açıklama
- Durum (beklemede, teklifler alındı, atandı, teslim edildi)
- Sigorta ve ağırlık/hacim bilgileri

### Offer (Teklif)
- Fiyat ve mesaj bilgileri
- Tahmini teslim süresi
- Sigorta dahil mi/değil mi
- Durum (beklemede, kabul/red/geri çekildi)

### Vehicle (Araç)
- Araç türü ve kapasiteler (kg, m³)
- Plaka, marka, model, yıl bilgileri
- Sigorta ve takip cihazı durumu
- Aktif/pasif durum

## 🔐 Authentication

API, JWT tabanlı kimlik doğrulama kullanır:

1. `/customers/login` endpoint'ine email/password ile POST request
2. Başarılı girişte JWT token alın
3. Korumalı endpoint'lere `Authorization: Bearer <token>` header'ı ile istek gönderin

## 🗄️ Database Migration

TypeORM'ün code-first yaklaşımını kullanır:

```bash
# Yeni migration oluştur
npm run migration:generate

# Migration'ları uygula
npm run migration:run  

# Son migration'ı geri al
npm run migration:revert
```

## 🏃‍♂️ Development

```bash
# Development server (watch mode)
npm run dev

# Build
npm run build

# Type checking
npm run build
```

## 🛡️ Security

- **Helmet:** Security headers
- **CORS:** Cross-origin resource sharing kontrolü  
- **JWT:** Stateless authentication
- **bcryptjs:** Password hashing
- **Input validation:** class-validator ile

## 🌍 Environment

- **Development:** Detaylı loglar ve hata mesajları
- **Production:** Optimized logging ve error handling

## 📝 Logging

Morgan middleware ile HTTP request logları ve custom application logları.

## ⚡ Performance

- Connection pooling (MySQL)
- JWT stateless authentication
- Efficient database queries
- Error handling ve graceful shutdown

## 🔄 Deployment

1. Environment variables'ları production'a göre ayarla
2. `NODE_ENV=production` set et
3. Database migration'larını çalıştır
4. `npm start` ile sunucuyu başlat

---

**Taşıburada Backend API** - Professional Transportation Platform 🚛