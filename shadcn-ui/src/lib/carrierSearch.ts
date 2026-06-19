import { CarrierSearchItem } from './types';

// DEĞİŞİKLİK (Nakliyeci #3):
// 'price' ve 'profile' sıralamaları kaldırıldı.
//  - price: Carrier'ın genel fiyat verisi yok (Offer shipment-bazlı,
//    repository'de price filtreleri zaten yorum satırı). Ölü/yanıltıcı seçenekti.
//  - profile: İç metrik, müşteriye anlamsız. Profil dolu firmaları öne
//    çıkarmak istenirse backend'de rating sıralamasına gizli ağırlık eklenir.
// Eski URL'lerden gelen ?sortBy=price / ?sortBy=profile değerleri
// parseSort içinde 'rating'e map edilir — paylaşılan linkler kırılmaz.
export type CarrierSearchSort = 'rating' | 'experience' | 'recent';

export interface CarrierSearchFilters {
	searchText?: string;
	city?: string;
	serviceAreas: string[];
	vehicleTypeIds: string[];
	minRating?: string;
	minExperience?: number;
	minCapacityKg?: number;
	maxCapacityKg?: number;
	sortBy?: CarrierSearchSort;
	serviceCity?: string;
	serviceDistrict?: string;
	availableDate?: string;
	scopes?: string[];
	loadTypes?: string[];
	isVerified?: boolean;
	hasProfilePicture?: boolean;
	minReviewCount?: number;
	/** Client-side filtre — API'ye gönderilmez, CarrierList/CarrierDirectory içinde uygulanır. */
	favoritesOnly?: boolean;
	/** @deprecated Kullanılmıyor — CarrierDirectory gibi eski tüketiciler için tipte tutuluyor. */
	priceRange?: { min?: number; max?: number };
	/** @deprecated Kullanılmıyor. */
	onlyCompleteProfiles?: boolean;
	/** @deprecated Kullanılmıyor. */
	minProfileCompletion?: number;
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
	minExperience: undefined,
	minCapacityKg: undefined,
	maxCapacityKg: undefined,
	sortBy: 'rating',
	serviceCity: undefined,
	serviceDistrict: undefined,
	availableDate: undefined,
	scopes: [],
	loadTypes: [],
	isVerified: false,
	hasProfilePicture: false,
	minReviewCount: undefined,
	favoritesOnly: false
};

export const MIN_EXPERIENCE_OPTIONS = [
	{ label: '1+ yıl', value: 1 },
	{ label: '3+ yıl', value: 3 },
	{ label: '5+ yıl', value: 5 },
	{ label: '10+ yıl', value: 10 }
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
	const allowed: CarrierSearchSort[] = ['rating', 'experience', 'recent'];
	if (allowed.includes(value as CarrierSearchSort)) return value as CarrierSearchSort;
	// Legacy: eski paylaşılan linklerdeki price/profile değerleri rating'e düşer
	return 'rating';
};

export const filtersFromParams = (params: URLSearchParams): CarrierSearchFilters => {
	const base: CarrierSearchFilters = {
		...DEFAULT_CARRIER_FILTERS,
		serviceAreas: [...(DEFAULT_CARRIER_FILTERS.serviceAreas ?? [])]
	};
	const serviceAreas = params.getAll('serviceAreas');
	const legacyServiceArea = params.get('serviceArea');

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
		minExperience: parseNumber(params.get('minExperienceYears')),
		minCapacityKg: parseNumber(params.get('minCapacityKg')),
		maxCapacityKg: parseNumber(params.get('maxCapacityKg')),
		sortBy: parseSort(params.get('sortBy')),
		serviceCity: textOrUndefined(params.get('serviceCity')),
		serviceDistrict: textOrUndefined(params.get('serviceDistrict')),
		availableDate: textOrUndefined(params.get('availableDate')),
		scopes: parseArrayParam(params, 'scopes'),
		loadTypes: parseArrayParam(params, 'loadTypes'),
		isVerified: params.get('isVerified') === '1',
		hasProfilePicture: params.get('hasProfilePicture') === '1',
		minReviewCount: parseNumber(params.get('minReviewCount')),
		favoritesOnly: params.get('favorites') === '1'
	};
};

const appendCommonParams = (params: URLSearchParams, filters: CarrierSearchFilters) => {
	appendParam(params, 'searchText', filters.searchText);
	appendParam(params, 'city', filters.city);
	filters.serviceAreas.forEach(area => {
		if (area.trim()) params.append('serviceAreas', area.trim());
	});
	if (filters.vehicleTypeIds.length) {
		appendParam(params, 'vehicleTypeIds', filters.vehicleTypeIds.join(','));
	}
	appendParam(params, 'minRating', filters.minRating);
	appendParam(params, 'minExperienceYears', filters.minExperience);
	appendParam(params, 'minCapacityKg', filters.minCapacityKg);
	appendParam(params, 'maxCapacityKg', filters.maxCapacityKg);
	appendParam(params, 'sortBy', filters.sortBy ?? 'rating');
	appendParam(params, 'serviceCity', filters.serviceCity);
	appendParam(params, 'serviceDistrict', filters.serviceDistrict);
	appendParam(params, 'availableDate', filters.availableDate);
	if (filters.scopes?.length) params.append('scopes', filters.scopes.join(','));
	if (filters.loadTypes?.length) params.append('loadTypes', filters.loadTypes.join(','));
	if (filters.isVerified) appendParam(params, 'isVerified', '1');
	if (filters.hasProfilePicture) appendParam(params, 'hasProfilePicture', '1');
	appendParam(params, 'minReviewCount', filters.minReviewCount);
};

export const filtersToParams = (filters: CarrierSearchFilters): URLSearchParams => {
	const params = new URLSearchParams();
	appendCommonParams(params, filters);
	if (filters.favoritesOnly) params.set('favorites', '1');
	return params;
};

export const filtersToApiParams = (filters: CarrierSearchFilters, limit: number, offset: number): URLSearchParams => {
	const params = new URLSearchParams();
	appendCommonParams(params, filters);
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
