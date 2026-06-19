import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierExtraServiceCapability } from '../../../domain/entities/CarrierExtraServiceCapability';
import { CarrierRepository, CarrierSearchFilters, CarrierSearchRepositoryItem, CarrierSearchSort } from '../../../infrastructure/repositories/CarrierRepository';
import { AppDataSource } from '../../../infrastructure/database/data-source';
import { PRODUCT_SCOPE_OF_WORK_NAMES } from '../../../infrastructure/repositories/ScopeOfWorkRepository';

export interface CarrierSearchQuery {
	city?: string;
	serviceAreas?: string[];
	vehicleTypeId?: string;
	vehicleTypeIds?: string[];
	scopes?: string[] | string;
	scope?: string;
	scopeIds?: string[] | string;
	loadTypes?: string[] | string;
	minRating?: number;
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
	isVerified: boolean;
	catalogExtraServiceIds: string[];
	scopes: Array<'sehirici' | 'sehirlerarasi'>;
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
	private readonly SCOPE_SLUG_TO_NAME: Record<string, string> = {
		sehirici: 'Şehir İçi',
		sehirlerarasi: 'Şehirler Arası',
	};
	private readonly PRODUCT_SCOPE_NAMES = new Set<string>(PRODUCT_SCOPE_OF_WORK_NAMES);
	private readonly UNSUPPORTED_SCOPE_FILTER = '__unsupported_scope__';

	async search(query: CarrierSearchQuery | Record<string, unknown>): Promise<CarrierSearchResponseDto> {
		const filters = this.normalizeFilters(query);
		const { total, items } = await this.carrierRepository.searchCarriers(filters);
		const catalogExtraServicesByCarrier = await this.fetchCatalogExtraServiceIds(items.map(item => item.carrier.id));
		return {
			total,
			limit: filters.limit,
			offset: filters.offset,
			items: items.map(item => this.mapToDto(item, catalogExtraServicesByCarrier.get(item.carrier.id) ?? []))
		};
	}

	async getAvailabilitySummary(date: string): Promise<{ total: number; available: number }> {
		return this.carrierRepository.countByAvailableDate(date);
	}

	async getAvailabilitySummaryForQuery(query: Record<string, unknown>): Promise<{ total: number; available: number }> {
		const date = typeof query.date === 'string' ? query.date.trim() : '';
		const serviceCity = typeof query.serviceCity === 'string' ? query.serviceCity.trim() : undefined;
		const scopeFilters = this.normalizeScopeValues((query as any).scope ?? (query as any).scopes ?? (query as any).scopeIds);
		return this.carrierRepository.countByAvailableDate(date, serviceCity || undefined, scopeFilters);
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
		const baseCity = toText((query as any).city);

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

		const parseScopeIds = (value: unknown): string[] | undefined => {
			if (typeof value === 'string' && value.trim()) {
				return value.split(',').map(s => s.trim()).filter(Boolean);
			}
			if (Array.isArray(value)) {
				return (value as string[]).map(s => String(s).trim()).filter(Boolean);
			}
			return undefined;
		};

		const { scopeIds, scopeNames } = this.normalizeScopeValues((query as any).scope ?? (query as any).scopes ?? (query as any).scopeIds);

		const ALLOWED_LOAD_TYPES = new Set(['HOME', 'OFFICE', 'PARTIAL', 'STORAGE']);
		const loadTypeValues = parseScopeIds((query as any).loadTypes) ?? [];
		const loadTypes = loadTypeValues
			.map(v => String(v).trim().toUpperCase())
			.filter(v => ALLOWED_LOAD_TYPES.has(v));

		const isVerifiedRaw = (query as any).isVerified;
		const isVerified = isVerifiedRaw === true || isVerifiedRaw === '1' || isVerifiedRaw === 'true'
			? true
			: undefined;

		return {
			city: baseCity,
			serviceCity,
			serviceDistrict,
			serviceAreas,
			vehicleTypeIds,
			minRating: toNumber((query as any).minRating),
			minExperienceYears: toInt((query as any).minExperienceYears),
			minProfileCompletion: toInt((query as any).minProfileCompletion),
			minCapacityKg: toInt((query as any).minCapacityKg),
			maxCapacityKg: toInt((query as any).maxCapacityKg),
			searchText: toText((query as any).searchText),
			availableDate: toText((query as any).availableDate),
			scopeIds,
			scopeNames,
			loadTypes: loadTypes.length ? loadTypes : undefined,
			isVerified,
			sortBy: this.parseSort((query as any).sortBy),
			limit,
			offset
		};
	}

	private normalizeScopeValues(value: unknown): Pick<CarrierSearchFilters, 'scopeIds' | 'scopeNames'> {
		const parseScopeValues = (raw: unknown): string[] => {
			if (typeof raw === 'string' && raw.trim()) {
				return raw.split(',').map(s => s.trim()).filter(Boolean);
			}
			if (Array.isArray(raw)) {
				return raw
					.flatMap(entry => String(entry).split(','))
					.map(s => s.trim())
					.filter(Boolean);
			}
			return [];
		};

		const isUuid = (candidate: string): boolean =>
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate);

		const scopeValues = parseScopeValues(value);
		const normalizedScopeNames = scopeValues
			.filter(scopeValue => !isUuid(scopeValue))
			.map(scopeValue => this.SCOPE_SLUG_TO_NAME[scopeValue] ?? scopeValue)
			.map(scopeName => this.PRODUCT_SCOPE_NAMES.has(scopeName) ? scopeName : this.UNSUPPORTED_SCOPE_FILTER)
			.filter(Boolean);
		const scopeIds = scopeValues.filter(isUuid);
		const scopeNames = normalizedScopeNames.length
			? Array.from(new Set(normalizedScopeNames))
			: undefined;

		return {
			scopeIds: scopeIds.length ? scopeIds : undefined,
			scopeNames
		};
	}

	private parseSort(value: unknown): CarrierSearchSort | undefined {
		const allowed: CarrierSearchSort[] = ['rating', 'experience', 'recent'];
		if (typeof value !== 'string') return undefined;
		return allowed.includes(value as CarrierSearchSort) ? (value as CarrierSearchSort) : undefined;
	}

	private async fetchCatalogExtraServiceIds(carrierIds: string[]): Promise<Map<string, string[]>> {
		const uniqueCarrierIds = Array.from(new Set(carrierIds.filter(Boolean)));
		if (uniqueCarrierIds.length === 0) return new Map();

		const rows = await AppDataSource.getRepository(CarrierExtraServiceCapability)
			.createQueryBuilder('capability')
			.select('capability.carrierId', 'carrierId')
			.addSelect('capability.extraServiceId', 'extraServiceId')
			.where('capability.carrierId IN (:...carrierIds)', { carrierIds: uniqueCarrierIds })
			.andWhere('capability.isActive = :isActive', { isActive: true })
			.getRawMany<{ carrierId: string; extraServiceId: string }>();

		const grouped = new Map<string, Set<string>>();
		rows.forEach((row) => {
			if (!row.carrierId || !row.extraServiceId) return;
			const bucket = grouped.get(row.carrierId) ?? new Set<string>();
			bucket.add(row.extraServiceId);
			grouped.set(row.carrierId, bucket);
		});

		return new Map(Array.from(grouped.entries()).map(([carrierId, serviceIds]) => [carrierId, Array.from(serviceIds)]));
	}

	private mapToDto(item: CarrierSearchRepositoryItem, catalogExtraServiceIds: string[]): CarrierSearchResultDto {
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
			reviewCount: item.reviewCount ?? 0,
			vehicleSummary,
			serviceAreas,
			startingPrice: item.minPrice ?? null,
			experienceYears,
			profileCompletion,
			pictureUrl: carrier.pictureUrl ?? null,
			isVerified: carrier.verifiedByAdmin === true,
			catalogExtraServiceIds,
			scopes: this.mapScopeLinksToSlugs(carrier)
		};
	}

	private mapScopeLinksToSlugs(carrier: Carrier): Array<'sehirici' | 'sehirlerarasi'> {
		const slugs = (carrier.scopeLinks || [])
			.map(link => link.scope?.name)
			.map(name => {
				if (name === this.SCOPE_SLUG_TO_NAME.sehirici || name === 'Şehir İçi') return 'sehirici';
				if (name === this.SCOPE_SLUG_TO_NAME.sehirlerarasi || name === 'Şehirler Arası') return 'sehirlerarasi';
				return undefined;
			})
			.filter(Boolean) as Array<'sehirici' | 'sehirlerarasi'>;

		return Array.from(new Set(slugs));
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
