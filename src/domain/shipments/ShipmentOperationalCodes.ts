export const DATE_FLEXIBILITY_CODES = [
  'EXACT_DATE',
  'PLUS_MINUS_1_DAY',
  'PLUS_MINUS_3_DAYS',
  'ANY_DAY_IN_SELECTED_WEEK',
  'UNDECIDED',
] as const;

export const LOCATION_SIDE_CODES = [
  'ORIGIN',
  'DESTINATION',
] as const;

export const ELEVATOR_TYPE_CODES = [
  'NONE',
  'STANDARD',
  'FREIGHT',
  'NOT_SUITABLE',
  'UNKNOWN',
] as const;

export const VEHICLE_ACCESS_DISTANCE_CODES = [
  'AT_ENTRANCE',
  'BETWEEN_20_AND_50_METERS',
  'OVER_50_METERS',
  'UNKNOWN',
] as const;

export type DateFlexibilityCode =
  typeof DATE_FLEXIBILITY_CODES[number];
export type LocationSideCode =
  typeof LOCATION_SIDE_CODES[number];
export type ElevatorTypeCode =
  typeof ELEVATOR_TYPE_CODES[number];
export type VehicleAccessDistanceCode =
  typeof VEHICLE_ACCESS_DISTANCE_CODES[number];

const dateFlexibilityCodeSet = new Set<string>(
  DATE_FLEXIBILITY_CODES,
);
const locationSideCodeSet = new Set<string>(
  LOCATION_SIDE_CODES,
);
const elevatorTypeCodeSet = new Set<string>(
  ELEVATOR_TYPE_CODES,
);
const vehicleAccessDistanceCodeSet = new Set<string>(
  VEHICLE_ACCESS_DISTANCE_CODES,
);

export const isDateFlexibilityCode = (
  value: unknown,
): value is DateFlexibilityCode =>
  typeof value === 'string' &&
  dateFlexibilityCodeSet.has(value);

export const isLocationSideCode = (
  value: unknown,
): value is LocationSideCode =>
  typeof value === 'string' &&
  locationSideCodeSet.has(value);

export const isElevatorTypeCode = (
  value: unknown,
): value is ElevatorTypeCode =>
  typeof value === 'string' &&
  elevatorTypeCodeSet.has(value);

export const isVehicleAccessDistanceCode = (
  value: unknown,
): value is VehicleAccessDistanceCode =>
  typeof value === 'string' &&
  vehicleAccessDistanceCodeSet.has(value);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const dateOnly = (
  value: Date | string | null | undefined,
): string | null => {
  if (value === null || value === undefined) return null;
  const text = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
  if (!ISO_DATE.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== text
    ? null
    : text;
};

const shiftDate = (
  value: string,
  dayOffset: number,
): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
};

export interface DateWindow {
  readonly start: string | null;
  readonly end: string | null;
}

export const deriveDateWindow = (
  preferredMoveDate: Date | string | null | undefined,
  flexibilityCode: DateFlexibilityCode,
): DateWindow => {
  if (flexibilityCode === 'UNDECIDED') {
    return { start: null, end: null };
  }

  const preferred = dateOnly(preferredMoveDate);
  if (!preferred) {
    throw new Error(
      'A preferred move date is required for this flexibility code',
    );
  }

  if (flexibilityCode === 'EXACT_DATE') {
    return { start: preferred, end: preferred };
  }
  if (flexibilityCode === 'PLUS_MINUS_1_DAY') {
    return {
      start: shiftDate(preferred, -1),
      end: shiftDate(preferred, 1),
    };
  }
  if (flexibilityCode === 'PLUS_MINUS_3_DAYS') {
    return {
      start: shiftDate(preferred, -3),
      end: shiftDate(preferred, 3),
    };
  }

  const selected = new Date(`${preferred}T00:00:00.000Z`);
  const daysSinceMonday = (selected.getUTCDay() + 6) % 7;
  const start = shiftDate(preferred, -daysSinceMonday);
  return { start, end: shiftDate(start, 6) };
};

export const isValidDateFlexibilityWindow = (
  preferredMoveDate: Date | string | null | undefined,
  flexibilityCode: DateFlexibilityCode | null,
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
): boolean => {
  if (flexibilityCode === null) {
    return windowStart == null && windowEnd == null;
  }
  if (flexibilityCode === 'UNDECIDED') {
    const start = dateOnly(windowStart);
    const end = dateOnly(windowEnd);
    return (
      (start === null && end === null) ||
      (start !== null && end !== null && start <= end)
    );
  }

  try {
    const expected = deriveDateWindow(
      preferredMoveDate,
      flexibilityCode,
    );
    return (
      dateOnly(windowStart) === expected.start &&
      dateOnly(windowEnd) === expected.end
    );
  } catch {
    return false;
  }
};

const RESTRICTED_NOTE_CONTENT =
  /(?:<[^>]*>|https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d(?:[\s()+.-]*\d){6,}\b|\b(?:mahalle(?:si)?|mah\.?|sokak|sok\.?|cadde|cad\.?|bulvar(?:ı)?|apartman(?:ı)?|kapı|daire\s*\d+|no\s*:)\b)/iu;

export const isSafeRestrictionNote = (
  value: unknown,
): value is string | null | undefined => {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= 500 &&
    !RESTRICTED_NOTE_CONTENT.test(normalized)
  );
};
