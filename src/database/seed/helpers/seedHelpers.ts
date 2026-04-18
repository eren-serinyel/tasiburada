import * as bcrypt from 'bcryptjs';
import { ShipmentCategory } from '../../../domain/entities/Shipment';
import { CITIES, CITIES_WITH_DISTRICTS, CITY_DENSITY } from '../data/constants';

export type CarrierSeedTier =
  | 'elite'
  | 'established'
  | 'growing'
  | 'new'
  | 'onboarding';

export type ShipmentDistanceBand =
  | 'intra_city'
  | 'intercity'
  | 'long_haul';

export type WeightedDateWindow = {
  maxDaysAgo: number;
  minDaysAgo: number;
  weight: number;
};

export type CarrierTierProfile = {
  tier: CarrierSeedTier;
  verifiedByAdmin: boolean;
  submittedForReview: boolean;
  profileCompletionRange: [number, number];
  completedShipmentRange: [number, number];
  ratingRange: [number, number];
  documentMode: 'full' | 'mostly_full' | 'mixed' | 'pending';
  serviceCountRange: [number, number];
  scopeCountRange: [number, number];
  vehicleCountRange: [number, number];
};

const weightedCities = Object.entries(CITY_DENSITY).flatMap(([city, meta]) =>
  Array.from({ length: meta.weight }, () => city),
);

const carrierTierDefinitions: Record<CarrierSeedTier, Omit<CarrierTierProfile, 'tier'>> = {
  elite: {
    verifiedByAdmin: true,
    submittedForReview: true,
    profileCompletionRange: [100, 100],
    completedShipmentRange: [50, 150],
    ratingRange: [4.5, 5.0],
    documentMode: 'full',
    serviceCountRange: [3, 4],
    scopeCountRange: [2, 3],
    vehicleCountRange: [2, 4],
  },
  established: {
    verifiedByAdmin: true,
    submittedForReview: true,
    profileCompletionRange: [100, 100],
    completedShipmentRange: [15, 50],
    ratingRange: [3.8, 4.8],
    documentMode: 'full',
    serviceCountRange: [2, 4],
    scopeCountRange: [2, 3],
    vehicleCountRange: [1, 3],
  },
  growing: {
    verifiedByAdmin: true,
    submittedForReview: true,
    profileCompletionRange: [80, 100],
    completedShipmentRange: [3, 15],
    ratingRange: [3.2, 4.5],
    documentMode: 'mostly_full',
    serviceCountRange: [2, 4],
    scopeCountRange: [1, 3],
    vehicleCountRange: [1, 2],
  },
  new: {
    verifiedByAdmin: true,
    submittedForReview: true,
    profileCompletionRange: [60, 80],
    completedShipmentRange: [0, 5],
    ratingRange: [0, 4.2],
    documentMode: 'mixed',
    serviceCountRange: [2, 3],
    scopeCountRange: [1, 2],
    vehicleCountRange: [1, 2],
  },
  onboarding: {
    verifiedByAdmin: false,
    submittedForReview: false,
    profileCompletionRange: [30, 60],
    completedShipmentRange: [0, 0],
    ratingRange: [0, 0],
    documentMode: 'pending',
    serviceCountRange: [1, 2],
    scopeCountRange: [1, 2],
    vehicleCountRange: [0, 1],
  },
};

export function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}

export function randomPastDate(daysAgo: number, referenceDate: Date = new Date()): Date {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - randomInt(1, daysAgo));
  return date;
}

export function randomPastDateBetween(
  minDaysAgo: number,
  maxDaysAgo: number,
  referenceDate: Date = new Date(),
): Date {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() - randomInt(minDaysAgo, maxDaysAgo));
  return date;
}

export function randomFutureDate(daysAhead: number, referenceDate: Date = new Date()): Date {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + randomInt(1, daysAhead));
  return date;
}

export function randomFutureDateBetween(
  minDaysAhead: number,
  maxDaysAhead: number,
  referenceDate: Date = new Date(),
): Date {
  const date = new Date(referenceDate);
  date.setDate(date.getDate() + randomInt(minDaysAhead, maxDaysAhead));
  return date;
}

export function randomWeightedFrom<T>(
  items: readonly T[],
  getWeight: (item: T) => number,
): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  let cursor = Math.random() * totalWeight;

  for (const item of items) {
    cursor -= getWeight(item);
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

export function randomWeightedDate(
  windows: readonly WeightedDateWindow[],
  referenceDate: Date = new Date(),
): Date {
  const selectedWindow = randomWeightedFrom(windows, (window) => window.weight);
  return randomPastDateBetween(
    selectedWindow.minDaysAgo,
    selectedWindow.maxDaysAgo,
    referenceDate,
  );
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function randomWeightedCity(): string {
  return randomFrom(weightedCities);
}

export function randomDistrict(city: string): string {
  const districts = CITIES_WITH_DISTRICTS[city] ?? ['Merkez'];
  return randomFrom(districts);
}

export function randomLocation(city?: string): string {
  const selectedCity = city ?? randomWeightedCity();
  const district = randomDistrict(selectedCity);
  return `${selectedCity}, ${district}`;
}

export function calcAvgRating(ratings: number[]): number {
  if (ratings.length === 0) {
    return 0;
  }

  const sum = ratings.reduce((left, right) => left + right, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function generateTaxNumber(): string {
  return Array.from({ length: 10 }, () => randomInt(0, 9)).join('');
}

export function generatePhone(): string {
  const prefixes = [
    '532',
    '533',
    '535',
    '536',
    '541',
    '542',
    '543',
    '544',
    '551',
    '552',
    '553',
    '555',
  ];

  return `0${randomFrom(prefixes)}${Array.from({ length: 7 }, () => randomInt(0, 9)).join('')}`;
}

export function turkishToAscii(str: string): string {
  return str
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O');
}

export function buildTierCounts(totalCarriers: number): Record<CarrierSeedTier, number> {
  const elite = Math.round(totalCarriers * 0.1);
  const established = Math.round(totalCarriers * 0.3);
  const growing = Math.round(totalCarriers * 0.3);
  const newcomer = Math.round(totalCarriers * 0.2);
  const onboarding = totalCarriers - elite - established - growing - newcomer;

  return {
    elite,
    established,
    growing,
    new: newcomer,
    onboarding,
  };
}

export function resolveCarrierTier(
  index: number,
  totalCarriers: number,
): CarrierTierProfile {
  const counts = buildTierCounts(totalCarriers);

  if (index < counts.elite) {
    return { tier: 'elite', ...carrierTierDefinitions.elite };
  }

  if (index < counts.elite + counts.established) {
    return { tier: 'established', ...carrierTierDefinitions.established };
  }

  if (index < counts.elite + counts.established + counts.growing) {
    return { tier: 'growing', ...carrierTierDefinitions.growing };
  }

  if (index < counts.elite + counts.established + counts.growing + counts.new) {
    return { tier: 'new', ...carrierTierDefinitions.new };
  }

  return { tier: 'onboarding', ...carrierTierDefinitions.onboarding };
}

export function randomDistanceBand(): ShipmentDistanceBand {
  return randomWeightedFrom<ShipmentDistanceBand>(
    ['intra_city', 'intercity', 'long_haul'],
    (band) => {
      if (band === 'intra_city') {
        return 40;
      }

      if (band === 'intercity') {
        return 55;
      }

      return 5;
    },
  );
}

export function randomDestinationCity(
  originCity: string,
  distanceBand: ShipmentDistanceBand,
): string {
  if (distanceBand === 'intra_city') {
    return originCity;
  }

  const sameTierCities = CITIES.filter((city) =>
    city !== originCity &&
    CITY_DENSITY[city].tier === CITY_DENSITY[originCity].tier,
  );

  if (distanceBand === 'long_haul') {
    const otherTierCities = CITIES.filter((city) =>
      city !== originCity &&
      CITY_DENSITY[city].tier !== CITY_DENSITY[originCity].tier,
    );
    return randomFrom(otherTierCities.length > 0 ? otherTierCities : CITIES.filter((city) => city !== originCity));
  }

  const fallbackCities = CITIES.filter((city) => city !== originCity);
  return randomFrom(sameTierCities.length > 0 ? sameTierCities : fallbackCities);
}

export function calculateShipmentBasePrice(params: {
  category: ShipmentCategory;
  distanceBand: ShipmentDistanceBand;
  extraServiceCount?: number;
  floorFactor?: number;
  weightKg: number;
}): number {
  const { category, distanceBand, extraServiceCount = 0, floorFactor = 0, weightKg } = params;

  const categoryBase: Record<ShipmentCategory, number> = {
    [ShipmentCategory.HOME_MOVE]: 4500,
    [ShipmentCategory.OFFICE_MOVE]: 7000,
    [ShipmentCategory.PARTIAL_ITEM]: 1800,
    [ShipmentCategory.STORAGE]: 2500,
  };

  const distanceMultiplier: Record<ShipmentDistanceBand, number> = {
    intra_city: 1.0,
    intercity: 1.45,
    long_haul: 2.1,
  };

  const weightComponent = Math.max(0, weightKg - 250) * 1.35;
  const serviceComponent = extraServiceCount * 350;
  const floorComponent = floorFactor * 120;
  const rawBasePrice = (categoryBase[category] + weightComponent + serviceComponent + floorComponent)
    * distanceMultiplier[distanceBand];

  return Math.round(rawBasePrice / 10) * 10;
}
