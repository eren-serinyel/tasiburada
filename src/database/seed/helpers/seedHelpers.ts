import * as bcrypt from 'bcryptjs';
import { CITIES_WITH_DISTRICTS, CITIES } from '../data/constants';

/** Diziden rastgele eleman seç */
export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Min-max arasında rastgele tam sayı */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Rastgele float (1 ondalık) */
export function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/** Geçmişe ait rastgele tarih */
export function randomPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysAgo));
  return date;
}

/** Gelecekte rastgele tarih */
export function randomFutureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysAhead));
  return date;
}

/** Şifreyi hash'le (bcrypt 12 tur) */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Şehir için ilçe seç */
export function randomDistrict(city: string): string {
  const districts = CITIES_WITH_DISTRICTS[city] ?? ['Merkez'];
  return randomFrom(districts);
}

/** "Şehir, İlçe" formatında lokasyon üret */
export function randomLocation(city?: string): string {
  const c = city ?? randomFrom(CITIES);
  const d = randomDistrict(c);
  return `${c}, ${d}`;
}

/** Puan ortalaması hesapla */
export function calcAvgRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/** Array'den N eleman seç (karışık) */
export function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Vergi numarası üret (10 hane) */
export function generateTaxNumber(): string {
  return Array.from({ length: 10 }, () => randomInt(0, 9)).join('');
}

/** Telefon numarası üret */
export function generatePhone(): string {
  const prefixes = [
    '532', '533', '535', '536',
    '541', '542', '543', '544',
    '551', '552', '553', '555',
  ];
  return `0${randomFrom(prefixes)}${Array.from({ length: 7 }, () => randomInt(0, 9)).join('')}`;
}

/** Türkçe karakterleri ASCII'ye çevir (e-posta üretimi için) */
export function turkishToAscii(str: string): string {
  return str
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O');
}
