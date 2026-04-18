type CarrierCompanySeed = {
  companyName: string;
  city: string;
};

type CustomerNameSeed = {
  firstName: string;
  lastName: string;
};

export const CITIES_WITH_DISTRICTS: Record<string, string[]> = {
  'İstanbul': [
    'Kadıköy',
    'Üsküdar',
    'Beşiktaş',
    'Şişli',
    'Bakırköy',
    'Beyoğlu',
    'Fatih',
    'Pendik',
  ],
  Ankara: [
    'Çankaya',
    'Keçiören',
    'Yenimahalle',
    'Etimesgut',
    'Mamak',
    'Sincan',
    'Pursaklar',
  ],
  'İzmir': [
    'Konak',
    'Karşıyaka',
    'Bornova',
    'Buca',
    'Bayraklı',
    'Çiğli',
    'Gaziemir',
  ],
  Bursa: [
    'Osmangazi',
    'Nilüfer',
    'Yıldırım',
    'Gürsu',
    'Mudanya',
    'İnegöl',
  ],
  Antalya: [
    'Muratpaşa',
    'Kepez',
    'Konyaaltı',
    'Aksu',
    'Döşemealtı',
    'Alanya',
  ],
  Adana: [
    'Seyhan',
    'Çukurova',
    'Yüreğir',
    'Sarıçam',
    'Ceyhan',
  ],
  Konya: [
    'Selçuklu',
    'Meram',
    'Karatay',
    'Ereğli',
    'Akşehir',
  ],
  Gaziantep: [
    'Şahinbey',
    'Şehitkamil',
    'Nizip',
    'İslahiye',
    'Nurdağı',
  ],
  Kocaeli: [
    'İzmit',
    'Gebze',
    'Darıca',
    'Körfez',
    'Başiskele',
  ],
  Mersin: [
    'Yenişehir',
    'Mezitli',
    'Toroslar',
    'Akdeniz',
    'Tarsus',
  ],
  Diyarbakır: [
    'Kayapınar',
    'Bağlar',
    'Yenişehir',
    'Sur',
    'Bismil',
  ],
  Kayseri: [
    'Melikgazi',
    'Kocasinan',
    'Talas',
    'Develi',
    'İncesu',
  ],
  'Eskişehir': [
    'Odunpazarı',
    'Tepebaşı',
    'Sivrihisar',
    'Mihalgazi',
  ],
  Samsun: [
    'Atakum',
    'İlkadım',
    'Canik',
    'Bafra',
    'Çarşamba',
  ],
  Denizli: [
    'Pamukkale',
    'Merkezefendi',
    'Acıpayam',
    'Tavas',
  ],
  'Şanlıurfa': [
    'Haliliye',
    'Karaköprü',
    'Eyyübiye',
    'Siverek',
    'Viranşehir',
  ],
  Trabzon: [
    'Ortahisar',
    'Akçaabat',
    'Yomra',
    'Araklı',
  ],
  Malatya: [
    'Battalgazi',
    'Yeşilyurt',
    'Doğanşehir',
    'Akçadağ',
  ],
  Erzurum: [
    'Yakutiye',
    'Palandöken',
    'Aziziye',
    'Oltu',
  ],
  Van: [
    'İpekyolu',
    'Tuşba',
    'Edremit',
    'Erciş',
  ],
  Aydın: [
    'Efeler',
    'Nazilli',
    'Kuşadası',
    'Söke',
    'Didim',
  ],
  Balıkesir: [
    'Karesi',
    'Altıeylül',
    'Bandırma',
    'Edremit',
    'Ayvalık',
  ],
  Sakarya: [
    'Adapazarı',
    'Serdivan',
    'Erenler',
    'Akyazı',
    'Hendek',
  ],
  Tekirdağ: [
    'Süleymanpaşa',
    'Çorlu',
    'Çerkezköy',
    'Kapaklı',
  ],
  Muğla: [
    'Menteşe',
    'Bodrum',
    'Fethiye',
    'Marmaris',
    'Milas',
  ],
};

export const CITIES = Object.keys(CITIES_WITH_DISTRICTS);

export const CITY_DENSITY: Record<string, { tier: 1 | 2 | 3; weight: number }> = {
  'İstanbul': { tier: 1, weight: 8 },
  Ankara: { tier: 1, weight: 7 },
  'İzmir': { tier: 1, weight: 7 },
  Bursa: { tier: 1, weight: 6 },
  Antalya: { tier: 1, weight: 6 },
  Adana: { tier: 1, weight: 5 },
  Konya: { tier: 1, weight: 5 },
  Gaziantep: { tier: 2, weight: 4 },
  Kocaeli: { tier: 2, weight: 4 },
  Mersin: { tier: 2, weight: 4 },
  Diyarbakır: { tier: 2, weight: 3 },
  Kayseri: { tier: 2, weight: 3 },
  'Eskişehir': { tier: 2, weight: 3 },
  Samsun: { tier: 2, weight: 3 },
  Denizli: { tier: 2, weight: 3 },
  'Şanlıurfa': { tier: 2, weight: 3 },
  Trabzon: { tier: 3, weight: 2 },
  Malatya: { tier: 3, weight: 2 },
  Erzurum: { tier: 3, weight: 2 },
  Van: { tier: 3, weight: 2 },
  Aydın: { tier: 3, weight: 2 },
  Balıkesir: { tier: 3, weight: 2 },
  Sakarya: { tier: 3, weight: 2 },
  Tekirdağ: { tier: 3, weight: 2 },
  Muğla: { tier: 3, weight: 2 },
};

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
  '1+1 ev eşyası',
  '2+1 ev eşyası',
  '3+1 ev eşyası',
  'Ofis mobilyası',
  'Arşiv ve evrak',
  'Beyaz eşya',
  'Mobilya',
  'Parça koliler',
  'Elektronik ekipman',
  'Depo çıkışı karma yük',
  'Ticari ürün paleti',
  'Hassas kırılacak eşya',
];

export const EXTRA_SERVICES = [
  'Montaj/Demontaj',
  'Ambalajlama',
  'Sigorta',
  'Asansörlü Taşıma',
  'Depolama',
  'Beyaz Eşya Kurulumu',
  'Profesyonel Paketleme',
  'Hafta Sonu Teslimat',
];

const FIXTURE_CARRIER_COMPANIES: CarrierCompanySeed[] = [
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

const CARRIER_COMPANY_PREFIXES = [
  'Prizma',
  'Atlas',
  'Nova',
  'Merkez',
  'Rota',
  'Kuzey',
  'Güney',
  'Doğu',
  'Batı',
  'Hedef',
  'Vizyon',
  'Lider',
  'Güven',
  'Zirve',
  'Yük',
  'Sürat',
  'Referans',
  'Pusula',
  'Terminal',
  'Dinamik',
];

const CARRIER_COMPANY_SUFFIXES = [
  'Nakliyat',
  'Lojistik',
  'Taşımacılık',
  'Taşıma',
  'Nakliye',
];

const CARRIER_NAME_PATTERNS = [
  (city: string, district: string, prefix: string, suffix: string) =>
    `${district} ${suffix}`,
  (city: string, district: string, prefix: string, suffix: string) =>
    `${city} ${prefix} ${suffix}`,
  (city: string, district: string, prefix: string, suffix: string) =>
    `${district} ${city} ${suffix}`,
  (city: string, district: string, prefix: string) =>
    `${prefix} ${district} Lojistik`,
  (city: string, district: string, prefix: string) =>
    `${city} ${district} ${prefix} Nakliyat`,
];

const CUSTOMER_NAME_FIXTURES: CustomerNameSeed[] = [
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

const CUSTOMER_FIRST_NAME_POOL = [
  'Ahmet',
  'Ayşe',
  'Mehmet',
  'Fatma',
  'Ali',
  'Zeynep',
  'Mustafa',
  'Elif',
  'Hasan',
  'Merve',
  'İbrahim',
  'Selin',
  'Emre',
  'Büşra',
  'Murat',
  'Gül',
  'Serkan',
  'Pınar',
  'Kerem',
  'Derya',
  'Can',
  'Deniz',
  'Ece',
  'Ozan',
  'Seda',
  'Yasemin',
  'Hakan',
  'Ebru',
  'Burak',
  'Gamze',
  'Onur',
  'Tuğçe',
  'Barış',
  'Melis',
  'Kaan',
  'Berk',
  'Ceren',
  'Naz',
  'Sinan',
  'Aslı',
  'Tolga',
  'Mina',
  'Umut',
  'Esra',
  'Volkan',
  'Sibel',
  'Arda',
  'Nehir',
];

const CUSTOMER_LAST_NAME_POOL = [
  'Yılmaz',
  'Kaya',
  'Demir',
  'Çelik',
  'Şahin',
  'Yıldız',
  'Arslan',
  'Doğan',
  'Kılıç',
  'Aydın',
  'Özdemir',
  'Şimşek',
  'Çetin',
  'Koç',
  'Erdoğan',
  'Acar',
  'Güneş',
  'Kurt',
  'Polat',
  'Çakır',
  'Aslan',
  'Aksoy',
  'Tekin',
  'Karataş',
  'Türkmen',
  'Kaplan',
  'Bulut',
  'Sezer',
  'Ateş',
  'Taş',
  'Keskin',
  'Yavuz',
  'Ergin',
  'Özer',
  'Avcı',
  'Özkan',
  'Toprak',
  'Can',
  'Taşkın',
  'Şen',
  'Korkmaz',
  'Karaca',
  'Ekinci',
  'Bilgin',
  'Durmaz',
  'Öztürk',
  'Akın',
  'Tuna',
];

const OFFER_MESSAGE_TEMPLATES_SOURCE = [
  'Bu rota için sigortalı ve planlı taşıma sunuyoruz.',
  'Ekibimiz paketleme dahil aynı gün organizasyon yapabilir.',
  'Asansörlü taşıma ve montaj desteği ile ilerleyebiliriz.',
  'Bu işi deneyimli şehirlerarası ekibimizle güvenle tamamlarız.',
  'Fiyat teklifimize profesyonel ambalajlama da dahildir.',
  'Belirttiğiniz tarihe uygun araç ve ekip planlamamız hazır.',
  'Parça eşya ve hassas ürün taşımalarında referanslı çalışıyoruz.',
  'Kurumsal taşıma süreçlerinde düzenli bilgilendirme sağlıyoruz.',
];

const weightedCities = Object.entries(CITY_DENSITY)
  .sort(([leftCity], [rightCity]) => leftCity.localeCompare(rightCity, 'tr'))
  .flatMap(([city, meta]) => Array.from({ length: meta.weight }, () => city));

function buildCarrierCompanies(targetCount: number): CarrierCompanySeed[] {
  const companies = [...FIXTURE_CARRIER_COMPANIES];
  const seen = new Set(companies.map((company) => company.companyName.toLocaleLowerCase('tr')));
  const districtUsage = new Map<string, number>();
  let cityCursor = 0;
  let prefixCursor = 0;
  let patternCursor = 0;

  while (companies.length < targetCount) {
    const city = weightedCities[cityCursor % weightedCities.length];
    const districts = CITIES_WITH_DISTRICTS[city];
    const districtIndex = districtUsage.get(city) ?? 0;
    const district = districts[districtIndex % districts.length];
    const prefix = CARRIER_COMPANY_PREFIXES[prefixCursor % CARRIER_COMPANY_PREFIXES.length];
    const suffix = CARRIER_COMPANY_SUFFIXES[companies.length % CARRIER_COMPANY_SUFFIXES.length];

    let companyName = '';
    for (let i = 0; i < CARRIER_NAME_PATTERNS.length; i++) {
      const pattern = CARRIER_NAME_PATTERNS[(patternCursor + i) % CARRIER_NAME_PATTERNS.length];
      const candidate = pattern(city, district, prefix, suffix);
      const normalized = candidate.toLocaleLowerCase('tr');
      if (!seen.has(normalized)) {
        companyName = candidate;
        seen.add(normalized);
        break;
      }
    }

    if (!companyName) {
      companyName = `${district} ${prefix} ${suffix} ${districtIndex + 1}`;
      seen.add(companyName.toLocaleLowerCase('tr'));
    }

    companies.push({ companyName, city });

    districtUsage.set(city, districtIndex + 1);
    cityCursor += 1;
    prefixCursor += 1;
    patternCursor += 1;
  }

  return companies;
}

function buildCustomerNames(targetCount: number): CustomerNameSeed[] {
  const names = [...CUSTOMER_NAME_FIXTURES];
  const seen = new Set(names.map((name) => `${name.firstName}|${name.lastName}`));

  for (const firstName of CUSTOMER_FIRST_NAME_POOL) {
    for (const lastName of CUSTOMER_LAST_NAME_POOL) {
      if (names.length >= targetCount) {
        return names;
      }

      const fullNameKey = `${firstName}|${lastName}`;
      if (seen.has(fullNameKey)) {
        continue;
      }

      seen.add(fullNameKey);
      names.push({ firstName, lastName });
    }
  }

  return names;
}

export const CARRIER_COMPANIES = buildCarrierCompanies(150);

export const CUSTOMER_NAMES = buildCustomerNames(400);

export const OFFER_MESSAGE_TEMPLATES = [...OFFER_MESSAGE_TEMPLATES_SOURCE];

export const REVIEW_COMMENTS: Record<number, string[]> = {
  1: [
    'İletişim zayıftı ve planlanan saatte gelinmedi.',
    'Eşyaların bir kısmı hasarlı ulaştı, memnun kalmadım.',
    'Süreç boyunca net bilgi verilmediği için sorun yaşadık.',
    'Fiyat sonradan değişti, güven vermeyen bir deneyimdi.',
    'Taşıma günü organizasyon eksikti ve gecikme çok uzadı.',
  ],
  2: [
    'Temel iş tamamlandı ama süreçte ciddi aksaklıklar oldu.',
    'Paketleme yetersizdi, daha dikkatli olunabilirdi.',
    'Ekip kibar olsa da zaman yönetimi zayıftı.',
    'Beklediğimiz profesyonellik seviyesine tam ulaşmadı.',
    'Bazı eşyalar geç teslim edildi, orta-alt bir deneyimdi.',
  ],
  3: [
    'Ortalama bir deneyimdi, geliştirilmesi gereken noktalar var.',
    'İş tamamlandı ancak iletişim daha güçlü olabilirdi.',
    'Genel olarak idare ederdi, küçük aksaklıklar yaşandı.',
    'Beklentimizin bir kısmını karşıladı, bir kısmını karşılamadı.',
    'Fiyat performans dengesi ortalamadaydı.',
  ],
  4: [
    'Genel olarak memnun kaldık, küçük gecikmeler dışında iyiydi.',
    'Düzenli ve güvenilir bir ekipti, tavsiye ederim.',
    'Taşıma süreci sorunsuz geçti, iletişim de iyiydi.',
    'Fiyat ve hizmet dengesi başarılıydı.',
    'Ekibin yaklaşımı profesyoneldi, tekrar çalışabiliriz.',
  ],
  5: [
    'Çok memnun kaldık, tüm süreç planlı ve özenli ilerledi.',
    'Profesyonel ekip, zamanında teslim ve temiz çalışma.',
    'Eşyalarımıza çok dikkat ettiler, gönül rahatlığıyla öneririm.',
    'Beklentimizin üzerinde bir hizmet aldık.',
    'Dakik, düzenli ve çözüm odaklı bir ekipti.',
    'Tekliften teslimata kadar her aşama sorunsuzdu.',
  ],
};
