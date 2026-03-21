import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { VEHICLE_CAPACITIES } from './types';
import type { Carrier } from './types';
import { setSessionUser, getSessionUser } from './storage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Price calculation function
export const calculatePrice = (
  distance: number, // in km
  weight: number, // in kg
  vehicleType: keyof typeof VEHICLE_CAPACITIES,
  baseFee: number = 100 // Base fee in TL
): number => {
  const kmRate = 2.5; // TL per km
  const kgRate = 0.5; // TL per kg
  
  const distancePrice = distance * kmRate;
  const weightPrice = weight * kgRate;
  
  return Math.round(baseFee + distancePrice + weightPrice);
};

// Distance calculation (simplified - in real app would use Google Maps API)
export const calculateDistance = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLng = (destination.lng - origin.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Format Turkish Lira
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(price);
};

// Format date for Turkish locale
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// Deneyim yılı hesaplama: startYear varsa currentYear - startYear, yoksa mevcut experience alanı
export const getCarrierExperienceYears = (carrier: Carrier): number => {
  try {
    if (carrier.startYear && Number.isFinite(carrier.startYear)) {
      const current = new Date().getFullYear();
      const diff = current - Number(carrier.startYear);
      return Math.max(0, diff);
    }
  } catch {}
  return typeof carrier.experience === 'number' ? Math.max(0, carrier.experience) : 0;
};

// Dashboard başlığı: role -> label
export const getDashboardTitleForRole = (role?: string): string => {
  return role === 'carrier' ? 'Taşıma Merkezi' : 'İşlerim';
};

// ---- Reviews helpers ----
export const maskName = (name: string): string => {
  try {
    const [first, ...rest] = (name || '').trim().split(/\s+/);
    const last = rest.join(' ').trim();
    if (!first) return '';
    if (!last) return `${first}`;
    const initial = last.charAt(0) || '';
    return `${first} ${initial}${initial ? '***' : ''}`;
  } catch {
    return name;
  }
};

export type RatingStats = { avg: number; count: number };
export const computeAverageFromCategories = (r: { dakiklik: number; iletisim: number; ozen: number; profesyonellik: number }): number => {
  const vals = [r.dakiklik, r.iletisim, r.ozen, r.profesyonellik].map(Number);
  const valid = vals.filter(v => Number.isFinite(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a,b)=>a+b,0) / valid.length;
};

// Carrier profile completion helpers
export type CarrierProfileTaskKey = 'contact' | 'address' | 'vehicle' | 'documents' | 'bank';

export const getCarrierProfileTasks = (c: Carrier) => {
  const tasks = [
    { key: 'contact' as CarrierProfileTaskKey, label: 'İletişim bilgilerini tamamla', done: Boolean(c.email && c.phone) },
    { key: 'address' as CarrierProfileTaskKey, label: 'Adres bilgilerini ekle', done: Boolean(c.city) },
    { key: 'vehicle' as CarrierProfileTaskKey, label: 'Araç bilgilerini ekle', done: Boolean(c.vehicle && c.vehicle.licensePlate) },
    { key: 'documents' as CarrierProfileTaskKey, label: 'Belgeleri yükle (K belgesi, sigorta)', done: Boolean(c.documents && (c.documents.kBelgesi || c.documents.license)) },
    { key: 'bank' as CarrierProfileTaskKey, label: 'Banka IBAN ekle', done: Boolean((c as any).iban) },
  ];
  const doneCount = tasks.filter(t => t.done).length;
  let percent: number;

  if (typeof c.profileCompletion === 'number' && Number.isFinite(c.profileCompletion)) {
    percent = Math.max(0, Math.min(100, Math.round(c.profileCompletion)));
  } else {
    percent = Math.round((doneCount / tasks.length) * 100);
    // Hızlı kayıt sonrası ilk açılışta yüzdelik üst sınırını 20% ile sınırla (kullanıcı deneyimi için)
    try {
      const fastKey = `fastRegPending_${c.id}`;
      const hasFastFlag = Boolean(localStorage.getItem(fastKey));
      const overrideRaw = localStorage.getItem('profileCompletion');
      const override = overrideRaw ? Number(overrideRaw) : NaN;
      if (hasFastFlag && percent < 100) {
        const cap = Number.isFinite(override) ? override : 20;
        percent = Math.min(percent, cap);
      }
    } catch {}
  }
  const isComplete = percent === 100;
  return { tasks, doneCount, percent, isComplete };
};

// Persist updated carrier to localStorage (currentUser + mockCarriers if exists)
export const persistCarrierProfile = (updated: Carrier) => {
  try {
    // Oturumda bu kullanıcı varsa TTL'li güncelle
    const cur = getSessionUser();
    if (cur && cur.id === updated.id) {
      setSessionUser(updated);
    } else {
      localStorage.setItem('currentUser', JSON.stringify(updated));
    }
  } catch {}

  try {
    const raw = localStorage.getItem('mockCarriers');
    if (raw) {
      const arr = JSON.parse(raw) as Carrier[];
      const idx = arr.findIndex(c => c.id === updated.id);
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...updated };
        localStorage.setItem('mockCarriers', JSON.stringify(arr));
      } else {
        // If not found, push to allow overriding seed with edited profile
        arr.push(updated);
        localStorage.setItem('mockCarriers', JSON.stringify(arr));
      }
    }
  } catch {}
};