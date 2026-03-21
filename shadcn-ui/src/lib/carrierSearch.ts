import { CarrierSearchItem } from './types';

export type CarrierSearchSort = 'rating' | 'price' | 'experience' | 'profile' | 'recent';

export interface CarrierSearchFilters {
	searchText?: string;
	city?: string;
	serviceAreas: string[];
	vehicleTypeIds: string[];
	minRating?: string;
	priceRange?: {
		min?: number;
		max?: number;
	};
	minExperience?: number;
	minCapacityKg?: number;
	onlyCompleteProfiles?: boolean;
	sortBy?: CarrierSearchSort;
	serviceCity?: string;
	serviceDistrict?: string;
	// New Filters
	scopes?: string[];
	loadTypes?: string[];
	minProfileCompletion?: number;
	isVerified?: boolean;
	hasProfilePicture?: boolean;
	minReviewCount?: number;
	maxCapacityKg?: number;
}

export interface CarrierSearchResponse {
	total: number;
	limit: number;
	offset: number;
	items: CarrierSearchItem[];
}

export const DEFAULT_CARRIER_FILTERS: CarrierSearchFilters = {
	searchText: '',
	city: '',
	serviceAreas: [],
	vehicleTypeIds: [],
	minRating: '',
	priceRange: undefined,
	minExperience: undefined,
	minCapacityKg: undefined,
	maxCapacityKg: undefined,
	onlyCompleteProfiles: false,
	sortBy: 'rating',
	serviceCity: undefined,
	serviceDistrict: undefined,
	scopes: [],
	loadTypes: [],
	minProfileCompletion: undefined,
	isVerified: false,
	hasProfilePicture: false,
	minReviewCount: undefined
};

export const MIN_EXPERIENCE_OPTIONS = [
	{ label: '1+ yıl', value: 1 },
	{ label: '3+ yıl', value: 3 },
	{ label: '5+ yıl', value: 5 },
	{ label: '10+ yıl', value: 10 }
];

export const MIN_RATING_OPTIONS = [
	{ label: '3.0+', value: '3' },
	{ label: '4.0+', value: '4' },
	{ label: '4.5+', value: '4.5' }
];

const API_BASE_URL = '/api/v1';

const appendParam = (params: URLSearchParams, key: string, value?: string | number | boolean | null) => {
	if (value === undefined || value === null) return;
	const trimmed = String(value).trim();
	if (!trimmed) return;
	params.set(key, trimmed);
};

const textOrUndefined = (value?: string | null): string | undefined => {
	if (value === undefined || value === null) return undefined;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : undefined;
};

const splitCommaValues = (value?: string | null): string[] => {
	if (!value) return [];
	return value
		.split(',')
		.map(segment => segment.trim())
		.filter(Boolean);
};

const parseArrayParam = (params: URLSearchParams, key: string): string[] => {
	const collected = new Set<string>();
	const multiValues = params.getAll(key);
	if (multiValues.length) {
		multiValues.forEach(entry => {
			splitCommaValues(entry).forEach(value => collected.add(value));
		});
	}
	return Array.from(collected);
};

const parseVehicleTypeIdsParam = (params: URLSearchParams): string[] => {
	const collected = new Set<string>();
	const multiValues = params.getAll('vehicleTypeIds');
	if (multiValues.length) {
		multiValues.forEach(entry => {
			splitCommaValues(entry).forEach(value => collected.add(value));
		});
	}
	const legacySingle = params.get('vehicleTypeId');
	splitCommaValues(legacySingle).forEach(value => collected.add(value));
	return Array.from(collected);
};

const parseNumber = (value?: string | null): number | undefined => {
	if (value === undefined || value === null || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSort = (value?: string | null): CarrierSearchSort => {
	const allowed: CarrierSearchSort[] = ['rating', 'price', 'experience', 'profile', 'recent'];
	return allowed.includes(value as CarrierSearchSort) ? (value as CarrierSearchSort) : 'rating';
};

export const filtersFromParams = (params: URLSearchParams): CarrierSearchFilters => {
	const base: CarrierSearchFilters = {
		...DEFAULT_CARRIER_FILTERS,
		serviceAreas: [...(DEFAULT_CARRIER_FILTERS.serviceAreas ?? [])]
	};
	const serviceAreas = params.getAll('serviceAreas');
	const legacyServiceArea = params.get('serviceArea');
	const minPrice = parseNumber(params.get('minPrice'));
	const maxPrice = parseNumber(params.get('maxPrice'));
	const onlyComplete = params.get('onlyCompleteProfiles');

	return {
		...base,
		searchText: params.get('searchText') ?? base.searchText,
		city: params.get('city') ?? base.city,
		serviceAreas: serviceAreas.length
			? serviceAreas.filter(Boolean)
			: legacyServiceArea
				? legacyServiceArea.split(',').map(segment => segment.trim()).filter(Boolean)
				: base.serviceAreas,
		vehicleTypeIds: (() => {
			const parsed = parseVehicleTypeIdsParam(params);
			return parsed.length ? parsed : [...base.vehicleTypeIds];
		})(),
		minRating: params.get('minRating') ?? base.minRating,
		priceRange: minPrice !== undefined || maxPrice !== undefined
			? { min: minPrice, max: maxPrice }
			: undefined,
		minExperience: parseNumber(params.get('minExperienceYears')),
		minCapacityKg: parseNumber(params.get('minCapacityKg')),
		maxCapacityKg: parseNumber(params.get('maxCapacityKg')),
		onlyCompleteProfiles: onlyComplete === '1' || onlyComplete === 'true',
		sortBy: parseSort(params.get('sortBy')),
		serviceCity: textOrUndefined(params.get('serviceCity')),
		serviceDistrict: textOrUndefined(params.get('serviceDistrict')),

		// New
		scopes: parseArrayParam(params, 'scopes'),
		loadTypes: parseArrayParam(params, 'loadTypes'),
		minProfileCompletion: parseNumber(params.get('minProfileCompletion')),
		isVerified: params.get('isVerified') === '1',
		hasProfilePicture: params.get('hasProfilePicture') === '1',
		minReviewCount: parseNumber(params.get('minReviewCount'))
	};
};

export const filtersToParams = (filters: CarrierSearchFilters): URLSearchParams => {
	const params = new URLSearchParams();
	appendParam(params, 'searchText', filters.searchText);
	appendParam(params, 'city', filters.city);
	filters.serviceAreas.forEach(area => {
		if (area.trim()) params.append('serviceAreas', area.trim());
	});
	if (filters.vehicleTypeIds.length) {
		appendParam(params, 'vehicleTypeIds', filters.vehicleTypeIds.join(','));
	}
	appendParam(params, 'minRating', filters.minRating);
	if (filters.priceRange) {
		if (filters.priceRange.min !== undefined) appendParam(params, 'minPrice', filters.priceRange.min);
		if (filters.priceRange.max !== undefined) appendParam(params, 'maxPrice', filters.priceRange.max);
	}
	appendParam(params, 'minExperienceYears', filters.minExperience);
	appendParam(params, 'minCapacityKg', filters.minCapacityKg);
	appendParam(params, 'maxCapacityKg', filters.maxCapacityKg);

	if (filters.onlyCompleteProfiles) {
		appendParam(params, 'onlyCompleteProfiles', '1');
	}
	appendParam(params, 'sortBy', filters.sortBy ?? 'rating');
	appendParam(params, 'serviceCity', filters.serviceCity);
	appendParam(params, 'serviceDistrict', filters.serviceDistrict);

	// New
	if (filters.scopes?.length) params.append('scopes', filters.scopes.join(','));
	if (filters.loadTypes?.length) params.append('loadTypes', filters.loadTypes.join(','));
	appendParam(params, 'minProfileCompletion', filters.minProfileCompletion);
	if (filters.isVerified) appendParam(params, 'isVerified', '1');
	if (filters.hasProfilePicture) appendParam(params, 'hasProfilePicture', '1');
	appendParam(params, 'minReviewCount', filters.minReviewCount);

	return params;
};

export const filtersToApiParams = (filters: CarrierSearchFilters, limit: number, offset: number): URLSearchParams => {
	const params = new URLSearchParams();
	appendParam(params, 'searchText', filters.searchText);
	appendParam(params, 'city', filters.city);
	filters.serviceAreas.forEach(area => {
		if (area.trim()) params.append('serviceAreas', area.trim());
	});
	if (filters.vehicleTypeIds.length) {
		appendParam(params, 'vehicleTypeIds', filters.vehicleTypeIds.join(','));
	}
	appendParam(params, 'minRating', filters.minRating);
	if (filters.priceRange) {
		if (filters.priceRange.min !== undefined) appendParam(params, 'minPrice', filters.priceRange.min);
		if (filters.priceRange.max !== undefined) appendParam(params, 'maxPrice', filters.priceRange.max);
	}
	appendParam(params, 'minExperienceYears', filters.minExperience);
	appendParam(params, 'minCapacityKg', filters.minCapacityKg);
	appendParam(params, 'maxCapacityKg', filters.maxCapacityKg);

	if (filters.onlyCompleteProfiles) {
		// Legacy support
		appendParam(params, 'minProfileCompletion', 70);
	} else {
		appendParam(params, 'minProfileCompletion', filters.minProfileCompletion);
	}

	if (filters.isVerified) appendParam(params, 'isVerified', '1');
	if (filters.hasProfilePicture) appendParam(params, 'hasProfilePicture', '1');
	appendParam(params, 'minReviewCount', filters.minReviewCount);

	if (filters.scopes?.length) params.append('scopes', filters.scopes.join(','));
	if (filters.loadTypes?.length) params.append('loadTypes', filters.loadTypes.join(','));

	appendParam(params, 'sortBy', filters.sortBy ?? 'rating');
	appendParam(params, 'serviceCity', filters.serviceCity);
	appendParam(params, 'serviceDistrict', filters.serviceDistrict);
	params.set('limit', String(limit));
	params.set('offset', String(offset));
	return params;
};

export const fetchCarrierSearch = async (
	filters: CarrierSearchFilters,
	limit: number,
	offset: number,
	signal?: AbortSignal
): Promise<CarrierSearchResponse> => {
	const params = filtersToApiParams(filters, limit, offset);
	const response = await fetch(`${API_BASE_URL}/carriers/search?${params.toString()}`, {
		signal,
		headers: { 'accept': 'application/json' }
	});
	const json = await response.json();
	if (!response.ok || !json?.success) {
		throw new Error(json?.message || 'Nakliyeci listesi getirilemedi');
	}
	return json.data as CarrierSearchResponse;
};
