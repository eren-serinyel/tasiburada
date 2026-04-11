export const CITIES_WITH_DISTRICTS: Record<string, string[]> = {
  'İstanbul': [
    'Kadıköy', 'Beşiktaş', 'Şişli', 'Bakırköy',
    'Üsküdar', 'Maltepe', 'Pendik', 'Ataşehir'
  ],
  'Ankara': [
    'Çankaya', 'Keçiören', 'Mamak', 'Etimesgut',
    'Yenimahalle', 'Pursaklar', 'Sincan'
  ],
  'İzmir': [
    'Konak', 'Karşıyaka', 'Bornova', 'Buca',
    'Bayraklı', 'Çiğli', 'Gaziemir'
  ],
  'Bursa': [
    'Osmangazi', 'Nilüfer', 'Yıldırım',
    'Gürsu', 'Kestel'
  ],
  'Antalya': [
    'Muratpaşa', 'Kepez', 'Konyaaltı',
    'Aksu', 'Döşemealtı'
  ],
};

export const CITIES = Object.keys(CITIES_WITH_DISTRICTS);

export const VEHICLE_TYPES = [
  { name: 'Kamyonet', defaultCapacityKg: 3500, defaultCapacityM3: 15 },
  { name: 'Panel Van', defaultCapacityKg: 1500, defaultCapacityM3: 8 },
  { name: 'Kamyon', defaultCapacityKg: 15000, defaultCapacityM3: 45 },
  { name: 'Tır', defaultCapacityKg: 40000, defaultCapacityM3: 90 },
];

export const SCOPE_OF_WORKS = [
  'Şehir İçi',
  'Şehirler Arası',
  'Uluslararası',
];

export const SERVICE_TYPES = [
  'Evden Eve Nakliyat',
  'Parça Eşya Taşıma',
  'Şehirlerarası Taşıma',
  'Şehir İçi Taşıma',
  'Ofis Taşıma',
  'Eşya Depolama',
];

export const LOAD_TYPES = [
  'Ev Eşyası',
  'Ofis Eşyası',
  'Elektronik',
  'Mobilya',
  'Beyaz Eşya',
  'Koli/Paket',
  'Ticari Mal',
];

export const EXTRA_SERVICES = [
  'Montaj/Demontaj',
  'Ambalajlama',
  'Sigorta',
  'Asansörlü Taşıma',
  'Depolama',
];

export const CARRIER_COMPANIES = [
  { companyName: 'Şile Nakliyat', city: 'İstanbul' },
  { companyName: 'Ankara Ekspres Taşımacılık', city: 'Ankara' },
  { companyName: 'Ege Nakliye Hizmetleri', city: 'İzmir' },
  { companyName: 'Marmara Lojistik', city: 'Bursa' },
  { companyName: 'Akdeniz Taşımacılık', city: 'Antalya' },
  { companyName: 'Boğaz Nakliyat', city: 'İstanbul' },
  { companyName: 'Başkent Taşıma', city: 'Ankara' },
  { companyName: 'Körfez Lojistik', city: 'İzmir' },
  { companyName: 'Uludağ Nakliyat', city: 'Bursa' },
  { companyName: 'Toroslar Taşımacılık', city: 'Antalya' },
  { companyName: 'İstanbul Hızlı Nakliyat', city: 'İstanbul' },
  { companyName: 'Anadolu Ekspres', city: 'Ankara' },
];

export const CUSTOMER_NAMES = [
  { firstName: 'Ahmet', lastName: 'Yılmaz' },
  { firstName: 'Ayşe', lastName: 'Kaya' },
  { firstName: 'Mehmet', lastName: 'Demir' },
  { firstName: 'Fatma', lastName: 'Çelik' },
  { firstName: 'Ali', lastName: 'Şahin' },
  { firstName: 'Zeynep', lastName: 'Yıldız' },
  { firstName: 'Mustafa', lastName: 'Arslan' },
  { firstName: 'Elif', lastName: 'Doğan' },
  { firstName: 'Hasan', lastName: 'Kılıç' },
  { firstName: 'Merve', lastName: 'Aydın' },
  { firstName: 'İbrahim', lastName: 'Özdemir' },
  { firstName: 'Selin', lastName: 'Şimşek' },
  { firstName: 'Emre', lastName: 'Çetin' },
  { firstName: 'Büşra', lastName: 'Koç' },
  { firstName: 'Murat', lastName: 'Erdoğan' },
  { firstName: 'Gül', lastName: 'Acar' },
  { firstName: 'Serkan', lastName: 'Güneş' },
  { firstName: 'Pınar', lastName: 'Kurt' },
  { firstName: 'Kerem', lastName: 'Polat' },
  { firstName: 'Derya', lastName: 'Çakır' },
];

export const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Çok memnun kaldık, kesinlikle tavsiye ederim.',
    'Profesyonel ekip, zamanında ve eksiksiz teslim.',
    'Eşyalarımıza çok özen gösterdiler, teşekkürler.',
    'Harika hizmet, fiyat/performans çok iyi.',
    'Dakik ve güvenilir, tekrar çalışacağız.',
  ],
  4: [
    'Genel olarak memnunum, küçük gecikmeler yaşandı.',
    'İyi hizmet, biraz daha dikkatli olunabilirdi.',
    'Güvenilir firma, tavsiye ederim.',
    'Hızlı ve düzenli taşıma yapıldı.',
  ],
  3: [
    'Ortalama bir deneyimdi, iyileştirme gerekiyor.',
    'İşini yapıyor ama iletişim zayıftı.',
    'Beklentilerimi tam karşılamadı ama tamam.',
  ],
};
