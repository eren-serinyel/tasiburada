import { TURKISH_CITIES } from './constants';
// Offline TR il/ilçe/mahalle verisi
// turkey-neighbourhoods, tüm iller ve ilçeler için eksiksiz veri sağlar
import {
  getCityCodes,
  getCityNames,
  isCityName,
  getDistrictsByCityCode
} from 'turkey-neighbourhoods';

// Basit YYYY-MM-DD (yerel saat) formatlayıcı
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CITIES_TR = TURKISH_CITIES;

// Yedek ilçe listesi (ağ hatası veya CORS durumuna karşı). En azından sık kullanılan iller eksiksiz gelsin.
const FALLBACK_DISTRICTS: Record<string, string[]> = {
  İstanbul: ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'],
  Ankara: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut', 'Altındağ', 'Pursaklar', 'Gölbaşı', 'Polatlı'],
  İzmir: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Gaziemir', 'Karabağlar', 'Bayraklı', 'Çiğli', 'Balçova', 'Narlıdere'],
  Bursa: ['Osmangazi', 'Yıldırım', 'Nilüfer', 'İnegöl', 'Mustafakemalpaşa'],
  Antalya: ['Kepez', 'Muratpaşa', 'Konyaaltı', 'Alanya', 'Manavgat'],
  Adana: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Ceyhan'],
  Konya: ['Selçuklu', 'Karatay', 'Meram', 'Ereğli', 'Akşehir'],
  Gaziantep: ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye'],
  // Yaygın eksik yaşanan illere hızlı fallback
  Ağrı: ['Ağrı Merkez', 'Doğubayazıt', 'Patnos', 'Diyadin', 'Taşlıçay'],
  Van: ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş', 'Muradiye'],
  Erzurum: ['Yakutiye', 'Aziziye', 'Palandöken', 'Oltu', 'Pasinler'],
  Şanlıurfa: ['Eyyübiye', 'Haliliye', 'Karaköprü', 'Suruç', 'Viranşehir'],
  Diyarbakır: ['Bağlar', 'Kayapınar', 'Sur', 'Yenişehir', 'Bismil'],
  Mersin: ['Yenişehir', 'Toroslar', 'Akdeniz', 'Mezitli', 'Tarsus'],
  Trabzon: ['Ortahisar', 'Akçaabat', 'Yomra', 'Of', 'Arsin'],
  Kayseri: ['Kocasinan', 'Melikgazi', 'Talas', 'Develi', 'Pınarbaşı'],
  Eskişehir: ['Tepebaşı', 'Odunpazarı', 'Sivrihisar', 'Alpu', 'İnönü']
};

// Basit önbellek anahtarları
const CACHE_KEY = 'tr_districts_by_city_v2';

function getCache(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(map: Record<string, string[]>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// İsim normalizasyonu (TR -> ASCII, küçük/büyük varyantlar)
function normalizeCityName(name: string): string {
  const map: Record<string, string> = {
    'İ': 'I', 'I': 'I', 'ı': 'i', 'i': 'i', 'Ğ': 'G', 'ğ': 'g', 'Ü': 'U', 'ü': 'u',
    'Ş': 'S', 'ş': 's', 'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c', 'Â': 'A', 'â': 'a', 'Ê': 'E', 'ê': 'e'
  };
  return name.split('').map(ch => map[ch] ?? ch).join('');
}

async function fetchDistrictsByProvinceName(city: string): Promise<string[]> {
  const url = `https://turkiyeapi.dev/api/v1/districts?province=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const list: string[] = (data?.data || []).map((d: any) => String(d.name)).filter(Boolean);
  const uniq: string[] = Array.from(new Set<string>(list));
  return uniq.sort((a: string, b: string) => a.localeCompare(b, 'tr'));
}

async function fetchDistrictsByProvinceId(city: string): Promise<string[]> {
  // 1) province id bul
  const resP = await fetch(`https://turkiyeapi.dev/api/v1/provinces?name=${encodeURIComponent(city)}`, { headers: { 'accept': 'application/json' } });
  if (!resP.ok) return [];
  const pj = await resP.json();
  const id = pj?.data?.[0]?.id;
  if (!id) return [];
  // 2) id ile district getir
  const resD = await fetch(`https://turkiyeapi.dev/api/v1/districts?provinceId=${encodeURIComponent(String(id))}`, { headers: { 'accept': 'application/json' } });
  if (!resD.ok) return [];
  const dj = await resD.json();
  const list: string[] = (dj?.data || []).map((d: any) => String(d.name)).filter(Boolean);
  const uniq: string[] = Array.from(new Set<string>(list));
  return uniq.sort((a: string, b: string) => a.localeCompare(b, 'tr'));
}

// İlçeleri getir – önce cache, sonra public API (çok aşamalı), sonra fallback.
export async function getDistrictsForCity(city: string): Promise<string[]> {
  if (!city) return [];
  const cache = getCache();
  if (cache[city]?.length) return cache[city];

  // 0) Offline paket (turkey-neighbourhoods) – kesin ve hızlı sonuç
  try {
    // İl adını city code'a çevir ve ilçeleri getir
    let code: string | undefined;
    // Doğrudan eşleşen isim
    if (isCityName(city)) {
      // getCityNames() sıralı isim listesi döner, index'i ile code'u eşleştiririz
      const names = getCityNames();
      const idx = names.findIndex(n => n.toLowerCase() === city.toLowerCase());
      if (idx >= 0) code = getCityCodes()[idx];
    }
    // Normalize isimle dene (İ->I vb.)
    if (!code) {
      const norm = normalizeCityName(city);
      const names = getCityNames();
      const idx = names.findIndex(n => normalizeCityName(n).toLowerCase() === norm.toLowerCase());
      if (idx >= 0) code = getCityCodes()[idx];
    }
    let districtsFromPkg: string[] = [];
    if (code) {
      const list = getDistrictsByCityCode(code) || [];
      districtsFromPkg = Array.from(new Set(list.map(String))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
    }
    if (districtsFromPkg.length) {
      cache[city] = districtsFromPkg;
      setCache(cache);
      return districtsFromPkg;
    }
  } catch {
    // Paket varsa bile yapı değişmiş olabilir; API denemelerine düşeriz
  }

  // Public API denemeleri (isimle, normalize isimle, provinceId ile)
  try {
    // 1) Doğrudan isim
    let list = await fetchDistrictsByProvinceName(city);
    // 2) Normalized (Agri, Istanbul vs.)
    if (!list.length) list = await fetchDistrictsByProvinceName(normalizeCityName(city));
    // 3) ProvinceId ile
    if (!list.length) list = await fetchDistrictsByProvinceId(city);
    if (!list.length) list = await fetchDistrictsByProvinceId(normalizeCityName(city));
    if (list.length) {
      cache[city] = list;
      setCache(cache);
      return list;
    }
  } catch {
    // ignore – fallback'a düşeceğiz
  }

  const fallback = FALLBACK_DISTRICTS[city as keyof typeof FALLBACK_DISTRICTS] || [];
  if (fallback.length) {
    cache[city] = fallback;
    setCache(cache);
  }
  return fallback;
}
