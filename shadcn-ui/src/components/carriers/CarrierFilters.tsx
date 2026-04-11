import { useEffect, useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import MultiSelect from '@/components/ui/multi-select';
import { CITIES_TR, getDistrictsForCity } from '@/lib/locations';
import { FilterIcon, RotateCcw, MapPin, Truck, Box, Shield, Star, Award, SlidersHorizontal } from 'lucide-react';
import {
	CarrierSearchFilters,
	DEFAULT_CARRIER_FILTERS,
	MIN_EXPERIENCE_OPTIONS,
	MIN_RATING_OPTIONS,
	CarrierSearchSort
} from '@/lib/carrierSearch';
import { Separator } from '@/components/ui/separator';

interface VehicleTypeOption {
	value: string;
	label: string;
}

interface VehicleTypeApiItem {
	id: number;
	name: string;
}

interface CarrierFiltersProps {
	filters: CarrierSearchFilters;
	onChange: (next: CarrierSearchFilters) => void;
	hideHeader?: boolean;
}

const SORT_OPTIONS: { label: string; value: CarrierSearchSort }[] = [
	{ label: 'En yüksek puan', value: 'rating' },
	{ label: 'En uygun fiyat', value: 'price' },
	{ label: 'En deneyimliler', value: 'experience' },
	{ label: 'Profil tamamlanma', value: 'profile' },
	{ label: 'En yeni', value: 'recent' }
];

const ANY_VALUE = '__all__';
const LOADING_VALUE = '__loading__';

// Hardcoded for frontend-only filtering if backend supports it, otherwise useful for UI demo
const SCOPE_OPTIONS = [
	{ id: 'sehirici', label: 'Şehir İçi' },
	{ id: 'sehirlerarasi', label: 'Şehirler Arası' },
	{ id: 'uluslararasi', label: 'Uluslararası' }
];

const LOAD_TYPE_OPTIONS = [
	{ id: 'ev-esyasi', label: 'Ev Eşyası' },
	{ id: 'ofis', label: 'Ofis Taşıma' },
	{ id: 'parsiyel', label: 'Parsiyel' },
	{ id: 'komple', label: 'Komple Yük' },
	{ id: 'hassas', label: 'Hassas Yük' },
	{ id: 'agir', label: 'Ağır Yük' }
];

const PROFILE_COMPLETION_OPTIONS = [
	{ value: 25, label: '%25+' },
	{ value: 50, label: '%50+' },
	{ value: 75, label: '%75+' },
	{ value: 100, label: '%100' }
];

const CarrierFilters = ({ filters, onChange, hideHeader }: CarrierFiltersProps) => {
	const [vehicleOptions, setVehicleOptions] = useState<VehicleTypeOption[]>([]);
	const [vehiclesLoading, setVehiclesLoading] = useState(false);
	const [districtOptions, setDistrictOptions] = useState<string[]>([]);
	const [districtsLoading, setDistrictsLoading] = useState(false);

	const serviceCityValue = filters.serviceCity && filters.serviceCity.trim().length > 0 ? filters.serviceCity : ANY_VALUE;
	const serviceDistrictValue = filters.serviceDistrict && filters.serviceDistrict.trim().length > 0 ? filters.serviceDistrict : ANY_VALUE;

	const vehicleOptionMap = useMemo(() => {
		return vehicleOptions.reduce((acc, option) => {
			acc[option.value] = option.label;
			return acc;
		}, {} as Record<string, string>);
	}, [vehicleOptions]);

	useEffect(() => {
		let ignore = false;
		const fetchVehicleTypes = async () => {
			setVehiclesLoading(true);
			try {
				const res = await fetch('/api/v1/vehicle-types');
				const json = await res.json();
				if (!ignore && res.ok && Array.isArray(json?.data)) {
					setVehicleOptions(json.data.map((item: VehicleTypeApiItem) => ({ value: String(item.id), label: item.name })));
				}
			} catch {
			} finally {
				if (!ignore) setVehiclesLoading(false);
			}
		};
		fetchVehicleTypes();
		return () => { ignore = true; };
	}, []);

	useEffect(() => {
		let ignore = false;
		const loadDistricts = async () => {
			if (!filters.serviceCity) {
				setDistrictOptions([]);
				setDistrictsLoading(false);
				return;
			}
			setDistrictsLoading(true);
			try {
				const list = await getDistrictsForCity(filters.serviceCity);
				if (!ignore) setDistrictOptions(list);
			} catch {
				if (!ignore) setDistrictOptions([]);
			} finally {
				if (!ignore) setDistrictsLoading(false);
			}
		};
		loadDistricts();
		return () => { ignore = true; };
	}, [filters.serviceCity]);

	// Handlers
	const handleServiceCityChange = (value: string) => {
		const val = value === ANY_VALUE ? undefined : value;
		onChange({ ...filters, serviceCity: val, serviceDistrict: undefined });
	};

	const handleServiceDistrictChange = (value: string) => {
		const val = value === ANY_VALUE ? undefined : value;
		onChange({ ...filters, serviceDistrict: val });
	};

	const handleVehicleTypeMultiChange = (values: string[]) => {
		onChange({ ...filters, vehicleTypeIds: values });
	};

	const handleMinCapacityChange = (val: string) => {
		const v = Number(val);
		onChange({ ...filters, minCapacityKg: v > 0 ? v : undefined });
	};

	const handleMaxCapacityChange = (val: string) => {
		const v = Number(val);
		onChange({ ...filters, maxCapacityKg: v > 0 ? v : undefined });
	};

	const handleCheckboxChange = (field: 'scopes' | 'loadTypes', id: string, checked: boolean) => {
		const current = filters[field] ?? [];
		if (checked) {
			onChange({ ...filters, [field]: [...current, id] });
		} else {
			onChange({ ...filters, [field]: current.filter(x => x !== id) });
		}
	};

	const resetFilters = () => {
		onChange({ ...DEFAULT_CARRIER_FILTERS, serviceAreas: [], vehicleTypeIds: [], scopes: [], loadTypes: [] });
	};

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-transparent">
			{!hideHeader && (
				<div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
					<SlidersHorizontal className="h-4 w-4 text-blue-600" />
					<h3 className="font-bold text-slate-800 text-[15px]">Filtreleme Seçenekleri</h3>
				</div>
			)}

			<div className="p-5 space-y-8">

				{/* 1. KONUM & HİZMET ALANI */}
				<section className="space-y-4">
					<div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
						<div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
							<MapPin className="h-3.5 w-3.5" />
						</div>
						<span className="font-semibold text-sm text-slate-800">Konum ve Hizmet Bölgesi</span>
					</div>

					<div className="grid gap-3 flex-1">
						<div className="space-y-1.5">
							<Label className="text-xs text-slate-500">Hizmet Verdiği İl</Label>
							<Select value={serviceCityValue} onValueChange={handleServiceCityChange}>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="İl Seçiniz" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>Tüm İller</SelectItem>
									{CITIES_TR.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-slate-500">İlçe</Label>
							<Select value={serviceDistrictValue} onValueChange={handleServiceDistrictChange} disabled={!filters.serviceCity}>
								<SelectTrigger className="h-9">
									<SelectValue placeholder={!filters.serviceCity ? 'Önce İl Seçin' : 'İlçe Seçiniz'} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>Tüm İlçeler</SelectItem>
									{districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2 pt-2">
							<Label className="text-xs text-slate-500 block mb-1.5">Çalışma Kapsamı</Label>
							<div className="space-y-2">
								{SCOPE_OPTIONS.map(opt => (
									<div key={opt.id} className="flex items-center space-x-2">
										<Checkbox
											id={`scope-${opt.id}`}
											checked={filters.scopes?.includes(opt.id) ?? false}
											onCheckedChange={(c) => handleCheckboxChange('scopes', opt.id, c as boolean)}
										/>
										<label htmlFor={`scope-${opt.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
											{opt.label}
										</label>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				{/* 2. ARAÇ & KAPASİTE */}
				<section className="space-y-4">
					<div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
						<div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
							<Truck className="h-3.5 w-3.5" />
						</div>
						<span className="font-semibold text-sm text-slate-800">Araç ve Kapasite</span>
					</div>

					<div className="space-y-3">
						<MultiSelect
							label="Araç Tipleri"
							placeholder={vehiclesLoading ? "Yükleniyor..." : "Seçiniz"}
							options={vehicleOptionMap}
							selectedValues={filters.vehicleTypeIds ?? []}
							onSelectionChange={handleVehicleTypeMultiChange}
						/>

						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1.5">
								<Label className="text-xs text-slate-500">Min. Kapasite (kg)</Label>
								<Input
									type="number"
									placeholder="0"
									className="h-9"
									value={filters.minCapacityKg ?? ''}
									onChange={e => handleMinCapacityChange(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs text-slate-500">Maks. Kapasite (kg)</Label>
								<Input
									type="number"
									placeholder="Max"
									className="h-9"
									value={filters.maxCapacityKg ?? ''}
									onChange={e => handleMaxCapacityChange(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</section>

				{/* 3. HİZMET TÜRLERİ */}
				<section className="space-y-4">
					<div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
						<div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
							<Box className="h-3.5 w-3.5" />
						</div>
						<span className="font-semibold text-sm text-slate-800">Hizmet Türleri</span>
					</div>
					<div className="grid grid-cols-2 gap-2">
						{LOAD_TYPE_OPTIONS.map(opt => (
							<div key={opt.id} className="flex items-center space-x-2">
								<Checkbox
									id={`load-${opt.id}`}
									checked={filters.loadTypes?.includes(opt.id) ?? false}
									onCheckedChange={(c) => handleCheckboxChange('loadTypes', opt.id, c as boolean)}
								/>
								<label htmlFor={`load-${opt.id}`} className="text-xs font-medium leading-none">
									{opt.label}
								</label>
							</div>
						))}
					</div>
				</section>

				{/* 4. PROFİL VE GÜVEN */}
				<section className="space-y-4">
					<div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
						<div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
							<Shield className="h-3.5 w-3.5" />
						</div>
						<span className="font-semibold text-sm text-slate-800">Profil ve Güvenilirlik</span>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-normal">Onaylı Hesaplar</Label>
							<Switch
								checked={filters.isVerified ?? false}
								onCheckedChange={(c) => onChange({ ...filters, isVerified: c })}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label className="text-sm font-normal">Profil Fotoğraflı</Label>
							<Switch
								checked={filters.hasProfilePicture ?? false}
								onCheckedChange={(c) => onChange({ ...filters, hasProfilePicture: c })}
							/>
						</div>

						<div className="space-y-1.5 pt-1">
							<Label className="text-xs text-slate-500">Profil Tamamlanma</Label>
							<div className="flex gap-1">
								{PROFILE_COMPLETION_OPTIONS.map(opt => {
									const isSelected = filters.minProfileCompletion === opt.value;
									return (
										<button
											key={opt.value}
											onClick={() => onChange({ ...filters, minProfileCompletion: isSelected ? undefined : opt.value })}
											className={`flex-1 text-xs py-1.5 rounded border transition-colors ${isSelected
													? 'bg-blue-600 text-white border-blue-600'
													: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
												}`}
										>
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</section>

				{/* 5. PUAN & SIRALAMA */}
				<section className="space-y-4">
					<div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100">
						<div className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
							<AuthorIcon className="h-3.5 w-3.5" />
						</div>
						<span className="font-semibold text-sm text-slate-800">Puan ve Sıralama</span>
					</div>

					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label className="text-xs text-slate-500">Minimum Puan</Label>
							<Select value={filters.minRating ?? ANY_VALUE} onValueChange={(v) => onChange({ ...filters, minRating: v === ANY_VALUE ? undefined : v })}>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="Farketmez" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>Farketmez</SelectItem>
									{MIN_RATING_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs text-slate-500">Sıralama</Label>
							<Select value={filters.sortBy ?? 'rating'} onValueChange={(v) => onChange({ ...filters, sortBy: v as any })}>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
					</div>
				</section>

				<Button variant="outline" className="w-full mt-6 bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-none rounded-xl h-10" onClick={resetFilters}>
					<RotateCcw className="h-3.5 w-3.5 mr-2 text-slate-400" />
					Filtreleri Temizle
				</Button>
			</div>
		</div>
	);
};

// Simple helper icon
const AuthorIcon = (props: any) => <Star {...props} />;

export default CarrierFilters;
