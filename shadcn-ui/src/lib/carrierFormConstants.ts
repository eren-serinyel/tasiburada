// Paylaşılan sabitler: RegisterCarrier ve Profile sihirbazı tarafından kullanılır
export const cities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin",
  "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Isparta",
  "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla",
  "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop",
  "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van",
  "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak",
  "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce",
  'Türkiye Geneli'
];

export const VEHICLE_TYPES: Record<string, { name: string; maxCapacity: number }> = {
  kamyonet: { name: "Kamyonet", maxCapacity: 3500 },
  panelvan: { name: "Panel Van", maxCapacity: 1500 },
  kamyon: { name: "Kamyon", maxCapacity: 15000 },
  tir: { name: "Tır", maxCapacity: 40000 },
};

export const SPECIAL_SERVICES: Record<string, string> = {
  "evden-eve": "Evden Eve Nakliyat",
  "parca": "Parça Eşya Taşıma",
  "sehirlerarasi": "Şehirlerarası Taşıma",
  "sehirici": "Şehir İçi Taşıma",
  "ofis": "Ofis Taşıma",
  "depolama": "Eşya Depolama",
};

export const ADDITIONAL_SERVICE_OPTIONS: Record<string, Record<string, string>> = {
  "evden-eve": {
    asansor: "Asansörle taşıma",
    paketleme: "Paketleyerek taşıma",
    soktak: "Sökme-takma (montaj)",
    koli: "Koli/ambalaj malzemesi",
    sigorta: "Ek sigorta",
    kattasima: "Kat arası taşıma",
    ekspertiz: "Ücretsiz ekspertiz",
    haftasonu: "Hafta sonu hizmet",
    gece: "Gece taşıma",
  },
  parca: {
    hizli: "Hızlı teslimat",
    sigorta: "Ek sigorta",
    hassas: "Hassas eşya koruma",
    kapidan: "Kapıdan alım",
    teslimattaodeme: "Teslimatta ödeme",
  },
  sehirlerarasi: {
    express: "Express taşıma",
    ikiekip: "2 kişilik ekip",
    uzunyolsigorta: "Uzun yol ek sigorta",
    takip: "Canlı takip",
  },
  sehirici: {
    asansor: "Asansörle taşıma",
    paketleme: "Paketleme",
    trafiksaatdisi: "Trafik yoğunluğu dışında",
    bekleme: "Bekleme süresi dahil",
  },
  ofis: {
    profesyonelpaket: "Profesyonel paketleme",
    server: "Server/IT özel taşıma",
    kabloetiket: "Kablo etiketleme",
    asansor: "Asansör kullanımı",
    sigorta: "Kurumsal sigorta",
  },
  depolama: {
    iklim: "İklim kontrollü depo",
    nem: "Nem önleyici paketleme",
    sigorta: "Depo sigortası",
    kisa: "Kısa süreli depolama",
    uzun: "Uzun süreli depolama",
  },
};
