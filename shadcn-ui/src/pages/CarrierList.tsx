import { useMemo } from 'react';
import logoImg from '@/images/logo.png';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import CarrierFilters from '@/components/carriers/CarrierFilters';
import {
	CarrierSearchFilters,
	filtersFromParams,
	filtersToParams,
	fetchCarrierSearch,
	type CarrierSearchResponse
} from '@/lib/carrierSearch';
import { CarrierSearchItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { ArrowRight, Award, MapPin, SearchX, Shield, Star, Truck, Zap, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const HIGHLIGHT_LIMIT = 12;

/* ── helpers ── */
const slugify = (value: string): string =>
	value.toLowerCase()
		.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
		.replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
		.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'nakliyeci';

const num = (v: unknown, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb; };

export default function CarrierList() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
	const filterKey = useMemo(() => filtersToParams(filters).toString(), [filters]);
	
	const { data, isLoading, isError, error, isFetching } = useQuery<CarrierSearchResponse>({
		queryKey: ['carrier-search-highlight', filterKey],
		queryFn: ({ signal }) => fetchCarrierSearch(filters, HIGHLIGHT_LIMIT, 0, signal),
		placeholderData: keepPreviousData
	});

	const handleFilterChange = (nextFilters: CarrierSearchFilters) => {
		const params = filtersToParams(nextFilters);
		setSearchParams(params, { replace: true });
	};

	const handleViewAll = () => {
		const params = filtersToParams(filters);
		navigate({ pathname: '/nakliyeciler/tumu', search: params.toString() });
	};

	const carriers = data?.items ?? [];
	const total = data?.total ?? 0;
	const hasResults = carriers.length > 0;

	return (
		<div className="bg-[#F8FAFC] min-h-screen pb-24 font-['Plus_Jakarta_Sans',_sans-serif]">
			{/* ═══ ENHANCED HERO HEADER ═══ */}
			<section className="relative overflow-hidden bg-white pb-12 sm:pb-20 pt-8 sm:pt-12">
				{/* Modern Mesh Gradient Background */}
				<div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
					<div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50/60 blur-[120px]" />
					<div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-50/50 blur-[100px]" />
					<div className="absolute top-[20%] left-[30%] w-[30%] h-[30%] rounded-full bg-sky-50/40 blur-[90px]" />
				</div>

				<div className="max-w-[1400px] mx-auto px-6 relative z-10">
					<div className="flex flex-col lg:flex-row items-center justify-between gap-12">
						<motion.div 
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, ease: "easeOut" }}
							className="max-w-3xl"
						>
							<div className="inline-flex items-center gap-2 bg-blue-50/80 backdrop-blur-md border border-blue-100 rounded-full px-4 py-1.5 mb-8 shadow-sm">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
								</span>
								<span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest letter-spacing-1">Güvenilir Nakliyat Ağı</span>
							</div>

							<h1 className="text-4xl md:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.1] mb-6">
								Yükünüz İçin En Doğru<br />
								<span className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
									Nakliyeciyi Bulun
									<svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-100 -z-10" viewBox="0 0 400 20" fill="none">
										<path d="M5 15C50 15 150 5 400 15" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
									</svg>
								</span>
							</h1>

							<p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10 font-medium">
								Taşıburada ile yüzlerce onaylı, puanlanmış ve profesyonel nakliyeci arasından güvenle seçim yapın. Zaman ve fiyattan tasarruf edin.
							</p>

							<div className="flex flex-wrap gap-4">
								<div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
									<div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
										<CheckCircle2 className="w-5 h-5" />
									</div>
									<span className="text-sm font-semibold text-slate-700">Onaylı Profiller</span>
								</div>
								<div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
									<div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
										<Star className="w-5 h-5 fill-amber-500 text-amber-500" />
									</div>
									<span className="text-sm font-semibold text-slate-700">Başarılı İşlemler</span>
								</div>
							</div>
						</motion.div>

						<motion.div 
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.8, delay: 0.2 }}
							className="hidden lg:block relative"
						>
							<div className="relative w-[480px] h-[340px] bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] shadow-2xl overflow-hidden p-8 flex flex-col justify-between group">
								{/* Decorative Elements */}
								<div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/15 transition-colors duration-500" />
								<div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
								
								<div className="relative z-10 flex justify-between items-start">
									<div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-visible">
										<img src={logoImg} alt="Taşıburada" className="w-10 h-10 object-contain brightness-0 invert scale-[2.2] origin-center" />
									</div>
									<div className="text-right">
										<div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Aktif Nakliyeci</div>
										<div className="text-3xl font-black text-white">{total.toLocaleString()}+</div>
									</div>
								</div>

								<div className="relative z-10">
									<h3 className="text-2xl font-bold text-white mb-2 leading-tight">Taşıburada Güvencesiyle<br />Hemen Yola Çıkın</h3>
									<div className="flex items-center gap-2 text-white/80 text-sm font-medium">
										<Shield className="w-4 h-4 text-sky-300" /> Tüm taşımalar sigorta kapsamında
									</div>
								</div>

								{/* Glass Card Floating */}
								<motion.div 
									animate={{ y: [0, -10, 0] }}
									transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
									className="absolute top-1/2 -right-12 w-48 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white"
								>
									<div className="flex items-center gap-3 mb-3">
										<div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-white">
											<div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">TB</div>
										</div>
										<div className="flex-1 min-w-0">
											<div className="h-2 w-16 bg-slate-200 rounded mb-1.5" />
											<div className="h-2 w-10 bg-slate-100 rounded" />
										</div>
									</div>
									<div className="space-y-2">
										<div className="h-1.5 w-full bg-blue-50 rounded-full overflow-hidden">
											<motion.div initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ duration: 1, delay: 1 }} className="h-full bg-blue-500" />
										</div>
										<div className="text-[10px] font-bold text-blue-600 text-right">%80 Güven Skoru</div>
									</div>
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ═══ MAIN CONTENT GRID ═══ */}
			<div className="max-w-[1400px] mx-auto px-6 pt-12 flex flex-col lg:flex-row gap-10">
				
				{/* ── LEFT: REFINED GLASS FILTER PANEL ── */}
				<aside className="w-full lg:w-[320px] shrink-0">
					<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[32px] border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
						<div className="p-1">
							<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
						</div>
					</div>
				</aside>

				{/* ── RIGHT: RESULTS ── */}
				<main className="flex-1 min-w-0">
					{/* Results Header */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 backdrop-blur-sm bg-[#F8FAFC]/50 py-2">
						<div>
							<div className="inline-flex items-center gap-2 mb-2">
								<Zap className="w-4 h-4 text-blue-500" />
								<span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Pazar Alanı</span>
							</div>
							<h2 className="text-2xl font-extrabold text-[#1E293B]">
								{isFetching ? (
									<span className="inline-block w-10 h-8 bg-slate-200 animate-pulse rounded-lg align-middle" />
								) : total} Profesyonel Nakliyeci
							</h2>
						</div>
						
						<div className="flex items-center gap-3">
							{total > HIGHLIGHT_LIMIT && (
								<button 
									onClick={handleViewAll} 
									className="group h-12 px-6 inline-flex items-center justify-center rounded-2xl font-bold text-sm transition-all bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 shadow-sm hover:shadow-md"
								>
									Tümünü Keşfet <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
								</button>
							)}
						</div>
					</div>

					{/* Error State */}
					{isError && (
						<motion.div 
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-red-50 border border-red-100 rounded-[28px] p-6 mb-8 text-sm text-red-700 flex items-center gap-4 shadow-sm"
						>
							<div className="w-12 h-12 flex items-center justify-center bg-red-100 text-red-600 rounded-2xl shrink-0">
								<SearchX className="w-6 h-6" />
							</div>
							<div>
								<p className="font-bold text-red-900 mb-0.5">Bir şeyler ters gitti</p>
								<p className="text-red-600">{(error as Error)?.message || 'Bağlantı sorunu yaşanıyor.'}</p>
							</div>
						</motion.div>
					)}

					{/* Content / Loader */}
					<AnimatePresence mode="wait">
						{isLoading ? (
							<motion.div 
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="grid grid-cols-1 md:grid-cols-2 gap-6"
							>
								{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
							</motion.div>
						) : hasResults ? (
							<motion.div 
								key="results"
								initial="hidden"
								animate="visible"
								variants={{
									visible: { transition: { staggerChildren: 0.1 } }
								}}
								className="grid grid-cols-1 md:grid-cols-2 gap-6"
							>
								{carriers.map(c => (
									<motion.div 
										key={c.id}
										variants={{
											hidden: { opacity: 0, y: 20 },
											visible: { opacity: 1, y: 0 }
										}}
									>
										<InlineCarrierCard carrier={c} navigate={navigate} />
									</motion.div>
								))}
							</motion.div>
						) : (
							<motion.div 
								key="empty"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="text-center py-24 px-8 bg-white border border-slate-100 rounded-[40px] shadow-sm relative overflow-hidden"
							>
								{/* Decorative backdrop for empty state */}
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-60" />
								
								<div className="relative z-10 font-['Plus_Jakarta_Sans',_sans-serif]">
									<div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-[32px] mx-auto mb-6 shadow-inner">
										<SearchX className="w-10 h-10 text-slate-300" />
									</div>
									<h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Eşleşme Bulunamadı</h3>
									<p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
										Filtreleme kriterlerinizi genişleterek daha fazla sonuç elde edebilirsiniz.
									</p>
									<button
										onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}
										className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-95"
									>
										Tüm Filtreleri Temizle
									</button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* LOAD MORE / NAVIGATION */}
					{hasResults && total > HIGHLIGHT_LIMIT && (
						<div className="flex justify-center mt-16 pt-10 border-t border-slate-100">
							<button 
								onClick={handleViewAll} 
								className="group relative h-14 px-10 inline-flex items-center justify-center rounded-2xl font-bold text-base transition-all bg-[#0F172A] text-white overflow-hidden hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-[#0F172A]/20"
							>
								<div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<span className="relative z-10 flex items-center gap-3">
									Tüm Listeyi Gör 
									<ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
								</span>
							</button>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

/* ═══ PREMIUM CARRIER CARD ═══ */
function InlineCarrierCard({ carrier, navigate }: { carrier: CarrierSearchItem; navigate: ReturnType<typeof useNavigate> }) {
	const initials = carrier.companyName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
	const slug = slugify(carrier.companyName);
	const detailPath = `/nakliyeciler/${carrier.id}/${slug}`;
	const ratingValue = num(carrier.rating);
	const priceLabel = typeof carrier.startingPrice === 'number' ? `₺${formatPrice(carrier.startingPrice)}` : null;
	const isVerified = (carrier.profileCompletion || 0) > 70;
	const expYears = num(carrier.experienceYears, NaN);
	const experienceText = Number.isFinite(expYears) ? `${expYears} Yıl` : null;
	const serviceAreas = carrier.serviceAreas || [];

	return (
		<div
			onClick={() => navigate(detailPath)}
			className="group bg-white border border-[#F1F5F9] rounded-[32px] p-6 cursor-pointer transition-all duration-500 hover:shadow-[0_24px_48px_rgba(30,41,59,0.08)] hover:-translate-y-2 hover:border-blue-100 flex flex-col h-full relative overflow-hidden"
		>
			{/* Subtle Glow Effect on Hover */}
			<div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50/40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

			{/* Main Content */}
			<div className="relative z-10">
				{/* Top Branding */}
				<div className="flex items-start justify-between mb-5">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-[22px] bg-[#F8FAFC] border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500 ring-1 ring-slate-100/50">
							{carrier.pictureUrl
								? <img src={carrier.pictureUrl} alt={carrier.companyName} className="w-full h-full object-cover" />
								: <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#334155] flex items-center justify-center text-white text-xl font-black">{initials}</div>}
						</div>
						<div className="min-w-0">
							<h3 className="text-lg font-bold text-[#0F172A] truncate leading-tight group-hover:text-blue-600 transition-colors mb-1">{carrier.companyName}</h3>
							<div className="flex items-center gap-1.5 text-slate-400">
								<MapPin className="w-3.5 h-3.5 fill-slate-400/10" />
								<span className="text-[13px] font-semibold text-slate-500">{carrier.city || "Şehir Belirtilmedi"}</span>
							</div>
						</div>
					</div>
					
					{isVerified && (
						<div className="mt-1">
							<Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-black text-[10px] tracking-widest uppercase flex items-center gap-1 hover:bg-emerald-100 transition-colors">
								<CheckCircle2 className="w-3 h-3" /> P-ONAYLI
							</Badge>
						</div>
					)}
				</div>

				{/* Rating & Exp Row */}
				<div className="flex items-center gap-3 mb-6 bg-[#F8FAFC] p-2 rounded-2xl border border-[#F1F5F9]">
					<div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-50">
						<Star className="w-4 h-4 text-amber-500 fill-amber-500" />
						<span className="text-sm font-black text-slate-800">{ratingValue.toFixed(1)}</span>
						<span className="text-xs font-bold text-slate-400">({carrier.reviewCount})</span>
					</div>
					<Separator orientation="vertical" className="h-4" />
					<div className="flex items-center gap-1.5 text-slate-600">
						<Award className="w-3.5 h-3.5 text-blue-500" />
						<span className="text-xs font-bold">{experienceText || "Hızlı"} Deneyim</span>
					</div>
				</div>

				{/* Service Area / Vehicle Summary */}
				<div className="space-y-4">
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 bg-blue-50/80 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
							<Truck className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hizmet Aracı</div>
							<p className="text-[13px] font-bold text-slate-700 truncate">{carrier.vehicleSummary || "Standart Filo"}</p>
						</div>
					</div>

					{serviceAreas.length > 0 && (
						<div className="flex flex-wrap gap-1.5 pt-1">
							{serviceAreas.slice(0, 3).map(area => (
								<span key={area} className="px-3 py-1 rounded-lg bg-white border border-slate-100 text-[11px] font-bold text-slate-500 shadow-sm">
									{area}
								</span>
							))}
							{serviceAreas.length > 3 && <span className="text-[11px] font-bold text-slate-300 ml-1">+{serviceAreas.length - 3}</span>}
						</div>
					)}
				</div>
			</div>

			<div className="mt-auto pt-6">
				<div className="flex items-end justify-between">
					<div className="flex flex-col">
						{priceLabel ? (
							<>
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">BAŞLANGIÇ</span>
								<span className="text-2xl font-black text-[#0F172A] tracking-tighter leading-none">{priceLabel}</span>
							</>
						) : (
							<span className="text-sm font-bold text-slate-400 italic">Teklif Alınız</span>
						)}
					</div>
					
					<button 
						className="relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium text-gray-900 rounded-2xl group border-2 border-blue-600 transition-all duration-300 hover:border-transparent"
						onClick={e => { e.stopPropagation(); navigate(detailPath); }}
					>
						<span className="relative px-5 py-2 transition-all ease-in duration-300 bg-white dark:bg-gray-900 rounded-xl group-hover:bg-blue-600 group-hover:text-white font-bold">
							Detaylar
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}

function SkeletonCard() {
	return (
		<div className="bg-white border border-slate-100 rounded-[32px] p-6 h-[340px] animate-pulse">
			<div className="flex gap-4 mb-6">
				<div className="w-16 h-16 bg-slate-100 rounded-[22px]" />
				<div className="flex-1 pt-2 space-y-2">
					<div className="h-4 w-3/4 bg-slate-100 rounded-md" />
					<div className="h-3 w-1/4 bg-slate-50 rounded-md" />
				</div>
			</div>
			<div className="h-12 bg-slate-50 rounded-2xl mb-6" />
			<div className="space-y-4">
				<div className="h-10 bg-slate-50 rounded-xl" />
				<div className="flex gap-2">
					{[1,2,3].map(i => <div key={i} className="h-6 w-16 bg-slate-50 rounded-lg" />)}
				</div>
			</div>
			<div className="mt-auto pt-6 flex justify-between items-end">
				<div className="space-y-2"><div className="h-3 w-12 bg-slate-50 rounded" /><div className="h-6 w-24 bg-slate-100 rounded" /></div>
				<div className="h-12 w-32 bg-slate-100 rounded-2xl" />
			</div>
		</div>
	);
}

