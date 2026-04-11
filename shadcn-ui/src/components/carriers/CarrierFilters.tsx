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
import { FilterIcon, RotateCcw, MapPin, Truck, Box, Shield, Star, Award, SlidersHorizontal, ChevronRight, Zap } from 'lucide-react';
import {
	CarrierSearchFilters,
	DEFAULT_CARRIER_FILTERS,
	MIN_EXPERIENCE_OPTIONS,
	MIN_RATING_OPTIONS,
	CarrierSearchSort
} from '@/lib/carrierSearch';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';

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

				{/* 1. KONUM & HİZMET ALANI */}
				<FilterSection 
					icon={<MapPin className="h-3.5 w-3.5" />} 
					title="Konum ve Hizmet"
				>
					<div className="grid gap-4 flex-1">
						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Hizmet Verdiği İl</Label>
							<Select value={serviceCityValue} onValueChange={handleServiceCityChange}>
								<SelectTrigger className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
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
								<SelectTrigger className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
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
											onCheckedChange={(c) => handleCheckboxChange('scopes', opt.id, c as boolean)}
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

				{/* 2. ARAÇ & KAPASİTE */}
				<FilterSection 
					icon={<Truck className="h-3.5 w-3.5" />} 
					title="Araç ve Kapasite"
				>
					<div className="space-y-4">
						<MultiSelect
							label="Araç Tipleri"
							placeholder={vehiclesLoading ? "Yükleniyor..." : "Seçiniz"}
							options={vehicleOptionMap}
							selectedValues={filters.vehicleTypeIds ?? []}
							onSelectionChange={handleVehicleTypeMultiChange}
						/>

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Min. (kg)</Label>
								<Input
									type="number"
									placeholder="0"
									className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white"
									value={filters.minCapacityKg ?? ''}
									onChange={e => handleMinCapacityChange(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Maks. (kg)</Label>
								<Input
									type="number"
									placeholder="Max"
									className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white"
									value={filters.maxCapacityKg ?? ''}
									onChange={e => handleMaxCapacityChange(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</FilterSection>

				{/* 3. SIRALAMA & PUAN */}
				<FilterSection 
					icon={<Zap className="h-3.5 w-3.5" />} 
					title="Sıralama ve Puan"
				>
					<div className="space-y-5">
						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Tercih Sıralaması</Label>
							<Select value={filters.sortBy ?? 'rating'} onValueChange={(v) => onChange({ ...filters, sortBy: v as any })}>
								<SelectTrigger className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center justify-between px-1">
							<div className="space-y-0.5">
								<Label className="text-sm font-bold text-slate-700">Onaylı Hesaplar</Label>
								<p className="text-[10px] text-slate-400 font-medium">Sadece doğrulanmış profiller</p>
							</div>
							<Switch
								checked={filters.isVerified ?? false}
								onCheckedChange={(c) => onChange({ ...filters, isVerified: c })}
								className="data-[state=checked]:bg-blue-600"
							/>
						</div>

						<div className="space-y-2 pt-1">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Min. Puan</Label>
							<div className="flex gap-1.5 p-1 bg-slate-50 rounded-2xl border border-[#F1F5F9]">
								{MIN_RATING_OPTIONS.map(opt => {
									const isSelected = filters.minRating === opt.value;
									return (
										<button
											key={opt.value}
											onClick={() => onChange({ ...filters, minRating: isSelected ? undefined : opt.value })}
											className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-300 ${isSelected
													? 'bg-white text-blue-600 shadow-sm border border-slate-100 scale-105'
													: 'text-slate-400 hover:text-slate-600'
												}`}
										>
											<Star className={`w-3.5 h-3.5 mb-1 ${isSelected ? 'fill-blue-600' : ''}`} />
											<span className="text-[10px] font-black tracking-tighter">{opt.label}</span>
										</button>
									);
								})}
							</div>
						</div>
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

/* ── HELPERS: SECTION COMPONENT ── */
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
