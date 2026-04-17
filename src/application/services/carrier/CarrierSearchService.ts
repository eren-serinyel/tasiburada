import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierRepository, CarrierSearchFilters, CarrierSearchRepositoryItem, CarrierSearchSort } from '../../../infrastructure/repositories/CarrierRepository';

export interface CarrierSearchQuery {
	city?: string;
	serviceAreas?: string[];
	vehicleTypeId?: string;
	vehicleTypeIds?: string[];
	minRating?: number;
	minPrice?: number;
	maxPrice?: number;
	minExperienceYears?: number;
	minProfileCompletion?: number;
	minCapacityKg?: number;
	searchText?: string;
	serviceCity?: string;
	serviceDistrict?: string;
	availableDate?: string;
	sortBy?: CarrierSearchSort;
	limit?: number;
	offset?: number;
}

export interface CarrierSearchResultDto {
	id: string;
	companyName: string;
	city: string | null;
	rating: number;
	reviewCount: number;
	vehicleSummary: string | null;
	serviceAreas: string[];
	startingPrice: number | null;
	experienceYears: number | null;
	profileCompletion: number | null;
	pictureUrl: string | null;
}

export interface CarrierSearchResponseDto {
	total: number;
	limit: number;
	offset: number;
	items: CarrierSearchResultDto[];
}

export class CarrierSearchService {
	private carrierRepository = new CarrierRepository();
	private readonly DEFAULT_LIMIT = 3;
	private readonly MAX_LIMIT = 50;

	async search(query: CarrierSearchQuery | Record<string, unknown>): Promise<CarrierSearchResponseDto> {
		const filters = this.normalizeFilters(query);
		const { total, items } = await this.carrierRepository.searchCarriers(filters);
		return {
			total,
			limit: filters.limit,
			offset: filters.offset,
			items: items.map(item => this.mapToDto(item))
		};
	}

	async getAvailabilitySummary(date: string): Promise<{ total: number; available: number }> {
		return this.carrierRepository.countByAvailableDate(date);
	}

	private normalizeFilters(query: CarrierSearchQuery | Record<string, unknown>): CarrierSearchFilters {
		const toNumber = (value: unknown): number | undefined => {
			if (value === undefined || value === null || value === '') return undefined;
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : undefined;
		};

		const toInt = (value: unknown): number | undefined => {
			const num = toNumber(value);
			return num !== undefined ? Math.floor(num) : undefined;
		};

		const toText = (value: unknown): string | undefined => {
			if (typeof value !== 'string') return undefined;
			const trimmed = value.trim();
			return trimmed.length ? trimmed : undefined;
		};

		const parseVehicleTypeIds = (value: unknown): string[] => {
			const collected: string[] = [];
			const pushValue = (candidate: unknown) => {
				const trimmed = toText(candidate);
				if (trimmed !== undefined) collected.push(trimmed);
			};

			if (Array.isArray(value)) {
				value.forEach(entry => {
					if (typeof entry === 'string') {
						entry.split(',').map(segment => segment.trim()).filter(Boolean).forEach(pushValue);
					} else {
						pushValue(entry);
					}
				});
			} else if (typeof value === 'string') {
				value.split(',').map(segment => segment.trim()).filter(Boolean).forEach(pushValue);
			} else {
				pushValue(value);
			}

			return collected;
		};

		const serviceAreas = Array.isArray((query as any).serviceAreas)
			? ((query as any).serviceAreas as string[]).filter(Boolean)
			: typeof (query as any).serviceArea === 'string'
				? (query as any).serviceArea.split(',').map((val: string) => val.trim()).filter(Boolean)
				: undefined;

		const serviceCity = toText((query as any).serviceCity);
		const serviceDistrict = toText((query as any).serviceDistrict);
		const baseCity = toText((query as any).city) ?? serviceCity;

		const vehicleTypeIdsFromQuery = parseVehicleTypeIds((query as any).vehicleTypeIds);
		const singleVehicleTypeId = toText((query as any).vehicleTypeId);
		if (singleVehicleTypeId !== undefined) {
			vehicleTypeIdsFromQuery.push(singleVehicleTypeId);
		}
		const vehicleTypeIdsSet = Array.from(new Set(vehicleTypeIdsFromQuery));
		const vehicleTypeIds = vehicleTypeIdsSet.length ? vehicleTypeIdsSet : undefined;

		const limit = Math.min(
			Math.max(toInt((query as any).limit) ?? this.DEFAULT_LIMIT, 1),
			this.MAX_LIMIT
		);
		const offset = Math.max(toInt((query as any).offset) ?? 0, 0);

		return {
			city: baseCity,
			serviceCity,
			serviceDistrict,
			serviceAreas,
			vehicleTypeIds,
			minRating: toNumber((query as any).minRating),
			minPrice: toNumber((query as any).minPrice),
			maxPrice: toNumber((query as any).maxPrice),
			minExperienceYears: toInt((query as any).minExperienceYears),
			minProfileCompletion: toInt((query as any).minProfileCompletion),
			minCapacityKg: toInt((query as any).minCapacityKg),
			searchText: toText((query as any).searchText),
			availableDate: toText((query as any).availableDate),
			sortBy: this.parseSort((query as any).sortBy),
			limit,
			offset
		};
	}

	private parseSort(value: unknown): CarrierSearchSort | undefined {
		const allowed: CarrierSearchSort[] = ['rating', 'price', 'experience', 'profile', 'recent'];
		if (typeof value !== 'string') return undefined;
		return allowed.includes(value as CarrierSearchSort) ? (value as CarrierSearchSort) : undefined;
	}

	private mapToDto(item: CarrierSearchRepositoryItem): CarrierSearchResultDto {
		const carrier = item.carrier;
		const city = carrier.activity?.city ?? null;
		const serviceAreas = Array.isArray(carrier.activity?.serviceAreasJson)
			? carrier.activity?.serviceAreasJson ?? []
			: [];
		const experienceYears = this.computeExperience(carrier);
		const profileCompletion = carrier.profileStatus?.overallPercentage ?? null;	
		const vehicleSummary = this.buildVehicleSummary(carrier);
		return {
			id: carrier.id,
			companyName: carrier.companyName,
			city,
			rating: carrier.rating ?? 0,
			reviewCount: item.offerCount ?? carrier.totalOffers ?? 0,
			vehicleSummary,
			serviceAreas,
			startingPrice: item.minPrice ?? null,
			experienceYears,
			profileCompletion,
			pictureUrl: carrier.pictureUrl ?? null
		};
	}

	private computeExperience(carrier: Carrier): number | null {
		if (!carrier.foundedYear) return null;
		const currentYear = new Date().getFullYear();
		return Math.max(0, currentYear - carrier.foundedYear);
	}

	private buildVehicleSummary(carrier: Carrier): string | null {
		const vehicles = carrier.vehicleTypeLinks || [];
		if (!vehicles.length) return null;
		const primary = vehicles[0];
		const name = primary.vehicleType?.name || '';
		const capacity = Number(primary.capacityKg ?? primary.vehicleType?.defaultCapacityKg ?? 0);
		const capacityText = capacity > 0 ? ` (${capacity}kg)` : '';
		return name ? `${name.toUpperCase()}${capacityText}` : null;
	}
}
