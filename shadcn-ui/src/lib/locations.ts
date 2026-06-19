// Statik, eksiksiz TR il/ilçe verisi — 81 il, 973 ilçe (resmî idari bölünüş).
// Önceki sürümdeki sorunlar:
//  1. turkey-neighbourhoods paketinde isim eşleşmesi (İ/I, Ğ/G) bazı illerde
//     sessizce başarısız olup API fallback'ine düşüyordu.
//  2. turkiyeapi.dev erişilemezse 5 ilçelik FALLBACK_DISTRICTS listesi
//     localStorage'a CACHE'leniyordu → kullanıcı kalıcı olarak eksik ilçe
//     görüyordu (asıl şikayetin kaynağı bu cache).
// Yeni sürüm: tamamen offline, senkron, cache'siz. Ağ yok, eksik ilçe yok.
import { TURKEY_CITIES, TURKEY_DISTRICTS } from '@/data/turkey-locations';

// Basit YYYY-MM-DD (yerel saat) formatlayıcı
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CITIES_TR = TURKEY_CITIES;

// ── Eski sürümün localStorage'a yazdığı eksik ilçe cache'lerini temizle ──
// (Mevcut kullanıcılarda kalıcı eksik liste sorununu bu satır çözer.)
try {
  localStorage.removeItem('tr_districts_by_city_v2');
  localStorage.removeItem('tr_districts_by_city_v1');
} catch {
  // ignore
}

// ── İsim normalizasyonu: "İSTANBUL", "istanbul", "Istanbul" → aynı anahtar ──
const trFold = (name: string): string =>
  name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .trim();

// Normalize anahtar → ilçe listesi haritası (modül yüklenirken bir kez kurulur)
const DISTRICTS_BY_NORMALIZED_CITY: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [city, districts] of Object.entries(TURKEY_DISTRICTS)) {
    map[trFold(city)] = districts;
  }
  return map;
})();

/** Senkron ilçe listesi — yeni kod bunu kullanabilir. */
export function getDistrictsForCitySync(city: string): string[] {
  if (!city) return [];
  return DISTRICTS_BY_NORMALIZED_CITY[trFold(city)] ?? [];
}

/**
 * Async imza geriye dönük uyumluluk için korunuyor
 * (CarrierFilters, OfferRequestForm vb. await ile çağırıyor).
 * Artık ağ isteği yok; anında çözülür.
 */
export async function getDistrictsForCity(city: string): Promise<string[]> {
  return getDistrictsForCitySync(city);
}
