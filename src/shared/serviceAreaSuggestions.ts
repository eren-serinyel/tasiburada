const NEARBY_SERVICE_AREAS: Record<string, string[]> = {
  'İstanbul': ['İstanbul', 'Kocaeli', 'Tekirdağ', 'Sakarya', 'Bursa', 'Yalova'],
  Ankara: ['Ankara', 'Konya', 'Eskişehir', 'Kayseri'],
  'İzmir': ['İzmir', 'Aydın', 'Manisa', 'Balıkesir', 'Muğla'],
  Bursa: ['Bursa', 'Yalova', 'Kocaeli', 'İstanbul', 'Balıkesir'],
  Antalya: ['Antalya', 'Mersin', 'Muğla', 'Konya', 'Adana'],
  Adana: ['Adana', 'Mersin', 'Gaziantep', 'Konya', 'Kayseri'],
  Konya: ['Konya', 'Ankara', 'Antalya', 'Kayseri', 'Adana'],
  Gaziantep: ['Gaziantep', 'Adana', 'Şanlıurfa', 'Diyarbakır', 'Kayseri'],
  Kocaeli: ['Kocaeli', 'İstanbul', 'Sakarya', 'Yalova', 'Bursa'],
  Mersin: ['Mersin', 'Adana', 'Antalya', 'Konya', 'Gaziantep'],
  Diyarbakır: ['Diyarbakır', 'Şanlıurfa', 'Gaziantep', 'Malatya', 'Van'],
  Kayseri: ['Kayseri', 'Konya', 'Adana', 'Gaziantep', 'Malatya'],
  'Eskişehir': ['Eskişehir', 'Ankara', 'Bursa', 'Kocaeli', 'İstanbul'],
  Samsun: ['Samsun', 'Trabzon', 'Erzurum', 'Ankara'],
  Denizli: ['Denizli', 'Muğla', 'Aydın', 'İzmir', 'Antalya'],
  'Şanlıurfa': ['Şanlıurfa', 'Gaziantep', 'Diyarbakır', 'Adana'],
  Trabzon: ['Trabzon', 'Samsun', 'Erzurum'],
  Malatya: ['Malatya', 'Kayseri', 'Diyarbakır', 'Erzurum'],
  Erzurum: ['Erzurum', 'Trabzon', 'Van', 'Malatya'],
  Van: ['Van', 'Diyarbakır', 'Erzurum'],
  Aydın: ['Aydın', 'İzmir', 'Muğla', 'Denizli'],
  Balıkesir: ['Balıkesir', 'Bursa', 'İzmir', 'İstanbul', 'Yalova'],
  Sakarya: ['Sakarya', 'Kocaeli', 'İstanbul', 'Bursa'],
  Tekirdağ: ['Tekirdağ', 'İstanbul', 'Bursa'],
  Muğla: ['Muğla', 'Aydın', 'Denizli', 'İzmir', 'Antalya'],
};

const normalizeCity = (value: string) => value.trim().toLocaleLowerCase('tr-TR');

export function resolveSuggestedServiceAreas(city: string | null | undefined): string[] {
  const normalized = normalizeCity(city ?? '');
  const matchedCity = Object.keys(NEARBY_SERVICE_AREAS).find(
    candidate => normalizeCity(candidate) === normalized,
  );

  if (!matchedCity) {
    return city?.trim() ? [city.trim()] : [];
  }

  return NEARBY_SERVICE_AREAS[matchedCity];
}
