import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CITIES_TR, getDistrictsForCity, formatDateYYYYMMDD } from '@/lib/locations';
import { RotateCcw, MapPin, Truck, Star, SlidersHorizontal, ArrowUpDown, Filter, Check, Search, Package, CalendarDays, Award, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
	CarrierSearchFilters,
	DEFAULT_CARRIER_FILTERS,
	MIN_EXPERIENCE_OPTIONS,
	CarrierSearchSort
} from '@/lib/carrierSearch';

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
	{ label: 'En deneyimliler', value: 'experience' },
	{ label: 'En yeni', value: 'recent' }
];

const ANY_VALUE = '__all__';
const HIGH_RATING_VALUE = '4';

const SCOPE_OPTIONS = [
	{ id: 'sehirici', label: 'Şehir İçi' },
	{ id: 'sehirlerarasi', label: 'Şehirler Arası' }
];

const LOAD_TYPE_OPTIONS = [
	{ value: 'HOME', label: 'Ev Eşyası' },
	{ value: 'OFFICE', label: 'Ofis' },
	{ value: 'PARTIAL', label: 'Parça Eşya' },
	{ value: 'STORAGE', label: 'Depolama' }
];

const CarrierFilters = ({ filters, onChange, hideHeader }: CarrierFiltersProps) => {
	const { user } = useAuth();
	const isCustomer = user?.type === 'customer';
	const [vehicleOptions, setVehicleOptions] = useState<VehicleTypeOption[]>([]);
	const [vehiclesLoading, setVehiclesLoading] = useState(false);
	const [districtOptions, setDistrictOptions] = useState<string[]>([]);
	const [searchDraft, setSearchDraft] = useState(filters.searchText ?? '');

	const serviceCityValue = filters.serviceCity && filters.serviceCity.trim().length > 0 ? filters.serviceCity : ANY_VALUE;
	const serviceDistrictValue = filters.serviceDistrict && filters.serviceDistrict.trim().length > 0 ? filters.serviceDistrict : ANY_VALUE;
	const todayStr = formatDateYYYYMMDD(new Date());

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
				// sessiz hata - chip listesi boş kalır
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
				return;
			}
			const list = await getDistrictsForCity(filters.serviceCity);
			if (!ignore) setDistrictOptions(list);
		};
		loadDistricts();
		return () => { ignore = true; };
	}, [filters.serviceCity]);

	useEffect(() => {
		setSearchDraft(filters.searchText ?? '');
	}, [filters.searchText]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			const trimmed = searchDraft.trim();
			if ((filters.searchText ?? '') !== trimmed) {
				onChange({ ...filters, searchText: trimmed });
			}
		}, 400);

		return () => window.clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchDraft]);

	const handleServiceCityChange = (value: string) => {
		const val = value === ANY_VALUE ? undefined : value;
		onChange({ ...filters, serviceCity: val, serviceDistrict: undefined });
	};

	const handleServiceDistrictChange = (value: string) => {
		const val = value === ANY_VALUE ? undefined : value;
		onChange({ ...filters, serviceDistrict: val });
	};

	const toggleArrayValue = (field: 'vehicleTypeIds' | 'loadTypes' | 'scopes', id: string) => {
		const current = filters[field] ?? [];
		const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
		onChange({ ...filters, [field]: next });
	};

	const highRatingActive = filters.minRating === HIGH_RATING_VALUE;
	const toggleHighRating = () => {
		onChange({ ...filters, minRating: highRatingActive ? undefined : HIGH_RATING_VALUE });
	};

	const handleExperienceChange = (value: number) => {
		onChange({ ...filters, minExperience: filters.minExperience === value ? undefined : value });
	};

	const resetFilters = () => {
		setSearchDraft('');
		onChange({ ...DEFAULT_CARRIER_FILTERS, serviceAreas: [], vehicleTypeIds: [], scopes: [], loadTypes: [] });
	};

	const chipClass = (active: boolean) =>
		`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-bold transition-all duration-200 ${active
			? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200'
			: 'border-[#E2E8F0] bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
		}`;

	return (
		<div className="bg-white/40 backdrop-blur-md rounded-[32px] overflow-hidden">
			{!hideHeader && (
				<div className="flex items-center gap-2 px-6 py-5 border-b border-[#F1F5F9] bg-white/50">
					<div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
						<SlidersHorizontal className="h-4 w-4" />
					</div>
					<h3 className="font-black text-[#0F172A] text-[15px] uppercase tracking-wider">Arama Filtreleri</h3>
				</div>
			)}

			<div className="p-6 space-y-9">
				<div className="relative">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
					<Input
						value={searchDraft}
						onChange={e => setSearchDraft(e.target.value)}
						placeholder="Firma adı ara..."
						className="h-12 pl-11 rounded-2xl border-[#F1F5F9] bg-white font-medium"
					/>
				</div>



				<FilterSection icon={<MapPin className="h-3.5 w-3.5" />} title="Konum ve Hizmet">
					<div className="grid gap-4 flex-1">
						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Hizmet Verdiği İl</Label>
							<Select value={serviceCityValue} onValueChange={handleServiceCityChange}>
								<SelectTrigger className="h-11 rounded-2xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
									<SelectValue placeholder="İl Seçiniz" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>Tüm İller</SelectItem>
									{CITIES_TR.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">İlçe</Label>
							<Select value={serviceDistrictValue} onValueChange={handleServiceDistrictChange} disabled={!filters.serviceCity}>
								<SelectTrigger className="h-11 rounded-2xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
									<SelectValue placeholder={!filters.serviceCity ? 'Önce İl Seçin' : 'İlçe Seçiniz'} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>Tüm İlçeler</SelectItem>
									{districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3 pt-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Çalışma Kapsamı</Label>
							<div className="space-y-3">
								{SCOPE_OPTIONS.map(opt => (
									<div key={opt.id} className="flex items-center space-x-3 group">
										<Checkbox
											id={`scope-${opt.id}`}
											checked={filters.scopes?.includes(opt.id) ?? false}
											onCheckedChange={() => toggleArrayValue('scopes', opt.id)}
											className="w-5 h-5 rounded-lg border-[#CBD5E1] data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
										/>
										<label htmlFor={`scope-${opt.id}`} className="text-sm font-bold text-slate-600 group-hover:text-slate-900 cursor-pointer transition-colors leading-none">
											{opt.label}
										</label>
									</div>
								))}
							</div>
						</div>
					</div>
				</FilterSection>

				<FilterSection icon={<Package className="h-3.5 w-3.5" />} title="Yük Tipi">
					<div className="flex flex-wrap gap-2">
						{LOAD_TYPE_OPTIONS.map(opt => {
							const active = (filters.loadTypes ?? []).includes(opt.value);
							return (
								<button
									key={opt.value}
									type="button"
									aria-pressed={active}
									onClick={() => toggleArrayValue('loadTypes', opt.value)}
									className={chipClass(active)}
								>
									{active && <Check className="h-3.5 w-3.5" />}
									{opt.label}
								</button>
							);
						})}
					</div>
				</FilterSection>



				<FilterSection icon={<CalendarDays className="h-3.5 w-3.5" />} title="Müsaitlik">
					<div className="space-y-2">
						<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Bu Tarihte Müsait Olanlar</Label>
						<Input
							type="date"
							min={todayStr}
							value={filters.availableDate ?? ''}
							onChange={e => onChange({ ...filters, availableDate: e.target.value || undefined })}
							className="h-11 rounded-2xl border-[#F1F5F9] bg-white"
						/>
						{filters.availableDate && (
							<button
								type="button"
								onClick={() => onChange({ ...filters, availableDate: undefined })}
								className="text-[11px] font-bold text-slate-400 hover:text-blue-600 underline pl-1 transition-colors"
							>
								Tarih filtresini temizle
							</button>
						)}
					</div>
				</FilterSection>

				<FilterSection icon={<Filter className="h-3.5 w-3.5" />} title="Filtreler">
					<div className="space-y-4">
						<button
							type="button"
							aria-pressed={highRatingActive}
							onClick={toggleHighRating}
							className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200 ${highRatingActive
								? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-sm'
								: 'border-[#F1F5F9] bg-white text-slate-600 hover:border-blue-200'
							}`}
						>
							<span className="flex items-center gap-2.5">
								<Star className={`h-4 w-4 ${highRatingActive ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
								<span className="text-sm font-bold">4+ Puanlı Firmalar</span>
							</span>
							{highRatingActive && <Check className="h-4 w-4" />}
						</button>



						<div className="space-y-2">
							<Label className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">
								<Award className="h-3.5 w-3.5" /> Deneyim
							</Label>
							<div className="flex flex-wrap gap-2">
								{MIN_EXPERIENCE_OPTIONS.map(opt => {
									const active = filters.minExperience === opt.value;
									return (
										<button
											key={opt.value}
											type="button"
											aria-pressed={active}
											onClick={() => handleExperienceChange(opt.value)}
											className={chipClass(active)}
										>
											{active && <Check className="h-3.5 w-3.5" />}
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						{isCustomer && (
							<div className="flex items-center justify-between rounded-2xl border border-[#F1F5F9] bg-white px-4 py-3">
								<div className="space-y-0.5">
									<Label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
										<Heart className="h-4 w-4 text-red-400" /> Sadece Favorilerim
									</Label>
									<p className="text-[10px] text-slate-400 font-medium">Kaydettiğiniz firmalar</p>
								</div>
								<Switch
									checked={filters.favoritesOnly ?? false}
									onCheckedChange={(c) => onChange({ ...filters, favoritesOnly: c })}
									className="data-[state=checked]:bg-blue-600"
								/>
							</div>
						)}
					</div>
				</FilterSection>

				<Button
					variant="secondary"
					className="w-full mt-8 bg-[#F8FAFC] text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-2xl h-12 font-bold text-sm shadow-sm"
					onClick={resetFilters}
				>
					<RotateCcw className="h-4 w-4 mr-2" />
					Tüm Filtreleri Sıfırla
				</Button>
			</div>
		</div>
	);
};

function FilterSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2.5 px-1">
				<div className="w-7 h-7 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 shrink-0 shadow-sm">
					{icon}
				</div>
				<span className="font-black text-sm text-[#1E293B] uppercase tracking-wide">{title}</span>
			</div>
			{children}
		</div>
	);
}

export default CarrierFilters;
