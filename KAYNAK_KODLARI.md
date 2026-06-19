# Kaynak Kodlari

Bu tek sayfalik dosya, Claude veya baska bir modele direkt aktarilmak uzere hazirlandi.
Format: once dosya yolu basligi, altinda o dosyanin kaynak kodu.

Not: Istenen `src/application/services/CarrierSearchService.ts` yolu bu repoda yok; dogru dosya `src/application/services/carrier/CarrierSearchService.ts` olarak eklendi.

---

## shadcn-ui/src/pages/CarrierList.tsx:

````tsx
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

/* â”€â”€ helpers â”€â”€ */
const slugify = (value: string): string =>
	value.toLowerCase()
		.replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ä±/g, 'i')
		.replace(/Ã¶/g, 'o').replace(/ÅŸ/g, 's').replace(/Ã¼/g, 'u')
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
			{/* â•â•â• ENHANCED HERO HEADER â•â•â• */}
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
								<span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest letter-spacing-1">GÃ¼venilir Nakliyat AÄŸÄ±</span>
							</div>

							<h1 className="text-4xl md:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.1] mb-6">
								YÃ¼kÃ¼nÃ¼z Ä°Ã§in En DoÄŸru<br />
								<span className="relative text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
									Nakliyeciyi Bulun
									<svg className="absolute -bottom-2 left-0 w-full h-3 text-blue-100 -z-10" viewBox="0 0 400 20" fill="none">
										<path d="M5 15C50 15 150 5 400 15" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
									</svg>
								</span>
							</h1>

							<p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10 font-medium">
								TaÅŸÄ±burada ile yÃ¼zlerce onaylÄ±, puanlanmÄ±ÅŸ ve profesyonel nakliyeci arasÄ±ndan gÃ¼venle seÃ§im yapÄ±n. Zaman ve fiyattan tasarruf edin.
							</p>

							<div className="flex flex-wrap gap-4">
								<div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
									<div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
										<CheckCircle2 className="w-5 h-5" />
									</div>
									<span className="text-sm font-semibold text-slate-700">OnaylÄ± Profiller</span>
								</div>
								<div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
									<div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
										<Star className="w-5 h-5 fill-amber-500 text-amber-500" />
									</div>
									<span className="text-sm font-semibold text-slate-700">BaÅŸarÄ±lÄ± Ä°ÅŸlemler</span>
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
										<img src={logoImg} alt="TaÅŸÄ±burada" className="w-10 h-10 object-contain brightness-0 invert scale-[2.2] origin-center" />
									</div>
									<div className="text-right">
										<div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Aktif Nakliyeci</div>
										<div className="text-3xl font-black text-white">{total.toLocaleString()}+</div>
									</div>
								</div>

								<div className="relative z-10">
									<h3 className="text-2xl font-bold text-white mb-2 leading-tight">TaÅŸÄ±burada GÃ¼vencesiyle<br />Hemen Yola Ã‡Ä±kÄ±n</h3>
									<div className="flex items-center gap-2 text-white/80 text-sm font-medium">
										<Shield className="w-4 h-4 text-sky-300" /> TÃ¼m taÅŸÄ±malar sigorta kapsamÄ±nda
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
										<div className="text-[10px] font-bold text-blue-600 text-right">%80 GÃ¼ven Skoru</div>
									</div>
								</motion.div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* â•â•â• MAIN CONTENT GRID â•â•â• */}
			<div className="max-w-[1400px] mx-auto px-6 pt-12 flex flex-col lg:flex-row gap-10">
				
				{/* â”€â”€ LEFT: REFINED GLASS FILTER PANEL â”€â”€ */}
				<aside className="w-full lg:w-[320px] shrink-0">
					<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[32px] border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
						<div className="p-1">
							<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
						</div>
					</div>
				</aside>

				{/* â”€â”€ RIGHT: RESULTS â”€â”€ */}
				<main className="flex-1 min-w-0">
					{/* Results Header */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 backdrop-blur-sm bg-[#F8FAFC]/50 py-2">
						<div>
							<div className="inline-flex items-center gap-2 mb-2">
								<Zap className="w-4 h-4 text-blue-500" />
								<span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Pazar AlanÄ±</span>
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
									TÃ¼mÃ¼nÃ¼ KeÅŸfet <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
								<p className="font-bold text-red-900 mb-0.5">Bir ÅŸeyler ters gitti</p>
								<p className="text-red-600">{(error as Error)?.message || 'BaÄŸlantÄ± sorunu yaÅŸanÄ±yor.'}</p>
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
									<h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">EÅŸleÅŸme BulunamadÄ±</h3>
									<p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
										Filtreleme kriterlerinizi geniÅŸleterek daha fazla sonuÃ§ elde edebilirsiniz.
									</p>
									<button
										onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}
										className="inline-flex items-center justify-center h-12 px-8 rounded-2xl font-bold text-sm transition-all bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-95"
									>
										TÃ¼m Filtreleri Temizle
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
									TÃ¼m Listeyi GÃ¶r 
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

/* â•â•â• PREMIUM CARRIER CARD â•â•â• */
function InlineCarrierCard({ carrier, navigate }: { carrier: CarrierSearchItem; navigate: ReturnType<typeof useNavigate> }) {
	const initials = carrier.companyName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
	const slug = slugify(carrier.companyName);
	const detailPath = `/nakliyeciler/${carrier.id}/${slug}`;
	const ratingValue = num(carrier.rating);
	const priceLabel = typeof carrier.startingPrice === 'number' ? `â‚º${formatPrice(carrier.startingPrice)}` : null;
	const isVerified = (carrier.profileCompletion || 0) > 70;
	const expYears = num(carrier.experienceYears, NaN);
	const experienceText = Number.isFinite(expYears) ? `${expYears} YÄ±l` : null;
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
								<span className="text-[13px] font-semibold text-slate-500">{carrier.city || "Åehir Belirtilmedi"}</span>
							</div>
						</div>
					</div>
					
					{isVerified && (
						<div className="mt-1">
							<Badge title="Profil ve evrak bilgileri kontrol edilmiÅŸ nakliyeci" className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-black text-[10px] tracking-widest uppercase flex items-center gap-1 hover:bg-emerald-100 transition-colors">
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
						<span className="text-xs font-bold">{experienceText || "HÄ±zlÄ±"} Deneyim</span>
					</div>
				</div>

				{/* Service Area / Vehicle Summary */}
				<div className="space-y-4">
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 bg-blue-50/80 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
							<Truck className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hizmet AracÄ±</div>
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
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">BAÅLANGIÃ‡</span>
								<span className="text-2xl font-black text-[#0F172A] tracking-tighter leading-none">{priceLabel}</span>
							</>
						) : (
							<span className="text-sm font-bold text-slate-400 italic">Teklif AlÄ±nÄ±z</span>
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
````

---

## shadcn-ui/src/lib/carrierSearch.ts:

````ts
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
	{ label: '1+ yÄ±l', value: 1 },
	{ label: '3+ yÄ±l', value: 3 },
	{ label: '5+ yÄ±l', value: 5 },
	{ label: '10+ yÄ±l', value: 10 }
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
````

---

## shadcn-ui/src/components/carriers/CarrierFilters.tsx:

````tsx
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
	{ label: 'En yÃ¼ksek puan', value: 'rating' },
	{ label: 'En uygun fiyat', value: 'price' },
	{ label: 'En deneyimliler', value: 'experience' },
	{ label: 'Profil tamamlanma', value: 'profile' },
	{ label: 'En yeni', value: 'recent' }
];

const ANY_VALUE = '__all__';

const SCOPE_OPTIONS = [
	{ id: 'sehirici', label: 'Åehir Ä°Ã§i' },
	{ id: 'sehirlerarasi', label: 'Åehirler ArasÄ±' }
];

const LOAD_TYPE_OPTIONS = [
	{ id: 'ev-esyasi', label: 'Ev EÅŸyasÄ±' },
	{ id: 'ofis', label: 'Ofis TaÅŸÄ±ma' },
	{ id: 'parsiyel', label: 'Parsiyel' },
	{ id: 'komple', label: 'Komple YÃ¼k' },
	{ id: 'hassas', label: 'Hassas YÃ¼k' },
	{ id: 'agir', label: 'AÄŸÄ±r YÃ¼k' }
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

				{/* 1. KONUM & HÄ°ZMET ALANI */}
				<FilterSection 
					icon={<MapPin className="h-3.5 w-3.5" />} 
					title="Konum ve Hizmet"
				>
					<div className="grid gap-4 flex-1">
						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Hizmet VerdiÄŸi Ä°l</Label>
							<Select value={serviceCityValue} onValueChange={handleServiceCityChange}>
								<SelectTrigger className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
									<SelectValue placeholder="Ä°l SeÃ§iniz" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>TÃ¼m Ä°ller</SelectItem>
									{CITIES_TR.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Ä°lÃ§e</Label>
							<Select value={serviceDistrictValue} onValueChange={handleServiceDistrictChange} disabled={!filters.serviceCity}>
								<SelectTrigger className="h-11 rounded-1.5xl border-[#F1F5F9] bg-white hover:bg-slate-50 transition-colors">
									<SelectValue placeholder={!filters.serviceCity ? 'Ã–nce Ä°l SeÃ§in' : 'Ä°lÃ§e SeÃ§iniz'} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ANY_VALUE}>TÃ¼m Ä°lÃ§eler</SelectItem>
									{districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3 pt-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Ã‡alÄ±ÅŸma KapsamÄ±</Label>
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

				{/* 2. ARAÃ‡ & KAPASÄ°TE */}
				<FilterSection 
					icon={<Truck className="h-3.5 w-3.5" />} 
					title="AraÃ§ ve Kapasite"
				>
					<div className="space-y-4">
						<MultiSelect
							label="AraÃ§ Tipleri"
							placeholder={vehiclesLoading ? "YÃ¼kleniyor..." : "SeÃ§iniz"}
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
					title="SÄ±ralama ve Puan"
				>
					<div className="space-y-5">
						<div className="space-y-2">
							<Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Tercih SÄ±ralamasÄ±</Label>
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
								<Label className="text-sm font-bold text-slate-700">OnaylÄ± Hesaplar</Label>
								<p className="text-[10px] text-slate-400 font-medium">Sadece doÄŸrulanmÄ±ÅŸ profiller</p>
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
					TÃ¼m Filtreleri SÄ±fÄ±rla
				</Button>
			</div>
		</div>
	);
};

/* â”€â”€ HELPERS: SECTION COMPONENT â”€â”€ */
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
````

---

## shadcn-ui/src/components/carriers/CarrierCard.tsx:

````tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Truck, ShieldCheck, ChevronRight, Heart } from 'lucide-react';
import { CarrierSearchItem } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';

interface CarrierCardProps {
	carrier: CarrierSearchItem;
	onInspect?: (carrierId: string) => void;
}

const normalizeNumber = (value: unknown, fallback = 0): number => {
	const num = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(num) ? num : fallback;
};

const CarrierCard = ({ carrier, onInspect }: CarrierCardProps) => {
	const navigate = useNavigate();
	const { isFavorite, toggleFavorite, isCustomer } = useFavorites();
	const { toast } = useToast();
	const liked = isFavorite(carrier.id);

	const initials = useMemo(() => {
		const parts = carrier.companyName.split(' ').filter(Boolean);
		return (parts[0]?.[0] || 'N') + (parts[1]?.[0] || '');
	}, [carrier.companyName]);

	const slug = useMemo(() => slugify(carrier.companyName), [carrier.companyName]);
	const detailPath = useMemo(() => `/nakliyeciler/${carrier.id}/${slug}`, [carrier.id, slug]);

	const ratingValue = useMemo(() => normalizeNumber(carrier.rating), [carrier.rating]);

	const priceLabel = typeof carrier.startingPrice === 'number'
		? formatPrice(carrier.startingPrice)
		: 'Fiyat Sorunuz';

	const isVerified = (carrier.profileCompletion || 0) > 70;

	const experienceYears = normalizeNumber(carrier.experienceYears, NaN);
	const experienceText = Number.isFinite(experienceYears)
		? `${experienceYears} YÄ±l Deneyim`
		: 'Yeni BaÅŸlayan';

	const serviceAreas = carrier.serviceAreas || [];

	const handleInspect = () => {
		if (onInspect) {
			onInspect(carrier.id);
			return;
		}
		navigate(detailPath);
	};

	const handleToggleFavorite = async (e: React.MouseEvent) => {
		e.stopPropagation();
		const result = await toggleFavorite(carrier.id);
		if (result !== null) {
			toast({ title: result ? 'Favorilere eklendi' : 'Favorilerden Ã§Ä±karÄ±ldÄ±' });
		}
	};

	return (
		<Card className="group relative overflow-hidden border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 duration-300 flex flex-col h-full">
			<CardHeader className="p-5 pb-2">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-start gap-4">
						<div className="relative">
							<Avatar className="h-16 w-16 border-2 border-slate-100 shadow-sm">
								<AvatarImage src={carrier.pictureUrl ?? undefined} alt={carrier.companyName} className="object-cover" />
								<AvatarFallback className="bg-slate-900 text-white font-bold text-lg">
									{initials.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							{isVerified && (
								<div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white" title="Profil ve evrak bilgileri kontrol edilmiÅŸ nakliyeci">
									<ShieldCheck className="h-3 w-3 text-white" />
								</div>
							)}
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors line-clamp-1" title={carrier.companyName}>
								{carrier.companyName}
							</h3>

							<div className="flex items-center gap-1.5 text-sm text-slate-500">
								<MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
								<span className="truncate max-w-[140px]">{carrier.city || 'Åehir belirtilmedi'}</span>
							</div>

							<div className="flex items-center gap-1.5">
								<div className="flex items-center gap-0.5">
									<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
									<span className="text-sm font-bold text-slate-900">{ratingValue.toFixed(1)}</span>
								</div>
								<span className="text-xs text-slate-400">({carrier.reviewCount})</span>
							</div>
						</div>
					</div>
					{isCustomer && (
						<button
							onClick={handleToggleFavorite}
							className="p-1.5 rounded-full hover:bg-slate-100 transition-colors shrink-0"
							title={liked ? 'Favorilerden Ã§Ä±kar' : 'Favorilere ekle'}
						>
							<Heart className={cn('h-5 w-5 transition-colors', liked ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-400')} />
						</button>
					)}
				</div>
			</CardHeader>

			<CardContent className="px-5 py-3 flex-1">
				<div className="space-y-4">
					<div className="bg-slate-50 rounded-lg p-3 space-y-2">
						<div className="flex items-start gap-2.5">
							<Truck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
							<span className="text-sm text-slate-700 font-medium line-clamp-2">
								{carrier.vehicleSummary || 'AraÃ§ bilgisi belirtilmemiÅŸ'}
							</span>
						</div>
					</div>

					{serviceAreas.length > 0 && (
						<div className="flex flex-wrap gap-1.5 content-start">
							{serviceAreas.slice(0, 3).map(area => (
								<Badge key={area} variant="secondary" className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-normal px-2 py-0.5 h-6">
									{area}
								</Badge>
							))}
							{serviceAreas.length > 3 && (
								<span className="text-xs text-slate-400 font-medium self-center pl-1">
									+{serviceAreas.length - 3} bÃ¶lge
								</span>
							)}
						</div>
					)}
				</div>
			</CardContent>

			<CardFooter className="p-5 pt-0 mt-auto flex flex-col gap-3 border-t border-slate-100/50">
				<div className="flex items-center justify-between w-full pt-4">
					<div>
						<p className="text-xs text-slate-500 font-medium mb-0.5">BaÅŸlangÄ±Ã§</p>
						<p className="text-lg font-bold text-slate-900">{priceLabel}</p>
					</div>
					<div className="text-right">
						<Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700 font-medium" title="Deneyim bilgisi firma profilinden gelir">
							{experienceText}
						</Badge>
					</div>
				</div>

				<Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md group-hover:shadow-lg transition-all" onClick={handleInspect}>
					Ä°ncele
					<ChevronRight className="h-4 w-4 ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
				</Button>
			</CardFooter>
		</Card>
	);
};

export default memo(CarrierCard);

const slugify = (value: string): string => {
	return value
		.toString()
		.toLowerCase()
		.replace(/Ã§/g, 'c')
		.replace(/ÄŸ/g, 'g')
		.replace(/Ä±/g, 'i')
		.replace(/Ã¶/g, 'o')
		.replace(/ÅŸ/g, 's')
		.replace(/Ã¼/g, 'u')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'nakliyeci';
};
````

---

## shadcn-ui/src/components/carriers/CarrierCardSkeleton.tsx:

````tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { memo } from 'react';

const CarrierCardSkeleton = () => (
	<Card className="opacity-80">
		<CardHeader>
			<div className="flex items-start gap-4">
				<Skeleton className="h-16 w-16 rounded-full" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-3 w-1/3" />
					<div className="flex gap-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-3 w-20" />
					</div>
				</div>
			</div>
		</CardHeader>
		<CardContent className="space-y-4">
			<Skeleton className="h-4 w-2/3" />
			<div className="space-y-2">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-5/6" />
				<Skeleton className="h-3 w-4/5" />
			</div>
			<div className="flex justify-between">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>
			<Skeleton className="h-10 w-full" />
		</CardContent>
	</Card>
);

export default memo(CarrierCardSkeleton);
````

---

## src/application/services/carrier/CarrierSearchService.ts:

````ts
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierRepository, CarrierSearchFilters, CarrierSearchRepositoryItem, CarrierSearchSort } from '../../../infrastructure/repositories/CarrierRepository';
import { PRODUCT_SCOPE_OF_WORK_NAMES } from '../../../infrastructure/repositories/ScopeOfWorkRepository';

export interface CarrierSearchQuery {
	city?: string;
	serviceAreas?: string[];
	vehicleTypeId?: string;
	vehicleTypeIds?: string[];
	scopes?: string[] | string;
	scopeIds?: string[] | string;
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
	private readonly SCOPE_SLUG_TO_NAME: Record<string, string> = {
		sehirici: 'Åehir Ä°Ã§i',
		sehirlerarasi: 'Åehirler ArasÄ±',
	};
	private readonly PRODUCT_SCOPE_NAMES = new Set<string>(PRODUCT_SCOPE_OF_WORK_NAMES);
	private readonly UNSUPPORTED_SCOPE_FILTER = '__unsupported_scope__';

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

		const parseScopeIds = (value: unknown): string[] | undefined => {
			if (typeof value === 'string' && value.trim()) {
				return value.split(',').map(s => s.trim()).filter(Boolean);
			}
			if (Array.isArray(value)) {
				return (value as string[]).map(s => String(s).trim()).filter(Boolean);
			}
			return undefined;
		};

		const scopeValues = parseScopeIds((query as any).scopes ?? (query as any).scopeIds) ?? [];
		const isUuid = (value: string): boolean =>
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
		const normalizedScopeNames = scopeValues
			.filter(value => !isUuid(value))
			.map(value => this.SCOPE_SLUG_TO_NAME[value] ?? value)
			.map(name => this.PRODUCT_SCOPE_NAMES.has(name) ? name : this.UNSUPPORTED_SCOPE_FILTER)
			.filter(Boolean);
		const scopeIds = scopeValues.filter(isUuid);
		const scopeNames = normalizedScopeNames.length
			? Array.from(new Set(normalizedScopeNames))
			: undefined;

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
			minPrice: toNumber((query as any).minPrice),
			maxPrice: toNumber((query as any).maxPrice),
			minExperienceYears: toInt((query as any).minExperienceYears),
			minProfileCompletion: toInt((query as any).minProfileCompletion),
			minCapacityKg: toInt((query as any).minCapacityKg),
			maxCapacityKg: toInt((query as any).maxCapacityKg),
			searchText: toText((query as any).searchText),
			availableDate: toText((query as any).availableDate),
			scopeIds: scopeIds.length ? scopeIds : undefined,
			scopeNames,
			isVerified,
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
````

---

## src/infrastructure/repositories/CarrierRepository.ts:

````ts
import { BaseRepository } from './BaseRepository';
import { Carrier, CarrierApprovalState } from '../../domain/entities/Carrier';
import { Brackets, SelectQueryBuilder } from 'typeorm';

export type CarrierSearchSort = 'rating' | 'price' | 'experience' | 'profile' | 'recent';

export interface CarrierSearchFilters {
  city?: string;
  serviceAreas?: string[];
  vehicleTypeIds?: string[];
  serviceCity?: string;
  serviceDistrict?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  minExperienceYears?: number;
  minProfileCompletion?: number;
  minCapacityKg?: number;
  maxCapacityKg?: number;
  searchText?: string;
  availableDate?: string;
  scopeIds?: string[];
  scopeNames?: string[];
  serviceTypeIds?: string[];
  isVerified?: boolean;
  hasDocuments?: boolean;
  sortBy?: CarrierSearchSort;
  limit: number;
  offset: number;
}

export interface CarrierSearchRepositoryItem {
  carrier: Carrier;
  minPrice: number | null;
  offerCount: number;
}

export class CarrierRepository extends BaseRepository<Carrier> {
  constructor() {
    super(Carrier);
  }

  private applyPublicTrustGate(qb: SelectQueryBuilder<Carrier>): SelectQueryBuilder<Carrier> {
    return qb
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED });
  }

  async findFullById(id: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { id },
      relations: [
        'activity',
        'earnings',
        'serviceTypeLinks',
        'serviceTypeLinks.serviceType',
        'vehicleTypeLinks',
        'vehicleTypeLinks.vehicleType',
        'scopeLinks',
        'scopeLinks.scope',
        'documents',
        'securitySettings',
        'profileStatus'
      ]
    });
  }

  async findPublicById(carrierId: string): Promise<Carrier | null> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .select([
        'carrier.id',
        'carrier.companyName',
        'carrier.contactName',
        'carrier.phone',
        'carrier.email',
        'carrier.pictureUrl',
        'carrier.rating',
        'carrier.completedShipments',
        'carrier.isActive'
      ])
      .where('carrier.id = :carrierId', { carrierId });

    return await this.applyPublicTrustGate(qb)
      .getOne();
  }

  async findByEmail(email: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { email },
      relations: ['carrierVehicles']
    });
  }

  async findByTaxNumber(taxNumber: string): Promise<Carrier | null> {
    return await this.repository.findOne({
      where: { taxNumber }
    });
  }

  async findByCity(city: string): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('activity.city = :city', { city });

    return this.applyPublicTrustGate(queryBuilder)
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findByVehicleType(vehicleTypeId: string): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles')
      .where('vehicles.vehicleTypeId = :vehicleTypeId', { vehicleTypeId });

    return await this.applyPublicTrustGate(queryBuilder)
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async findAvailableCarriers(city: string, vehicleTypeIds: string[]): Promise<Carrier[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('carrier')
      .innerJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.carrierVehicles', 'vehicles', 'vehicles.isActive = :vehicleActive', { vehicleActive: true })
      .where('activity.city = :city', { city });

    this.applyPublicTrustGate(queryBuilder);

    if (vehicleTypeIds.length > 0) {
      queryBuilder.andWhere('vehicles.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds });
    }

    return await queryBuilder
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .getMany();
  }

  async updateRating(carrierId: string, newRating: number): Promise<void> {
    await this.repository.update(carrierId, { rating: newRating });
  }

  // Teklif verildiÄŸinde ilgili nakliyecinin toplam teklif sayÄ±sÄ±nÄ± 1 artÄ±rÄ±r.
  async incrementTotalOffers(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        totalOffers: () => 'totalOffers + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // TaÅŸÄ±ma baÅŸarÄ±yla tamamlandÄ±ÄŸÄ±nda completedShipments alanÄ±nÄ± 1 artÄ±rÄ±r.
  async incrementCompletedShipments(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        completedShipments: () => 'completedShipments + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // TaÅŸÄ±ma iptal edildiÄŸinde cancelledShipments alanÄ±nÄ± 1 artÄ±rÄ±r.
  async incrementCancelledShipments(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        cancelledShipments: () => 'cancelledShipments + 1'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  // BaÅŸarÄ± oranÄ±nÄ± completedShipments / totalOffers * 100 formÃ¼lÃ¼yle yeniden hesaplar.
  // totalOffers = 0 ise successRate deÄŸeri 0 olarak set edilir.
  async recalculateSuccessRate(carrierId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Carrier)
      .set({
        successRate: () => 'CASE WHEN totalOffers > 0 THEN ROUND((completedShipments / totalOffers) * 100, 2) ELSE 0 END'
      })
      .where('id = :id', { id: carrierId })
      .execute();
  }

  async getTopCarriers(limit: number = 10): Promise<Carrier[]> {
    return await this.applyPublicTrustGate(
      this.repository
        .createQueryBuilder('carrier')
        .leftJoinAndSelect('carrier.carrierVehicles', 'carrierVehicles')
    )
      .orderBy('carrier.rating', 'DESC')
      .addOrderBy('carrier.completedShipments', 'DESC')
      .take(limit)
      .getMany();
  }

  async searchCarriers(filters: CarrierSearchFilters): Promise<{ total: number; items: CarrierSearchRepositoryItem[] }> {
    const qb = this.repository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.activity', 'activity')
      .leftJoinAndSelect('carrier.profileStatus', 'profileStatus')
      .leftJoinAndSelect('carrier.vehicleTypeLinks', 'vehicleLink')
      .leftJoinAndSelect('vehicleLink.vehicleType', 'vehicleType')
      .where('1 = 1')
      .distinct(true);

    this.applyPublicTrustGate(qb);

    if (filters.city) {
      qb.andWhere('activity.city = :city', { city: filters.city });
    }

    if (filters.searchText) {
      qb.andWhere('carrier.companyName LIKE :searchText', { searchText: `%${filters.searchText}%` });
    }

    if (filters.vehicleTypeIds?.length) {
      qb.andWhere('vehicleLink.vehicleTypeId IN (:...vehicleTypeIds)', { vehicleTypeIds: filters.vehicleTypeIds });
    }

    if (filters.serviceCity) {
      qb.andWhere(new Brackets(cityClause => {
        cityClause
          .where('activity.city = :serviceCity', { serviceCity: filters.serviceCity })
          .orWhere(
            "(activity.serviceAreasJson IS NOT NULL AND JSON_SEARCH(activity.serviceAreasJson, 'one', :serviceCityPattern) IS NOT NULL)",
            { serviceCityPattern: `%${filters.serviceCity}%` }
          );
      }));
    }

    if (filters.serviceDistrict) {
      qb.andWhere(new Brackets(districtClause => {
        districtClause
          .where('activity.district = :serviceDistrict', { serviceDistrict: filters.serviceDistrict })
          .orWhere(
            "(activity.serviceAreasJson IS NOT NULL AND JSON_SEARCH(activity.serviceAreasJson, 'one', :serviceDistrictPattern) IS NOT NULL)",
            { serviceDistrictPattern: `%${filters.serviceDistrict}%` }
          );
      }));
    }

    if (filters.minRating) {
      qb.andWhere('carrier.rating >= :minRating', { minRating: filters.minRating });
    }

    if (filters.minProfileCompletion !== undefined) {
      qb.andWhere(
        '(COALESCE(profileStatus.overallPercentage, 0) >= :minProfileCompletion)',
        { minProfileCompletion: filters.minProfileCompletion }
      );
    }

    if (filters.minCapacityKg !== undefined) {
      qb.andWhere(
        `(
          (vehicleLink.capacityKg IS NOT NULL AND vehicleLink.capacityKg >= :minCapacityKg)
          OR (vehicleLink.capacityKg IS NULL AND vehicleType.defaultCapacityKg >= :minCapacityKg)
        )`,
        { minCapacityKg: filters.minCapacityKg }
      );
    }

    if (filters.minExperienceYears) {
      qb.andWhere(
        '(carrier.foundedYear IS NOT NULL AND (YEAR(CURDATE()) - carrier.foundedYear) >= :minExperienceYears)',
        { minExperienceYears: filters.minExperienceYears }
      );
    }

    /* Price filters removed as Offer table is deleted
    if (filters.minPrice !== undefined) { ... }
    if (filters.maxPrice !== undefined) { ... }
    */

    if (filters.serviceAreas && filters.serviceAreas.length > 0) {
      qb.andWhere(new Brackets(or => {
        filters.serviceAreas!.forEach((area, idx) => {
          or.orWhere(
            'activity.serviceAreasJson IS NOT NULL AND JSON_CONTAINS(activity.serviceAreasJson, JSON_QUOTE(:serviceArea' + idx + ')) = 1',
            { [`serviceArea${idx}`]: area }
          );
        });
      }));
    }

    if (filters.availableDate) {
      qb.andWhere(
        "(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :availDate) IS NOT NULL)",
        { availDate: filters.availableDate }
      );
    }

    if (filters.maxCapacityKg !== undefined) {
      qb.andWhere(
        `(
          (vehicleLink.capacityKg IS NOT NULL AND vehicleLink.capacityKg <= :maxCapacityKg)
          OR (vehicleLink.capacityKg IS NULL AND vehicleType.defaultCapacityKg <= :maxCapacityKg)
        )`,
        { maxCapacityKg: filters.maxCapacityKg }
      );
    }

    if ((filters.scopeIds && filters.scopeIds.length > 0) || (filters.scopeNames && filters.scopeNames.length > 0)) {
      qb.leftJoin('carrier.scopeLinks', 'scopeLink');
      qb.leftJoin('scopeLink.scope', 'scopeFilter');

      qb.andWhere(new Brackets(scopeClause => {
        if (filters.scopeIds && filters.scopeIds.length > 0) {
          scopeClause.where('scopeLink.scopeId IN (:...scopeIds)', { scopeIds: filters.scopeIds });
        }

        if (filters.scopeNames && filters.scopeNames.length > 0) {
          if (filters.scopeIds && filters.scopeIds.length > 0) {
            scopeClause.orWhere('scopeFilter.name IN (:...scopeNames)', { scopeNames: filters.scopeNames });
          } else {
            scopeClause.where('scopeFilter.name IN (:...scopeNames)', { scopeNames: filters.scopeNames });
          }
        }
      }));
      qb.andWhere('scopeFilter.status = :activeScopeStatus', { activeScopeStatus: 'ACTIVE' });
    }

    if (filters.sortBy === 'experience') {
      qb.orderBy('carrier.foundedYear', 'ASC');
      qb.addOrderBy('carrier.rating', 'DESC');
    } else if (filters.sortBy === 'profile') {
      qb.orderBy('COALESCE(profileStatus.overallPercentage, 0)', 'DESC');
    } else if (filters.sortBy === 'recent') {
      qb.orderBy('carrier.createdAt', 'DESC');
    } else {
      qb.orderBy('carrier.rating', 'DESC');
    }
    qb.addOrderBy('carrier.completedShipments', 'DESC');

    const pagedQb = qb.clone()
      .skip(filters.offset)
      .take(filters.limit);

    const { entities, raw } = await pagedQb.getRawAndEntities();
    const total = await qb.clone().getCount();

    const items: CarrierSearchRepositoryItem[] = entities.map((carrier) => ({
      carrier,
      minPrice: null,
      offerCount: carrier.totalOffers ?? 0
    }));

    return { total, items };
  }

  async countByAvailableDate(date: string): Promise<{ total: number; available: number }> {
    const totalCount = await this.repository
      .createQueryBuilder('carrier')
      .where('1 = 1')
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED })
      .getCount();

    const availableCount = await this.repository
      .createQueryBuilder('carrier')
      .leftJoin('carrier.activity', 'activity')
      .where('1 = 1')
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('carrier.verifiedByAdmin = :verifiedByAdmin', { verifiedByAdmin: true })
      .andWhere('carrier.approvalState = :approvalState', { approvalState: CarrierApprovalState.APPROVED })
      .andWhere(
        "(activity.availableDates IS NOT NULL AND JSON_SEARCH(activity.availableDates, 'one', :date) IS NOT NULL)",
        { date }
      )
      .getCount();

    return { total: totalCount, available: availableCount };
  }
}
````

---

## shadcn-ui/src/lib/locations.ts:

````ts
import { TURKISH_CITIES } from './constants';
// Offline TR il/ilÃ§e/mahalle verisi
// turkey-neighbourhoods, tÃ¼m iller ve ilÃ§eler iÃ§in eksiksiz veri saÄŸlar
import {
  getCityCodes,
  getCityNames,
  isCityName,
  getDistrictsByCityCode
} from 'turkey-neighbourhoods';

// Basit YYYY-MM-DD (yerel saat) formatlayÄ±cÄ±
export function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CITIES_TR = TURKISH_CITIES;

// Yedek ilÃ§e listesi (aÄŸ hatasÄ± veya CORS durumuna karÅŸÄ±). En azÄ±ndan sÄ±k kullanÄ±lan iller eksiksiz gelsin.
const FALLBACK_DISTRICTS: Record<string, string[]> = {
  Ä°stanbul: ['Adalar', 'ArnavutkÃ¶y', 'AtaÅŸehir', 'AvcÄ±lar', 'BaÄŸcÄ±lar', 'BahÃ§elievler', 'BakÄ±rkÃ¶y', 'BaÅŸakÅŸehir', 'BayrampaÅŸa', 'BeÅŸiktaÅŸ', 'Beykoz', 'BeylikdÃ¼zÃ¼', 'BeyoÄŸlu', 'BÃ¼yÃ¼kÃ§ekmece', 'Ã‡atalca', 'Ã‡ekmekÃ¶y', 'Esenler', 'Esenyurt', 'EyÃ¼psultan', 'Fatih', 'GaziosmanpaÅŸa', 'GÃ¼ngÃ¶ren', 'KadÄ±kÃ¶y', 'KaÄŸÄ±thane', 'Kartal', 'KÃ¼Ã§Ã¼kÃ§ekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'SarÄ±yer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Åile', 'ÅiÅŸli', 'Tuzla', 'Ãœmraniye', 'ÃœskÃ¼dar', 'Zeytinburnu'],
  Ankara: ['Ã‡ankaya', 'KeÃ§iÃ¶ren', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut', 'AltÄ±ndaÄŸ', 'Pursaklar', 'GÃ¶lbaÅŸÄ±', 'PolatlÄ±'],
  Ä°zmir: ['Konak', 'KarÅŸÄ±yaka', 'Bornova', 'Buca', 'Gaziemir', 'KarabaÄŸlar', 'BayraklÄ±', 'Ã‡iÄŸli', 'BalÃ§ova', 'NarlÄ±dere'],
  Bursa: ['Osmangazi', 'YÄ±ldÄ±rÄ±m', 'NilÃ¼fer', 'Ä°negÃ¶l', 'MustafakemalpaÅŸa'],
  Antalya: ['Kepez', 'MuratpaÅŸa', 'KonyaaltÄ±', 'Alanya', 'Manavgat'],
  Adana: ['Seyhan', 'YÃ¼reÄŸir', 'Ã‡ukurova', 'SarÄ±Ã§am', 'Ceyhan'],
  Konya: ['SelÃ§uklu', 'Karatay', 'Meram', 'EreÄŸli', 'AkÅŸehir'],
  Gaziantep: ['Åahinbey', 'Åehitkamil', 'Nizip', 'Ä°slahiye'],
  // YaygÄ±n eksik yaÅŸanan illere hÄ±zlÄ± fallback
  AÄŸrÄ±: ['AÄŸrÄ± Merkez', 'DoÄŸubayazÄ±t', 'Patnos', 'Diyadin', 'TaÅŸlÄ±Ã§ay'],
  Van: ['Ä°pekyolu', 'TuÅŸba', 'Edremit', 'ErciÅŸ', 'Muradiye'],
  Erzurum: ['Yakutiye', 'Aziziye', 'PalandÃ¶ken', 'Oltu', 'Pasinler'],
  ÅanlÄ±urfa: ['EyyÃ¼biye', 'Haliliye', 'KarakÃ¶prÃ¼', 'SuruÃ§', 'ViranÅŸehir'],
  DiyarbakÄ±r: ['BaÄŸlar', 'KayapÄ±nar', 'Sur', 'YeniÅŸehir', 'Bismil'],
  Mersin: ['YeniÅŸehir', 'Toroslar', 'Akdeniz', 'Mezitli', 'Tarsus'],
  Trabzon: ['Ortahisar', 'AkÃ§aabat', 'Yomra', 'Of', 'Arsin'],
  Kayseri: ['Kocasinan', 'Melikgazi', 'Talas', 'Develi', 'PÄ±narbaÅŸÄ±'],
  EskiÅŸehir: ['TepebaÅŸÄ±', 'OdunpazarÄ±', 'Sivrihisar', 'Alpu', 'Ä°nÃ¶nÃ¼']
};

// Basit Ã¶nbellek anahtarlarÄ±
const CACHE_KEY = 'tr_districts_by_city_v2';

function getCache(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(map: Record<string, string[]>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Ä°sim normalizasyonu (TR -> ASCII, kÃ¼Ã§Ã¼k/bÃ¼yÃ¼k varyantlar)
function normalizeCityName(name: string): string {
  const map: Record<string, string> = {
    'Ä°': 'I', 'I': 'I', 'Ä±': 'i', 'i': 'i', 'Ä': 'G', 'ÄŸ': 'g', 'Ãœ': 'U', 'Ã¼': 'u',
    'Å': 'S', 'ÅŸ': 's', 'Ã–': 'O', 'Ã¶': 'o', 'Ã‡': 'C', 'Ã§': 'c', 'Ã‚': 'A', 'Ã¢': 'a', 'ÃŠ': 'E', 'Ãª': 'e'
  };
  return name.split('').map(ch => map[ch] ?? ch).join('');
}

async function fetchDistrictsByProvinceName(city: string): Promise<string[]> {
  const url = `https://turkiyeapi.dev/api/v1/districts?province=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const list: string[] = (data?.data || []).map((d: any) => String(d.name)).filter(Boolean);
  const uniq: string[] = Array.from(new Set<string>(list));
  return uniq.sort((a: string, b: string) => a.localeCompare(b, 'tr'));
}

async function fetchDistrictsByProvinceId(city: string): Promise<string[]> {
  // 1) province id bul
  const resP = await fetch(`https://turkiyeapi.dev/api/v1/provinces?name=${encodeURIComponent(city)}`, { headers: { 'accept': 'application/json' } });
  if (!resP.ok) return [];
  const pj = await resP.json();
  const id = pj?.data?.[0]?.id;
  if (!id) return [];
  // 2) id ile district getir
  const resD = await fetch(`https://turkiyeapi.dev/api/v1/districts?provinceId=${encodeURIComponent(String(id))}`, { headers: { 'accept': 'application/json' } });
  if (!resD.ok) return [];
  const dj = await resD.json();
  const list: string[] = (dj?.data || []).map((d: any) => String(d.name)).filter(Boolean);
  const uniq: string[] = Array.from(new Set<string>(list));
  return uniq.sort((a: string, b: string) => a.localeCompare(b, 'tr'));
}

// Ä°lÃ§eleri getir â€“ Ã¶nce cache, sonra public API (Ã§ok aÅŸamalÄ±), sonra fallback.
export async function getDistrictsForCity(city: string): Promise<string[]> {
  if (!city) return [];
  const cache = getCache();
  if (cache[city]?.length) return cache[city];

  // 0) Offline paket (turkey-neighbourhoods) â€“ kesin ve hÄ±zlÄ± sonuÃ§
  try {
    // Ä°l adÄ±nÄ± city code'a Ã§evir ve ilÃ§eleri getir
    let code: string | undefined;
    // DoÄŸrudan eÅŸleÅŸen isim
    if (isCityName(city)) {
      // getCityNames() sÄ±ralÄ± isim listesi dÃ¶ner, index'i ile code'u eÅŸleÅŸtiririz
      const names = getCityNames();
      const idx = names.findIndex(n => n.toLowerCase() === city.toLowerCase());
      if (idx >= 0) code = getCityCodes()[idx];
    }
    // Normalize isimle dene (Ä°->I vb.)
    if (!code) {
      const norm = normalizeCityName(city);
      const names = getCityNames();
      const idx = names.findIndex(n => normalizeCityName(n).toLowerCase() === norm.toLowerCase());
      if (idx >= 0) code = getCityCodes()[idx];
    }
    let districtsFromPkg: string[] = [];
    if (code) {
      const list = getDistrictsByCityCode(code) || [];
      districtsFromPkg = Array.from(new Set(list.map(String))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
    }
    if (districtsFromPkg.length) {
      cache[city] = districtsFromPkg;
      setCache(cache);
      return districtsFromPkg;
    }
  } catch {
    // Paket varsa bile yapÄ± deÄŸiÅŸmiÅŸ olabilir; API denemelerine dÃ¼ÅŸeriz
  }

  // Public API denemeleri (isimle, normalize isimle, provinceId ile)
  try {
    // 1) DoÄŸrudan isim
    let list = await fetchDistrictsByProvinceName(city);
    // 2) Normalized (Agri, Istanbul vs.)
    if (!list.length) list = await fetchDistrictsByProvinceName(normalizeCityName(city));
    // 3) ProvinceId ile
    if (!list.length) list = await fetchDistrictsByProvinceId(city);
    if (!list.length) list = await fetchDistrictsByProvinceId(normalizeCityName(city));
    if (list.length) {
      cache[city] = list;
      setCache(cache);
      return list;
    }
  } catch {
    // ignore â€“ fallback'a dÃ¼ÅŸeceÄŸiz
  }

  const fallback = FALLBACK_DISTRICTS[city as keyof typeof FALLBACK_DISTRICTS] || [];
  if (fallback.length) {
    cache[city] = fallback;
    setCache(cache);
  }
  return fallback;
}
````

---

## shadcn-ui/src/utils/formatLocation.ts:

````ts
/**
 * Formats a location string for display.
 * Handles null/undefined gracefully.
 */
export function formatLocation(location: string | null | undefined): string {
  if (!location) return 'â€”';
  return location;
}

/**
 * Parses a "City, District" formatted location string into its parts.
 */
export function parseLocation(location: string | null | undefined): { city: string; district: string } {
  if (!location) return { city: '', district: '' };
  const parts = location.split(', ');
  return { city: parts[0] ?? '', district: parts[1] ?? '' };
}
````

---

## shadcn-ui/src/pages/OfferRequest.tsx:

````tsx
import OfferRequestForm from '@/components/OfferRequestForm';

export default function OfferRequest() {
  return <OfferRequestForm showHeader />;
}
````

---

## shadcn-ui/src/components/OfferRequestForm.tsx:

````tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Package, Truck, Shield, Award, MessageSquare, Star,
  CheckCircle2, XCircle, Info, Images, Lock, X, ArrowRight,
  Calendar, LayoutGrid, CheckCircle, Phone, Plus, Check, Loader2, UserCheck,
} from 'lucide-react';
import { Carrier, LOAD_TYPES, VEHICLE_TYPES } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';
import { CITIES_TR, getDistrictsForCity, formatDateYYYYMMDD } from '@/lib/locations';
import FileUpload from '@/components/ui/file-upload';
import { SPECIAL_SERVICES } from '@/lib/carrierFormConstants';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import VolumeCalculatorModal from '@/components/converter/VolumeCalculatorModal';
import type { VolumeCalculatorInitialValues } from '@/components/converter/VolumeCalculatorModal';
import type { EstimateConverterResponse } from '@/lib/converterApi';
import {
  getExtraServiceLoadType,
  mapSelectedExtraServiceNames,
  mergeSuggestedExtraServiceIds,
  reconcileSelectedExtraServiceIds,
  type ExtraServiceOption,
} from '@/lib/extraServices';
import {
  CONTACT_SAFETY_WARNING,
  buildShipmentPayloadFromForm,
  getConverterAppliedSummary,
  type ConverterAppliedSummary,
} from '@/lib/customerShipmentForm';

type Step = 1 | 2 | 3;

interface CustomerAddress {
  id: number;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  isDefault: boolean;
}

interface VehicleTypeOption {
  id: string;
  name: string;
}

const CONVERTER_TO_VEHICLE_TYPE_NAME: Record<EstimateConverterResponse['recommendedVehicle'], string> = {
  panelvan: 'Panel Van',
  short_chassis_van: 'Kamyonet',
  long_chassis_van: 'Kamyonet',
  small_truck: 'Kamyon',
  large_truck: 'Kamyon',
};

export default function OfferRequestForm({ showHeader = false }: { showHeader?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [inviteCarrierId, setInviteCarrierId] = useState<string | null>(null);
  const [inviteCarrierName, setInviteCarrierName] = useState<string | null>(null);
  const [isVolumeCalculatorOpen, setIsVolumeCalculatorOpen] = useState(false);
  const [appliedConverterSummary, setAppliedConverterSummary] = useState<ConverterAppliedSummary | null>(null);
  const landingEstimateAppliedRef = useRef(false);
  const [availableExtraServices, setAvailableExtraServices] = useState<ExtraServiceOption[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<VehicleTypeOption[]>([]);
  const [form, setForm] = useState({
    originCity: '',
    originDistrict: '',
    destinationCity: '',
    destinationDistrict: '',
    date: '',
    scope: (localStorage.getItem('auto_scope') as 'sehirici' | 'sehirlerarasi' | null) || '' as '' | 'sehirici' | 'sehirlerarasi',
    transportType: '',
    placeType: '',
    loadType: '',
    vehicleType: '',
    weightKg: '',
    floor: '',
    hasElevator: false,
    dateFlexibility: 'EXACT' as 'EXACT' | 'FLEXIBLE' | 'WITHIN_WEEK',
    timeWindow: '',
    insurance: 'none' as 'none' | 'basic' | 'premium',
    extras: { asansor: false, sigorta: false, ambalaj: false },
    serviceOptions: {} as Record<string, string[]>,
    extraServices: [] as string[],
    photos: [] as File[],
    note: '',
  });

  const [availabilitySummary, setAvailabilitySummary] = useState<{ total: number; available: number } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const availabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!form.date) {
      setAvailabilitySummary(null);
      return;
    }
    if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    setIsCheckingAvailability(true);
    setAvailabilitySummary(null);
    availabilityTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/carriers/availability-summary?date=${encodeURIComponent(form.date)}`);
        const json = await res.json();
        if (res.ok && json?.success) {
          setAvailabilitySummary(json.data);
        }
      } catch {
        // silently ignore
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 400);
    return () => {
      if (availabilityTimerRef.current) clearTimeout(availabilityTimerRef.current);
    };
  }, [form.date]);

  // Load saved addresses for authenticated customers
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/me/addresses')
        .then((r) => r.json())
        .then((d) => { if (d.success) setSavedAddresses(d.data ?? []); })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.type]);

  // Load profile phone for pre-fill
  useEffect(() => {
    if (isAuthenticated && user?.type === 'customer') {
      apiClient('/api/v1/customers/profile')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            if (!d.data?.phone) {
              setNeedsPhone(true);
            } else {
              setPhone(d.data.phone);
            }
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user?.type]);

  useEffect(() => {
    apiClient('/vehicle-types')
      .then((response) => response.json())
      .then((json) => {
        const nextOptions = Array.isArray(json?.data)
          ? json.data
              .filter((item: any) => item?.status === 'ACTIVE')
              .map((item: any) => ({ id: String(item.id), name: String(item.name) }))
          : [];
        setVehicleTypeOptions(nextOptions);
      })
      .catch(() => setVehicleTypeOptions([]));
  }, []);

  // Handle URL "type" parameter mappings
  useEffect(() => {
    if (typeParam) {
      setForm((prev) => {
        let mapped = prev.transportType;
        if (typeParam === 'residential') mapped = 'evden-eve';
        else if (typeParam === 'office') mapped = 'ofis-tasima';
        else if (typeParam === 'partial') mapped = 'parca';
        else if (typeParam === 'storage') mapped = 'depolama';
        return mapped !== prev.transportType ? { ...prev, transportType: mapped } : prev;
      });
    }
  }, [typeParam]);

  // Repeat shipment: prefill from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('repeatShipment');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem('repeatShipment');

      setForm(prev => {
        const next = { ...prev };
        if (data.origin) {
          const parts = data.origin.split(', ');
          next.originCity = parts[0] ?? '';
          next.originDistrict = parts[1] ?? '';
        }
        if (data.destination) {
          const parts = data.destination.split(', ');
          next.destinationCity = parts[0] ?? '';
          next.destinationDistrict = parts[1] ?? '';
        }
        if (data.transportType) next.transportType = data.transportType;
        if (data.weight) next.weightKg = String(data.weight);
        if (data.placeType) next.placeType = data.placeType;
        if (data.floor) next.floor = String(data.floor);
        if (data.hasElevator !== undefined) next.hasElevator = data.hasElevator;
        if (data.insuranceType && data.insuranceType !== 'none') next.insurance = data.insuranceType;
        if (data.extraServices) next.extraServices = data.extraServices;
        return next;
      });

      if (data.inviteCarrierId) {
        setInviteCarrierId(data.inviteCarrierId);
        setInviteCarrierName(data.inviteCarrierName ?? null);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const ALT_OPTIONS_BY_TRANSPORT: Record<string, string[]> = {
    'evden-eve': ['1+1 ev','2+1 ev','3+1 ev','4+1 ev'],
    'ofis-tasima': ['KÃ¼Ã§Ã¼k ofis','Orta ofis','BÃ¼yÃ¼k ofis'],
    'parca': ['sadece beyaz eÅŸya','sadece mobilya','tek parÃ§a eÅŸya'],
    'depolama': ['KÃ¼Ã§Ã¼k depo','Orta depo','BÃ¼yÃ¼k depo'],
  };
  const altOptions = useMemo(() => ALT_OPTIONS_BY_TRANSPORT[form.transportType] || [], [form.transportType]);

  const SERVICE_GROUP_BY_TRANSPORT_TYPE: Record<string, string> = {
    'evden-eve': 'evden-eve',
    'parca': 'parca',
    'ofis-tasima': 'ofis',
    'depolama': 'depolama',
  };
  const currentServiceGroup = useMemo(() => SERVICE_GROUP_BY_TRANSPORT_TYPE[form.transportType] || '', [form.transportType]);
  const currentExtraServiceLoadType = useMemo(
    () => getExtraServiceLoadType((form.transportType as any) || ''),
    [form.transportType],
  );

  useEffect(() => {
    setForm(prev => {
      if (!currentServiceGroup) return { ...prev, serviceOptions: {} };
      const keep = prev.serviceOptions?.[currentServiceGroup] || [];
      return { ...prev, serviceOptions: { [currentServiceGroup]: keep } };
    });
  }, [currentServiceGroup]);

  useEffect(() => {
    let cancelled = false;

    if (!currentExtraServiceLoadType || !currentServiceGroup) {
      setAvailableExtraServices([]);
      setForm((prev) => ({ ...prev, serviceOptions: {}, extraServices: [] }));
      return;
    }

    apiClient(`/extra-services?loadType=${currentExtraServiceLoadType}`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        const nextOptions = Array.isArray(json?.data) ? json.data as ExtraServiceOption[] : [];
        setAvailableExtraServices(nextOptions);

        setForm((prev) => {
          const currentIds = prev.serviceOptions?.[currentServiceGroup] || [];
          const fallbackIds = currentIds.length
            ? currentIds
            : nextOptions
                .filter((option) => (prev.extraServices || []).includes(option.name))
                .map((option) => option.id);
          const { keptIds, removedIds } = reconcileSelectedExtraServiceIds(fallbackIds, nextOptions);

          if (removedIds.length > 0) {
            toast({
              title: 'Ek hizmetler gÃ¼ncellendi',
              description: 'YÃ¼k tÃ¼rÃ¼ deÄŸiÅŸtiÄŸi iÃ§in artÄ±k geÃ§erli olmayan seÃ§imler temizlendi.',
            });
          }

          return {
            ...prev,
            serviceOptions: { [currentServiceGroup]: keptIds },
            extraServices: mapSelectedExtraServiceNames(keptIds, nextOptions),
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableExtraServices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentExtraServiceLoadType, currentServiceGroup, toast]);

  useEffect(() => {
    if (!currentServiceGroup) return;
    const selectedIds = form.serviceOptions?.[currentServiceGroup] || [];
    const selectedNames = mapSelectedExtraServiceNames(selectedIds, availableExtraServices);
    const prevNames = form.extraServices || [];
    if (JSON.stringify(prevNames) === JSON.stringify(selectedNames)) return;

    setForm((prev) => ({ ...prev, extraServices: selectedNames }));
  }, [availableExtraServices, currentServiceGroup, form.extraServices, form.serviceOptions]);

  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destinationDistricts, setDestinationDistricts] = useState<string[]>([]);

  const progress = useMemo(() => {
    const per = 100 / 3;
    return Math.min(100, Math.max(0, Math.round(per * step)));
  }, [step]);

  const handleChange = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const requireLoginForSelection = (message?: string) => {
    if (isAuthenticated || isLoggedIn) return true;

    if (!showLoginModal) {
      setShowLoginModal(true);
      toast({
        title: 'GiriÅŸ gerekli',
        description: message ?? 'Teklif formunu doldurmak iÃ§in giriÅŸ yapmalÄ±sÄ±nÄ±z.',
      });
    }
    return false;
  };

  const getVehicleTypeLabel = (value: string) => {
    return vehicleTypeOptions.find((item) => item.id === value)?.name
      || VEHICLE_TYPES[value as keyof typeof VEHICLE_TYPES]?.name
      || '';
  };

  const mapRecommendedVehicleToVehicleTypeId = (recommendedVehicle: EstimateConverterResponse['recommendedVehicle']) => {
    const targetName = CONVERTER_TO_VEHICLE_TYPE_NAME[recommendedVehicle]?.toLocaleLowerCase('tr-TR');
    if (!targetName) return '';
    return vehicleTypeOptions.find((item) => item.name.toLocaleLowerCase('tr-TR') === targetName)?.id ?? '';
  };

  const converterInitialValues = useMemo<VolumeCalculatorInitialValues>(() => {
    const placeType = form.placeType.toLowerCase();
    const propertyType = placeType.includes('1+1')
      ? '1+1'
      : placeType.includes('2+1')
        ? '2+1'
        : placeType.includes('3+1')
          ? '3+1'
          : placeType.includes('4+1')
            ? '4+1_plus'
            : 'unknown';

    return {
      moveType: form.transportType === 'parca' ? 'partial_load' : 'household',
      propertyType,
    };
  }, [form.placeType, form.transportType]);

  const applyConverterEstimateToForm = (result: EstimateConverterResponse) => {
    const weightKg = result.estimatedWeightKg;
    const mappedVehicleTypeId = mapRecommendedVehicleToVehicleTypeId(result.recommendedVehicle);
    const recommendedVehicleLabel = mappedVehicleTypeId
      ? getVehicleTypeLabel(mappedVehicleTypeId)
      : CONVERTER_TO_VEHICLE_TYPE_NAME[result.recommendedVehicle] || result.recommendedVehicle;
    setForm((prev) => {
      const currentIds = currentServiceGroup ? (prev.serviceOptions?.[currentServiceGroup] || []) : [];
      const mergedIds = currentServiceGroup
        ? mergeSuggestedExtraServiceIds(currentIds, result.suggestedExtraServiceIds, availableExtraServices)
        : currentIds;

      return {
        ...prev,
        weightKg: String(weightKg),
        vehicleType: mappedVehicleTypeId || prev.vehicleType,
        serviceOptions: currentServiceGroup ? { [currentServiceGroup]: mergedIds } : prev.serviceOptions,
        extraServices: mapSelectedExtraServiceNames(mergedIds, availableExtraServices),
      };
    });
    setAppliedConverterSummary({
      estimatedVolumeMin: result.estimatedVolumeMin,
      estimatedVolumeMax: result.estimatedVolumeMax,
      estimatedWeightKg: result.estimatedWeightKg,
      recommendedVehicle: recommendedVehicleLabel,
    });
    toast({
      title: 'AÄŸÄ±rlÄ±k gÃ¼ncellendi',
      description: mappedVehicleTypeId
        ? `Tahmini aÄŸÄ±rlÄ±k ${weightKg} kg olarak forma uygulandÄ±.`
        : `Tahmini aÄŸÄ±rlÄ±k ${weightKg} kg olarak forma uygulandÄ±. AraÃ§ Ã¶nerisi metin olarak kaldÄ±.`,
    });
  };

  useEffect(() => {
    if (landingEstimateAppliedRef.current) return;
    const raw = sessionStorage.getItem('volumeCalculatorEstimate');
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as { result?: EstimateConverterResponse };
      const result = payload?.result;
      if (!result) return;

      landingEstimateAppliedRef.current = true;
      sessionStorage.removeItem('volumeCalculatorEstimate');

      const mappedVehicleTypeId = mapRecommendedVehicleToVehicleTypeId(result.recommendedVehicle);
      const recommendedVehicleLabel = mappedVehicleTypeId
        ? getVehicleTypeLabel(mappedVehicleTypeId)
        : CONVERTER_TO_VEHICLE_TYPE_NAME[result.recommendedVehicle] || result.recommendedVehicle;

      setForm((prev) => ({
        ...prev,
        transportType: prev.transportType || 'evden-eve',
        placeType: prev.placeType || '2+1 ev',
        weightKg: String(result.estimatedWeightKg),
        vehicleType: mappedVehicleTypeId || prev.vehicleType,
      }));
      setAppliedConverterSummary({
        estimatedVolumeMin: result.estimatedVolumeMin,
        estimatedVolumeMax: result.estimatedVolumeMax,
        estimatedWeightKg: result.estimatedWeightKg,
        recommendedVehicle: recommendedVehicleLabel,
      });
      setStep(2);
      toast({
        title: 'Hacim hesabÄ± aktarÄ±ldÄ±',
        description: 'Tahmini hacim, aÄŸÄ±rlÄ±k ve araÃ§ Ã¶nerisi forma eklendi.',
      });
    } catch {
      sessionStorage.removeItem('volumeCalculatorEstimate');
    }
  }, [toast, vehicleTypeOptions]);

  const todayStr = useMemo(() => formatDateYYYYMMDD(new Date()), []);
  const maxDateStr = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 30); return formatDateYYYYMMDD(d); }, []);
  const isDateTooFar = useMemo(() => {
    if (!form.date) return false;
    try { return new Date(form.date) > new Date(maxDateStr); } catch { return false; }
  }, [form.date, maxDateStr]);

  const canNextFrom1 = form.originCity && form.originDistrict && form.destinationCity && form.destinationDistrict && form.date && !isDateTooFar;
  const isCityFlow = form.scope === 'sehirici' || form.scope === 'sehirlerarasi';
  const canNextFrom2 = !!form.scope && !!form.transportType && (isCityFlow ? true : !!form.placeType);
  const previewEstimate = useMemo(() => {
    if (!(canNextFrom1 && canNextFrom2)) return null;

    const base = form.scope === 'sehirlerarasi' ? 4000 : 1500;
    const transportMultiplier: Record<string, number> = {
      'evden-eve': 1.45,
      'ofis-tasima': 1.65,
      parca: 0.85,
      depolama: 1.2,
    };
    const serviceGroup = SERVICE_GROUP_BY_TRANSPORT_TYPE[form.transportType] || '';
    const selectedServices = serviceGroup ? (form.serviceOptions?.[serviceGroup] || []) : [];
    const floorFee = Number(form.floor || 0) > 2 && !form.hasElevator ? 450 : 0;
    const insuranceFee = form.insurance === 'premium' ? 700 : form.insurance === 'basic' ? 350 : 0;
    const extrasFee = selectedServices.length * 250;
    const midpoint = Math.round((base * (transportMultiplier[form.transportType] || 1)) + floorFee + insuranceFee + extrasFee);
    const min = Math.max(750, Math.round(midpoint * 0.85));
    const max = Math.round(midpoint * 1.25);
    const format = (value: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(value);

    return {
      range: `${format(min)} - ${format(max)} TL`,
      carrierCount: availabilitySummary?.available,
    };
  }, [
    availabilitySummary?.available,
    canNextFrom1,
    canNextFrom2,
    form.floor,
    form.hasElevator,
    form.insurance,
    form.scope,
    form.serviceOptions,
    form.transportType,
  ]);

  const TEMPLATE_WEIGHTS: Record<string, number> = {
    '1+1 ev': 800,
    '2+1 ev': 1500,
    '3+1 ev': 2500,
    '4+1 ev': 3500,
    'sadece beyaz eÅŸya': 400,
    'sadece mobilya': 800,
    'tek parÃ§a eÅŸya': 100,
    'KÃ¼Ã§Ã¼k ofis': 1000,
    'Orta ofis': 2000,
    'BÃ¼yÃ¼k ofis': 3500,
    'KÃ¼Ã§Ã¼k depo': 1200,
    'Orta depo': 2200,
    'BÃ¼yÃ¼k depo': 4000,
  };

  const suitableCarriersBase = useMemo(() => {
    if (!(canNextFrom1 && canNextFrom2)) return [] as Carrier[];
    // Backend zaten tarih filtresi uyguladÄ±.
    // ServiceAreas verisi tutarsÄ±z (bÃ¶lge adlarÄ± vs ÅŸehir adlarÄ± karÄ±ÅŸÄ±k) olduÄŸundan
    // rota eÅŸleÅŸmesini zorunlu tutmuyoruz; CarrierCard'daki badge zaten gÃ¶steriyor.
    return carriers;
  }, [canNextFrom1, canNextFrom2, carriers]);

  const isLoggedIn = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('userToken')) || Boolean(getSessionUser());
    } catch {
      return Boolean(getSessionUser());
    }
  }, []);

  // Step 3 aÃ§Ä±ldÄ±ÄŸÄ±nda backend'den filtrelenmiÅŸ nakliyecileri Ã§ek
  useEffect(() => {
    if (step !== 3 || !isLoggedIn) return;
    if (!form.originCity || !form.destinationCity || !form.date) return;

    setLoadingResults(true);
    setCarriers([]);

    // Sadece tarih filtresi â€” serviceAreas verisi tutarsÄ±z olduÄŸundan backend'e gÃ¶nderilmiyor
    const params = new URLSearchParams({ availableDate: form.date, limit: '50' });

    const token = localStorage.getItem('authToken');
    fetch(`/api/v1/carriers/search?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.items)) {
          setCarriers(json.data.items.map(mapSearchResultToCarrier));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [step, form.originCity, form.destinationCity, form.date, isLoggedIn]);

  const [onlyApproved, setOnlyApproved] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'capacity' | 'price'>('rating');

  const suitableCarriers = useMemo(() => {
    let list = suitableCarriersBase;
    if (onlyApproved) list = list.filter(c => c.isApproved);
    if (minRating > 0) list = list.filter(c => c.rating >= minRating);
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'capacity') return b.vehicle.capacity - a.vehicle.capacity;
      return a.baseFee - b.baseFee;
    });
    return sorted;
  }, [suitableCarriersBase, onlyApproved, minRating, sortBy]);

  const goNext = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const handleGoToStep3 = () => {
    if (!canNextFrom2) return;
    if (!isLoggedIn) {
      toast({ title: 'GiriÅŸ gerekli', description: 'Devam edebilmek iÃ§in giriÅŸ yapmalÄ±sÄ±nÄ±z!' });
      setStep(3);
      setShowLoginModal(true);
      return;
    }
    setStep(3);
  };

  useEffect(() => {
    if (searchParams.get('calculator') === '1') {
      setIsVolumeCalculatorOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!altOptions.length && form.placeType) handleChange('placeType', '');
  }, [altOptions.length]);

  useEffect(() => {
    if (!form.originCity || !form.destinationCity) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    if (form.scope !== autoScope) setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
  }, [form.originCity, form.destinationCity]);

  useEffect(() => {
    (async () => {
      if (form.originCity) {
        const list = await getDistrictsForCity(form.originCity);
        setOriginDistricts(list);
        if (!list.includes(form.originDistrict)) handleChange('originDistrict', '');
      } else {
        setOriginDistricts([]);
        handleChange('originDistrict', '');
      }
    })();
  }, [form.originCity]);

  useEffect(() => {
    (async () => {
      if (form.destinationCity) {
        const list = await getDistrictsForCity(form.destinationCity);
        setDestinationDistricts(list);
        if (!list.includes(form.destinationDistrict)) handleChange('destinationDistrict', '');
      } else {
        setDestinationDistricts([]);
        handleChange('destinationDistrict', '');
      }
    })();
  }, [form.destinationCity]);

  // TÃ¼m form verilerinden shipment payload'u Ã¼retir
  const buildShipmentPayload = () => {
    return buildShipmentPayloadFromForm(form, {
      phone,
      templateWeights: TEMPLATE_WEIGHTS,
      vehicleTypeOptions,
    });
  };

  // Profil telefonunu gÃ¼ncelle (opsiyonel, sadece numara yoksa)
  const savePhoneIfNeeded = async () => {
    if (needsPhone && phone.trim()) {
      await apiClient('/api/v1/customers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      }).catch(() => {});
      setNeedsPhone(false);
    }
  };

  // Talebi yayÄ±nla â€” nakliyeci seÃ§meden marketplace'e gÃ¶nderir
  const publishRequest = async () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    if (needsPhone && !phone.trim()) {
      toast({ title: 'Telefon gerekli', description: 'Nakliyecilerin sizi arayabilmesi iÃ§in telefon numarasÄ± gereklidir.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await savePhoneIfNeeded();
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/shipments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildShipmentPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        const newShipmentId = json.data?.id;
        // Davet gÃ¶nder (baÅŸarÄ±sÄ±z olsa bile talep oluÅŸturuldu sayÄ±lÄ±r)
        if (inviteCarrierId && newShipmentId) {
          try {
            await apiClient(`/api/v1/shipments/${newShipmentId}/invite/${inviteCarrierId}`, { method: 'POST' });
            toast({ title: `${inviteCarrierName || 'Nakliyeci'} davet edildi`, description: 'Firma talebinizi gÃ¶rÃ¼p teklif verebilir.' });
          } catch {
            // davet baÅŸarÄ±sÄ±z â€” devam et
          }
        } else {
          toast({ title: 'Talep yayÄ±nlandÄ±!', description: 'Nakliyecilerden teklifler gelmeye baÅŸlayacak.' });
        }
        navigate('/ilanlarim');
      } else {
        toast({ title: 'Hata', description: json?.message || 'Talep oluÅŸturulamadÄ±.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'BaÄŸlantÄ± HatasÄ±', description: 'Sunucuya baÄŸlanÄ±lamadÄ±.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const requestOffer = async (carrier: Carrier) => {
    const sessionUser = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (!sessionUser) {
      toast({ title: 'GiriÅŸ gerekli', description: 'Teklif gÃ¶ndermek iÃ§in giriÅŸ yapmalÄ±sÄ±nÄ±z.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await savePhoneIfNeeded();
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/shipments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildShipmentPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        toast({ title: 'BaÅŸarÄ±lÄ±', description: `${carrier.name} ${carrier.surname} adlÄ± nakliyeciye teklif isteÄŸi gÃ¶nderildi.` });
        navigate('/ilanlarim');
      } else {
        toast({ title: 'Hata', description: json?.message || 'Ä°lan oluÅŸturulamadÄ±.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'BaÄŸlantÄ± HatasÄ±', description: 'Sunucuya baÄŸlanÄ±lamadÄ±.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNextFrom1) return;
    const autoScope: 'sehirici' | 'sehirlerarasi' = form.originCity === form.destinationCity ? 'sehirici' : 'sehirlerarasi';
    setForm(f => ({ ...f, scope: autoScope }));
    try { localStorage.setItem('auto_scope', autoScope); } catch {}
    goNext();
  };
  const submitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canNextFrom2) return;
    if (!isLoggedIn) {
      toast({ title: 'GiriÅŸ gerekli', description: 'Devam edebilmek iÃ§in giriÅŸ yapmalÄ±sÄ±nÄ±z!' });
      setShowLoginModal(true);
      setStep(3);
      return;
    }
    goNext();
  };

  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 400);
      return () => clearTimeout(t);
    }
  }, [step]);
  useEffect(() => {
    if (step === 3) {
      setLoadingResults(true);
      const t = setTimeout(() => setLoadingResults(false), 300);
      return () => clearTimeout(t);
    }
  }, [onlyApproved, minRating, sortBy, suitableCarriersBase, step]);

  useEffect(() => {
    if (step === 3 && !isLoggedIn) {
      setShowLoginModal(true);
    }
  }, [step, isLoggedIn]);

  const closeLoginModal = () => {
    setShowLoginModal(false);
    if (step === 3) setStep(2);
  };

  /* â”€â”€ step labels â”€â”€ */
  const STEPS = [
    { id: 1, label: 'Rota Bilgisi' },
    { id: 2, label: 'YÃ¼k Bilgisi' },
    { id: 3, label: 'Ã–zet & YayÄ±nla' },
  ];

  /* â”€â”€ transport types for step 2 grid â”€â”€ */
  const TRANSPORT_CARDS: { value: string; emoji: string; label: string }[] = [
    { value: 'evden-eve', emoji: 'ğŸ ', label: 'Ev EÅŸyasÄ±' },
    { value: 'ofis-tasima', emoji: 'ğŸ¢', label: 'Ofis' },
    { value: 'parca', emoji: 'ğŸ“¦', label: 'ParÃ§a EÅŸya' },
    { value: 'depolama', emoji: 'ğŸšš', label: 'Depolama' },
  ];

  /* â”€â”€ shared input style â”€â”€ */
  const inputStyle: React.CSSProperties = {
    height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px',
    padding: '0 14px', fontSize: '14px', color: '#0F172A', background: 'white',
    transition: 'border-color 150ms, box-shadow 150ms', outline: 'none', width: '100%',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' };
  const converterAppliedRows = getConverterAppliedSummary(appliedConverterSummary);

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px' }}>

        {/* â•â•â• PAGE HEADER â•â•â• */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', marginBottom: '12px' }}>
            <Link to="/home" style={{ color: '#94A3B8', textDecoration: 'none' }}>Ana Sayfa</Link>
            <span style={{ color: '#CBD5E1', margin: '0 6px' }}>/</span>
            <span style={{ color: '#0F172A', fontWeight: 500 }}>TaÅŸÄ±ma Talebi OluÅŸtur</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            TaÅŸÄ±ma Talebi OluÅŸtur
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', marginTop: '6px' }}>
            3 adÄ±mda ilanÄ±nÄ±zÄ± oluÅŸturup yayÄ±nlayÄ±n
          </p>
        </div>

        {/* â•â•â• STEP INDICATOR â•â•â• */}
        <div style={{ marginBottom: '32px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px 32px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20px', right: '32px', fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
            %{progress}
          </div>
          <div className="flex items-center justify-between">
            {STEPS.map((st, i) => {
              const done = step > st.id;
              const active = step === st.id;
              return (
                <div key={st.id} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
                  <div className="flex flex-col items-center" style={{ gap: '8px' }}>
                    {/* circle */}
                    {done ? (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563EB' }}>
                        <Check style={{ width: '16px', height: '16px', color: 'white' }} />
                      </div>
                    ) : active ? (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '2px solid #2563EB', boxShadow: '0 0 0 4px #EFF6FF' }}>
                        <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '15px' }}>{st.id}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9' }}>
                        <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '15px' }}>{st.id}</span>
                      </div>
                    )}
                    {/* label */}
                    <span style={{ fontSize: '13px', fontWeight: done || active ? 500 : 400, color: done || active ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                      {st.label}
                    </span>
                  </div>
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: '2px', margin: '0 8px', marginBottom: '20px', background: step > st.id ? '#2563EB' : '#E2E8F0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* â•â•â• FORM CARD â•â•â• */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>

          {/* â”€â”€ STEP 1: ROTA â”€â”€ */}
          {step === 1 && (
            <form onSubmit={submitStep1}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>Rota Bilgisi</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Ã‡Ä±kÄ±ÅŸ ve varÄ±ÅŸ noktalarÄ±nÄ± belirleyin</div>
                </div>
              </div>

              {/* Saved addresses quick-fill */}
              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <label style={{ ...labelStyle, color: '#1D4ED8', marginBottom: '8px' }}>
                    ğŸ“Œ KayÄ±tlÄ± adreslerden Ã§Ä±kÄ±ÅŸ noktasÄ± seÃ§
                  </label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (!requireLoginForSelection()) return;
                      const addr = savedAddresses.find((a) => String(a.id) === val);
                      if (addr) {
                        handleChange('originCity', addr.city);
                        handleChange('originDistrict', addr.district);
                      }
                    }}
                  >
                    <SelectTrigger style={{ ...inputStyle, background: 'white' }}>
                      <SelectValue placeholder="KayÄ±tlÄ± adres seÃ§in..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.label ? `${a.label} â€” ` : ''}{a.city}, {a.district}
                          {a.isDefault ? ' (VarsayÄ±lan)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Route grid: origin â†’ arrow â†’ destination */}
              <div className="grid items-end" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '12px' }}>
                {/* Origin */}
                <div>
                  <div className="flex items-center" style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>ğŸ“</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ã‡Ä±kÄ±ÅŸ NoktasÄ±</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Åehir <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.originCity} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('originCity', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Åehir seÃ§in" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>Ä°lÃ§e <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.originDistrict} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('originDistrict', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Ä°lÃ§e seÃ§in" /></SelectTrigger>
                        <SelectContent>{originDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', marginBottom: '4px' }}>
                  <ArrowRight style={{ width: '20px', height: '20px', color: '#2563EB' }} />
                </div>

                {/* Destination */}
                <div>
                  <div className="flex items-center" style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>ğŸ“</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>VarÄ±ÅŸ NoktasÄ±</span>
                  </div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Åehir <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.destinationCity} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('destinationCity', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Åehir seÃ§in" /></SelectTrigger>
                        <SelectContent>{CITIES_TR.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label style={labelStyle}>Ä°lÃ§e <span style={{ color: '#EF4444' }}>*</span></label>
                      <Select value={form.destinationDistrict} onValueChange={(v) => {
                        if (!requireLoginForSelection()) return;
                        handleChange('destinationDistrict', v);
                      }}>
                        <SelectTrigger style={inputStyle}><SelectValue placeholder="Ä°lÃ§e seÃ§in" /></SelectTrigger>
                        <SelectContent>{destinationDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div style={{ marginTop: '20px' }}>
                <label style={labelStyle}>TaÅŸÄ±ma Tarihi <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="date"
                    value={form.date}
                    min={todayStr}
                    max={maxDateStr}
                    onChange={(e) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('date', e.target.value);
                    }}
                    aria-invalid={isDateTooFar}
                    required
                    style={inputStyle}
                  />
                </div>
                {isDateTooFar && (
                  <div style={{ fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>30 gÃ¼nden ileri bir tarihte gÃ¼n seÃ§emezsiniz.</div>
                )}
                {!isDateTooFar && (isCheckingAvailability || availabilitySummary) && (
                  <div style={{ fontSize: '13px', marginTop: '6px' }}>
                    {isCheckingAvailability ? (
                      <span style={{ color: '#64748B' }}>MÃ¼saitlik kontrol ediliyor...</span>
                    ) : availabilitySummary ? (
                      <span style={{ color: availabilitySummary.available > 0 ? '#16A34A' : '#DC2626' }}>
                        Bu tarihte aktif {availabilitySummary.available} nakliyeci gÃ¶rÃ¼nÃ¼yor
                        {availabilitySummary.available === 0 && ' â€” baÅŸka bir tarih seÃ§meyi deneyin'}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="flex justify-end" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={!canNextFrom1}
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: canNextFrom1 ? '#2563EB' : '#94A3B8', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: canNextFrom1 ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}
                >
                  Devam â†’
                </button>
              </div>
            </form>
          )}

          {/* â”€â”€ STEP 2: YÃœK BÄ°LGÄ°SÄ° â”€â”€ */}
          {step === 2 && (
            <form onSubmit={submitStep2}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>YÃ¼k Bilgisi</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>TaÅŸÄ±nacak yÃ¼k tipini ve detaylarÄ±nÄ± belirtin</div>
                </div>
              </div>

              {/* Transport type cards */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>YÃ¼k TÃ¼rÃ¼ <span style={{ color: '#EF4444' }}>*</span></label>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {TRANSPORT_CARDS.map(tc => {
                    const sel = form.transportType === tc.value;
                    return (
                      <div
                        key={tc.value}
                        onClick={() => {
                          if (!requireLoginForSelection()) return;
                          handleChange('transportType', tc.value);
                        }}
                        className="cursor-pointer text-center transition-all duration-150"
                        style={{
                          border: sel ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          borderRadius: '12px', padding: '16px',
                          background: sel ? '#EFF6FF' : 'white',
                          boxShadow: sel ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tc.emoji}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: sel ? '#2563EB' : '#374151' }}>{tc.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scope (auto) */}
              {form.scope && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>TaÅŸÄ±ma KapsamÄ±</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', background: '#F8FAFC', color: '#64748B', cursor: 'default' }}>
                    {form.scope === 'sehirici' ? 'Åehir Ä°Ã§i' : form.scope === 'sehirlerarasi' ? 'ÅehirlerarasÄ±' : '-'}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#94A3B8' }}>(otomatik)</span>
                  </div>
                </div>
              )}

              {/* Detail fields â€“ 2col grid */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {altOptions.length > 0 && (
                  <div>
                    <label style={labelStyle}>Yer Tipi</label>
                    <Select value={form.placeType} onValueChange={(v) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('placeType', v);
                    }}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="SeÃ§in" /></SelectTrigger>
                      <SelectContent>{altOptions.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                {form.transportType === 'parca' && (
                  <div>
                    <label style={labelStyle}>YÃ¼k TÃ¼rÃ¼ (opsiyonel)</label>
                    <Select value={form.loadType} onValueChange={(v) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('loadType', v);
                    }}>
                      <SelectTrigger style={inputStyle}><SelectValue placeholder="SeÃ§in" /></SelectTrigger>
                      <SelectContent>{Object.entries(LOAD_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>AraÃ§ Tercihi (opsiyonel)</label>
                  <Select value={form.vehicleType} onValueChange={(v) => {
                    if (!requireLoginForSelection()) return;
                    handleChange('vehicleType', v);
                  }}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="AraÃ§ seÃ§in" /></SelectTrigger>
                    <SelectContent>
                      {vehicleTypeOptions.length > 0
                        ? vehicleTypeOptions.map((item) => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))
                        : Object.entries(VEHICLE_TYPES).map(([k, v]) => (<SelectItem key={k} value={k}>{v.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Tahmini AÄŸÄ±rlÄ±k (kg)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.weightKg}
                    onChange={(e) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('weightKg', e.target.value);
                    }}
                    placeholder="Ã–rn. 1200"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Kat</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.floor}
                    onChange={(e) => {
                      if (!requireLoginForSelection()) return;
                      handleChange('floor', e.target.value);
                    }}
                    placeholder="Ã–rn. 3"
                    style={inputStyle}
                  />
                </div>
                {form.floor && (
                  <div className="flex items-end" style={{ paddingBottom: '8px' }}>
                    <label className="flex items-center cursor-pointer" style={{ gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={form.hasElevator}
                        onChange={(e) => {
                          if (!requireLoginForSelection()) return;
                          handleChange('hasElevator', e.target.checked);
                        }}
                        style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', color: '#374151' }}>Bina AsansÃ¶rÃ¼ Var</span>
                    </label>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Sigorta TÃ¼rÃ¼</label>
                  <Select value={form.insurance} onValueChange={(v) => {
                    if (!requireLoginForSelection()) return;
                    handleChange('insurance', v);
                  }}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="SeÃ§in" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ä°stemiyorum</SelectItem>
                      <SelectItem value="basic">Temel Sigorta</SelectItem>
                      <SelectItem value="premium">Tam Sigorta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Zaman Tercihi</label>
                  <Select value={form.timeWindow} onValueChange={(v) => {
                    if (!requireLoginForSelection()) return;
                    handleChange('timeWindow', v);
                  }}>
                    <SelectTrigger style={inputStyle}><SelectValue placeholder="SeÃ§in" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sabah">Sabah (08:00-12:00)</SelectItem>
                      <SelectItem value="ogle">Ã–ÄŸlen (12:00-17:00)</SelectItem>
                      <SelectItem value="aksam">AkÅŸam (17:00-22:00)</SelectItem>
                      <SelectItem value="farketmez">Farketmez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div style={{ marginBottom: '24px', padding: '12px', border: '1px solid #BFDBFE', borderRadius: '10px', background: '#EFF6FF' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D4ED8' }}>Hacmi Hesapla</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>EÅŸya listesi ile tahmini hacim ve aÄŸÄ±rlÄ±k hesabÄ± yapÄ±n.</div>
                  </div>
                  <Button type="button" onClick={() => {
                    if (!requireLoginForSelection()) return;
                    setIsVolumeCalculatorOpen(true);
                  }}>
                    Hacmi Hesapla
                  </Button>
                </div>
              </div>

              {/* Extra services */}
              {currentServiceGroup && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Ek Hizmetler</label>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {availableExtraServices.map((option) => {
                      const checked = (form.serviceOptions?.[currentServiceGroup] || []).includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className="flex items-center cursor-pointer transition-colors"
                          style={{
                            gap: '8px', padding: '10px 14px',
                            border: checked ? '1px solid #2563EB' : '1px solid #E2E8F0',
                            borderRadius: '8px',
                            background: checked ? '#EFF6FF' : 'white',
                          }}
                          onClick={() => {
                            if (!requireLoginForSelection()) return;
                            setForm(prev => {
                              const current = new Set(prev.serviceOptions?.[currentServiceGroup] || []);
                              if (current.has(option.id)) current.delete(option.id); else current.add(option.id);
                              return {
                                ...prev,
                                serviceOptions: { [currentServiceGroup]: Array.from(current) },
                                extraServices: mapSelectedExtraServiceNames(Array.from(current), availableExtraServices),
                              };
                            });
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>{option.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Photos */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>FotoÄŸraf (opsiyonel)</label>
                <FileUpload
                  label="EÅŸyalarÄ±n FotoÄŸraflarÄ±"
                  description="Daha doÄŸru teklif iÃ§in fotoÄŸraf ekleyin. (JPG/PNG, max 5MB)"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  maxSize={5}
                  uploadedFiles={form.photos as any}
                  onUpload={(files) => handleChange('photos', files as any)}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>AÃ§Ä±klama (opsiyonel)</label>
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Ã–rn. hassas eÅŸyalar var, 3. kat, vs."
                  style={{ minHeight: '80px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', resize: 'vertical', fontSize: '14px' }}
                  className="focus:border-[#2563EB] focus:ring-[3px] focus:ring-[rgba(37,99,235,0.1)]"
                />
              </div>

              {previewEstimate && (
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #BFDBFE', borderRadius: '12px', background: '#EFF6FF' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D4ED8', marginBottom: '6px' }}>Tahmini fiyat Ã¶nizlemesi</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>{previewEstimate.range}</div>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                    Bu aralÄ±k rota, yÃ¼k tipi ve seÃ§tiÄŸiniz ek hizmetlere gÃ¶re bilgilendirme amaÃ§lÄ±dÄ±r.
                    {typeof previewEstimate.carrierCount === 'number' && ` Bu tarihte ${previewEstimate.carrierCount} aktif nakliyeci gÃ¶rÃ¼nÃ¼yor.`}
                  </p>
                </div>
              )}

              {/* Action bar */}
              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[#F8FAFC] transition-colors"
                  style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  â† Geri
                </button>
                <button
                  type="submit"
                  disabled={!canNextFrom2}
                  className="hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: canNextFrom2 ? '#2563EB' : '#94A3B8', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: canNextFrom2 ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}
                >
                  Devam â†’
                </button>
              </div>
            </form>
          )}

          {/* â”€â”€ STEP 3: Ã–ZET & YAYINLA â”€â”€ */}
          {step === 3 && (
            <div className={showLoginModal ? 'pointer-events-none blur-sm' : ''} aria-hidden={showLoginModal}>
              {/* Card header */}
              <div className="flex items-center" style={{ gap: '12px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9', marginBottom: '24px' }}>
                <div className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>Ã–zet & YayÄ±nla</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Bilgileri kontrol edin</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', color: '#92400E', fontSize: '13px', lineHeight: 1.5 }}>
                {CONTACT_SAFETY_WARNING}
              </div>

              {/* Summary cards â€“ 2 col */}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Rota Bilgileri */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '16px' }}>Rota Bilgileri</div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREDEN</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                      {form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center justify-center" style={{ margin: '12px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                    <div className="flex items-center justify-center" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', margin: '0 8px' }}>
                      <ArrowRight style={{ width: '14px', height: '14px', color: '#2563EB' }} />
                    </div>
                    <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>NEREYE</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                      {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}
                    </div>
                  </div>

                  {form.date && (
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '14px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                        ğŸ“… {new Date(form.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* YÃ¼k DetaylarÄ± */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '16px' }}>YÃ¼k DetaylarÄ±</div>
                  <div className="flex flex-col" style={{ gap: '10px' }}>
                    {form.transportType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>TaÅŸÄ±ma Tipi</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                          {TRANSPORT_CARDS.find(t => t.value === form.transportType)?.label || form.transportType}
                        </span>
                      </div>
                    )}
                    {form.scope && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Kapsam</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.scope === 'sehirici' ? 'Åehir Ä°Ã§i' : 'ÅehirlerarasÄ±'}</span>
                      </div>
                    )}
                    {form.placeType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Yer TÃ¼rÃ¼</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.placeType}</span>
                      </div>
                    )}
                    {form.vehicleType && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>AraÃ§</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{getVehicleTypeLabel(form.vehicleType)}</span>
                      </div>
                    )}
                    {form.floor && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Kat</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.floor}. kat {form.hasElevator ? '(asansÃ¶rlÃ¼)' : ''}</span>
                      </div>
                    )}
                    {form.timeWindow && (
                      <div className="flex justify-between">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Zaman</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{form.timeWindow}</span>
                      </div>
                    )}
                    {form.insurance !== 'none' && (
                      <div className="flex justify-between items-center">
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Sigorta</span>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '6px' }}>
                          {form.insurance === 'basic' ? 'Temel' : 'Tam'} Sigorta
                        </span>
                      </div>
                    )}
                    {/* Extra services chips */}
                    {(() => {
                      const svcGroup = ({'evden-eve': 'evden-eve', 'parca': 'parca', 'ofis-tasima': 'ofis', 'depolama': 'depolama'} as Record<string, string>)[form.transportType];
                      const selected = svcGroup ? (form.serviceOptions?.[svcGroup] || []) : [];
                      const allOpts = new Map(availableExtraServices.map((option) => [option.id, option.name]));
                      if (!selected.length) return null;
                      return (
                        <div>
                          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px' }}>Ek Hizmetler</span>
                          <div className="flex flex-wrap" style={{ gap: '4px' }}>
                            {selected.map((k: string) => (
                              <span key={k} style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', color: '#374151' }}>
                                {allOpts.get(k) || k}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {form.note && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Not</span>
                        <span style={{ fontSize: '13px', color: '#0F172A' }}>{form.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {converterAppliedRows.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#047857', marginBottom: '6px' }}>Hacim hesaplayÄ±cÄ± forma uygulandÄ±</div>
                  <div className="flex flex-wrap" style={{ gap: '6px' }}>
                    {converterAppliedRows.map((row) => (
                      <span key={row} style={{ background: 'white', border: '1px solid #D1FAE5', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#065F46' }}>
                        {row}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite banner */}
              {inviteCarrierId && inviteCarrierName && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center" style={{ gap: '8px', fontSize: '13px', color: '#1E40AF' }}>
                    <UserCheck style={{ width: '16px', height: '16px' }} />
                    <span><strong>{inviteCarrierName}</strong> bu talebe Ã¶ncelikli davet edilecek</span>
                  </div>
                  <button onClick={() => { setInviteCarrierId(null); setInviteCarrierName(null); }} style={{ fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>KaldÄ±r</button>
                </div>
              )}

              {/* Phone â€” her zaman gÃ¶ster; profil varsa pre-fill, yoksa gerekli */}
              <div style={{ marginBottom: '20px', padding: '16px', background: needsPhone ? '#FFFBEB' : '#F8FAFC', border: `1px solid ${needsPhone ? '#FDE68A' : '#E2E8F0'}`, borderRadius: '12px' }}>
                <div className="flex items-center" style={{ gap: '8px', marginBottom: '10px' }}>
                  <Phone style={{ width: '16px', height: '16px', color: needsPhone ? '#D97706' : '#64748B' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: needsPhone ? '#92400E' : '#374151' }}>
                    {needsPhone ? 'Telefon numaranÄ±zÄ± ekleyin' : 'Ä°letiÅŸim numarasÄ±'}
                  </span>
                </div>
                {needsPhone && (
                  <p style={{ fontSize: '13px', color: '#92400E', marginBottom: '10px' }}>
                    Nakliyecilerin sizi arayabilmesi iÃ§in telefon numarasÄ± gereklidir.
                  </p>
                )}
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  style={{ ...inputStyle, background: 'white' }}
                />
                {!needsPhone && (
                  <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                    Profilinizdeki numara kullanÄ±lÄ±yor. Bu talep iÃ§in farklÄ± bir numara girebilirsiniz.
                  </p>
                )}
              </div>

              {/* Edit links */}
              <div className="flex" style={{ gap: '16px', marginTop: '8px', marginBottom: '24px' }}>
                <span onClick={() => setStep(1)} className="hover:underline" style={{ fontSize: '13px', color: '#2563EB', cursor: 'pointer' }}>âœï¸ AdÄ±m 1'i DÃ¼zenle</span>
                <span onClick={() => setStep(2)} className="hover:underline" style={{ fontSize: '13px', color: '#2563EB', cursor: 'pointer' }}>âœï¸ AdÄ±m 2'yi DÃ¼zenle</span>
              </div>

              {/* Suitable carriers (existing logic preserved) */}
              {isLoggedIn && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', marginBottom: '12px' }}>Uygun Nakliyeciler</div>
                  <div className="flex flex-wrap items-end" style={{ gap: '12px', marginBottom: '12px' }}>
                    <label className="flex items-center" style={{ gap: '6px', fontSize: '13px', color: '#374151' }}>
                      <input type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} style={{ accentColor: '#2563EB' }} />
                      Sadece OnaylÄ±
                    </label>
                    <div>
                      <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                        <SelectTrigger style={{ ...inputStyle, width: '140px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="Min. Puan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Farketmez</SelectItem>
                          <SelectItem value="3">3+</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                          <SelectItem value="4.5">4.5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger style={{ ...inputStyle, width: '180px', height: '36px', fontSize: '13px' }}><SelectValue placeholder="SÄ±rala" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating">Puan (yÃ¼ksek â†’ dÃ¼ÅŸÃ¼k)</SelectItem>
                          <SelectItem value="reviews">Yorum sayÄ±sÄ±</SelectItem>
                          <SelectItem value="capacity">Kapasite</SelectItem>
                          <SelectItem value="price">Fiyat (taban Ã¼cret)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button onClick={() => { setOnlyApproved(false); setMinRating(0); setSortBy('rating'); }} style={{ fontSize: '12px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>SÄ±fÄ±rla</button>
                  </div>

                  {loadingResults ? (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : suitableCarriers.length === 0 ? (
                    <div className="flex items-center" style={{ gap: '8px', padding: '20px', border: '1px dashed #E2E8F0', borderRadius: '10px', fontSize: '13px', color: '#64748B' }}>
                      <Info style={{ width: '16px', height: '16px' }} /> Kriterlerinize uygun nakliyeci bulunamadÄ±.
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: '8px' }}>
                      {suitableCarriers.map((c) => (
                        <CarrierCard key={c.id} carrier={c} form={form} onRequest={() => requestOffer(c)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex justify-between items-center" style={{ paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={goPrev}
                  className="hover:!bg-[#F8FAFC] transition-colors"
                  style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', color: '#374151', background: 'white', cursor: 'pointer' }}
                >
                  â† Geri
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  className="inline-flex items-center hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                  style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '15px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', gap: '8px', transition: 'all 150ms' }}
                  onClick={publishRequest}
                >
                  {submitting ? (
                    <><Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> YayÄ±nlanÄ±yor...</>
                  ) : (
                    <><Check style={{ width: '16px', height: '16px' }} /> Talebi YayÄ±nla</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Required Modal */}
      <AnimatePresence>
        {showLoginModal && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/70 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white shadow-2xl rounded-xl p-8 text-center max-w-md w-full"
            >
              <button onClick={closeLoginModal} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Devam edebilmek iÃ§in giriÅŸ yapmalÄ±sÄ±nÄ±z</h3>
              <p className="text-sm text-gray-600 mt-2">Teklif isteyebilmek ve nakliyecilerle iletiÅŸime geÃ§ebilmek iÃ§in giriÅŸ yapÄ±n veya Ã¼cretsiz kayÄ±t olun.</p>
              <div className="mt-6 flex justify-center gap-4">
                <Button onClick={() => navigate('/giris')}>GiriÅŸ Yap</Button>
                <Button variant="outline" onClick={() => navigate('/musteri-kayit')}>Ãœye Ol</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VolumeCalculatorModal
        open={isVolumeCalculatorOpen}
        onOpenChange={setIsVolumeCalculatorOpen}
        onApplyEstimate={applyConverterEstimateToForm}
        loadType={currentExtraServiceLoadType}
        initialValues={converterInitialValues}
      />
    </div>
  );
}

function SummaryCard({ step, form, onEditStep }: { step: Step; form: any; onEditStep: (s: Step) => void }) {
  const routeReady = form.originCity && form.destinationCity && form.date;
  const isCityFlow = form.scope === 'sehirici' || form.scope === 'sehirlerarasi';
  const prefsReady = (!!form.scope) && (isCityFlow ? true : (form.placeType || form.loadType)) && form.transportType;
  const summaryGroupKey = (() => {
    const map: Record<string, string> = {
      'evden-eve': 'evden-eve',
      'parca': 'parca',
      'sehirlerarasi': 'sehirlerarasi',
      'sehirici': 'sehirici',
      'ofis-tasima': 'ofis',
      'depolama': 'depolama',
    };
    return map[form.transportType] || '';
  })();
  return (
    <Card>
      <CardHeader>
        <CardTitle>SeÃ§imler Ã–zeti</CardTitle>
        <CardDescription>AdÄ±mlar arasÄ± hÄ±zlÄ± kontrol</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">Rota</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(1)}>DÃ¼zenle</Button>
          </div>
          <div className="text-gray-700">
            {routeReady ? (
              <div>
                <div>{form.originCity}{form.originDistrict ? `, ${form.originDistrict}` : ''} â†’ {form.destinationCity}{form.destinationDistrict ? `, ${form.destinationDistrict}` : ''}</div>
                <div className="text-xs text-gray-500">Tarih: {form.date || '-'}</div>
              </div>
            ) : (
              <div className="text-gray-400">HenÃ¼z doldurulmadÄ±</div>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <div className="flex items-center justify-between">
            <div className="font-medium">YÃ¼k & Tercihler</div>
            <Button size="sm" variant="ghost" onClick={() => onEditStep(2)}>DÃ¼zenle</Button>
          </div>
          <div className="text-gray-700 space-y-1">
            {prefsReady ? (
              <>
                <div>TaÅŸÄ±ma KapsamÄ±: {form.scope === 'sehirici' ? 'Åehir Ä°Ã§i' : form.scope === 'sehirlerarasi' ? 'ÅehirlerarasÄ±' : '-'}</div>
                <div>TaÅŸÄ±ma Tipi: {form.transportType || '-'}</div>
                {form.placeType && <div>Yer TÃ¼rÃ¼: {form.placeType}</div>}
                {form.loadType && <div>YÃ¼k TÃ¼rÃ¼: {LOAD_TYPES[form.loadType as keyof typeof LOAD_TYPES]}</div>}
                {form.vehicleType && <div>AraÃ§: {VEHICLE_TYPES[form.vehicleType as keyof typeof VEHICLE_TYPES]?.name}</div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.hasElevator && <Badge variant="secondary">Bina asansÃ¶rÃ¼</Badge>}
                  {form.insurance !== 'none' && <Badge variant="secondary">Sigorta: {form.insurance}</Badge>}
                  {form.timeWindow && <Badge variant="secondary">Zaman: {form.timeWindow}</Badge>}
                  {summaryGroupKey && (
                    <Badge variant="secondary">
                      {SPECIAL_SERVICES[summaryGroupKey] || summaryGroupKey}
                      {Array.isArray(form.serviceOptions?.[summaryGroupKey]) ? ` (${form.serviceOptions[summaryGroupKey].length})` : ''}
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-400">HenÃ¼z doldurulmadÄ±</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CarrierCard({ carrier, form, onRequest }: { carrier: Carrier; form: any; onRequest: () => void; }) {
  const weight = Number(form.weightKg || 0);
  const capacityOk = !weight || carrier.vehicle.capacity >= weight;
  const selectedExtraServices = Array.isArray(form.extraServices) ? form.extraServices : [];
  const insuranceNeeded = form.insurance !== 'none'
    || form.extras?.sigorta
    || selectedExtraServices.includes('Ek sigorta')
    || selectedExtraServices.includes('Kurumsal sigorta');
  const hasInsurance = (carrier.badges || []).some((b) => ['Sigorta', 'SoÄŸuk Zincir'].includes(b));
  const insuranceOk = !insuranceNeeded || hasInsurance;
  const vehicleOk = !form.vehicleType || !(form.vehicleType in VEHICLE_TYPES) || carrier.vehicle.type === form.vehicleType;
  const routeOk = (!form.originCity || carrier.serviceAreas.includes(form.originCity)) && (!form.destinationCity || carrier.serviceAreas.includes(form.destinationCity));
  const scopeOk = !form.scope || !(carrier.scopes && carrier.scopes.length) || (carrier.scopes || []).includes(form.scope);
  const wantsPackaging = form.extras?.ambalaj
    || selectedExtraServices.includes('Profesyonel Paketleme')
    || selectedExtraServices.includes('Ambalajlama');
  const hasPackaging = (carrier.badges || []).some((b) => ['Profesyonel', 'AltÄ±n TaÅŸÄ±yÄ±cÄ±'].includes(b));
  const extrasOk = (!wantsPackaging || hasPackaging) && (!form.extras?.sigorta || hasInsurance);

  const okTag = (ok: boolean, label: string) => (
    <Badge key={label} className={`${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'} flex items-center gap-1`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </Badge>
  );

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback className="bg-blue-100 text-blue-600">{carrier.name[0]}</AvatarFallback></Avatar>
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{carrier.name} {carrier.surname}</span>
                {carrier.isApproved && (
                  <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1"><Shield className="h-3 w-3" /> OnaylÄ± Nakliyeci</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500" /> {carrier.rating}
                </div>
                <span>Â·</span>
                <div>{carrier.reviewCount} deÄŸerlendirme</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 uppercase">{carrier.vehicle.type}</div>
            <div className="text-xs text-gray-500">Kapasite: {carrier.vehicle.capacity} kg</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-gray-600">Hizmet BÃ¶lgeleri</div>
            <div className="text-gray-900">{carrier.serviceAreas.join(', ')}</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600">YÃ¼k Tipleri</div>
            <div className="text-gray-900">{carrier.loadTypes.join(', ')}</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600">Rozetler</div>
            <div className="flex flex-wrap gap-2">
              {(carrier.badges || []).map((b) => (<Badge key={b} variant="secondary" className="bg-gray-100">{b}</Badge>))}
            </div>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="flex flex-wrap gap-2 text-xs">
          {okTag(routeOk, 'Rota uygun')}
          {okTag(scopeOk, 'Kapsam uygun')}
          {okTag(vehicleOk, 'AraÃ§ uygun')}
          {okTag(capacityOk, 'Kapasite yeterli')}
          {okTag(insuranceOk, 'Sigorta uygun')}
          {okTag(extrasOk, 'Ekler uyumlu')}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Award className="h-4 w-4 text-yellow-500" />
            <span>GÃ¼ven PuanÄ±: {carrier.rating} ({carrier.reviewCount} deÄŸerlendirme)</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={onRequest}>
              <MessageSquare className="h-4 w-4 mr-2" /> Teklif Ä°ste
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// â”€â”€â”€ Backend search response â†’ Carrier shape dÃ¶nÃ¼ÅŸÃ¼mÃ¼ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseVehicleSummary(summary: string | null): { type: Carrier['vehicle']['type']; capacity: number } {
  if (!summary) return { type: 'kamyonet', capacity: 0 };
  const match = summary.match(/^(\w+)\s*\((\d+)kg\)/i);
  if (match) {
    const rawType = match[1].toLowerCase();
    const typeMap: Record<string, Carrier['vehicle']['type']> = {
      kamyonet: 'kamyonet', kamyon: 'kamyon', tir: 'tir',
      panelvan: 'panelvan', panel: 'panelvan',
    };
    return { type: typeMap[rawType] ?? 'kamyonet', capacity: parseInt(match[2], 10) };
  }
  return { type: 'kamyonet', capacity: 0 };
}

function mapSearchResultToCarrier(item: {
  id: string; companyName: string; city: string | null;
  rating: number; reviewCount: number; vehicleSummary: string | null;
  serviceAreas: string[]; startingPrice: number | null;
  experienceYears: number | null; profileCompletion: number | null;
  pictureUrl: string | null;
}): Carrier {
  const { type: vehicleType, capacity } = parseVehicleSummary(item.vehicleSummary);
  const nameParts = item.companyName.trim().split(/\s+/);
  return {
    id: item.id,
    name: nameParts[0] ?? item.companyName,
    surname: nameParts.slice(1).join(' '),
    email: '',
    phone: '',
    city: item.city ?? '',
    type: 'carrier',
    createdAt: new Date(),
    vehicle: { id: '', type: vehicleType, capacity, licensePlate: '' },
    serviceAreas: item.serviceAreas ?? [],
    loadTypes: [],
    documents: { license: '', src: '', kBelgesi: '' },
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    isApproved: (item.profileCompletion ?? 0) >= 80,
    baseFee: item.startingPrice ?? 0,
    badges: [],
    scopes: [],
    pictureUrl: item.pictureUrl,
  };
}
````

---

## shadcn-ui/src/pages/Login.tsx:

````tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, User, Eye, EyeOff, ArrowRight, ShieldCheck, IdCard, Rocket, Brain, AlertCircle, XCircle, WifiOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// import { mockCarriers, mockCustomers } from '@/lib/mockData';
import { getLastEmail, setLastEmail } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// API Base URL - using Vite proxy
const API_BASE_URL = '/api/v1';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'carrier'>('customer');
  const [userTypeManuallySelected, setUserTypeManuallySelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [rememberEmail, setRememberEmail] = useState(true);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'customer' || typeParam === 'carrier') {
      setUserType(typeParam);
    }
    // Prefill last email if available
    const last = getLastEmail();
    if (last) setEmail(last);
  }, [searchParams]);

  const handleEmailBlur = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    setIsCheckingEmail(true);
    try {
      const res = await apiClient(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json?.success && (json.userType === 'customer' || json.userType === 'carrier')) {
        setUserType(json.userType);
      }
    } catch { /* ignore â€” sessiz hata */ } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorStatus(undefined);

    try {
      const endpoint = userType === 'customer' ? '/customers/login' : '/carriers/login';
      const body = JSON.stringify({ email, password });
      const headers = { 'Content-Type': 'application/json' };

      const response = await apiClient(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers, body });
      const result = await response.json();

      if (response.ok && result.success) {
        let sessionUser;
        if (userType === 'customer') {
          sessionUser = { ...result.data.customer, type: 'customer' as const };
        } else {
          const c = result.data.carrier;
          sessionUser = {
            id: c.id,
            name: c.companyName,
            surname: '',
            email: c.email,
            phone: c.phone || '',
            city: c.activityCity || '',
            type: 'carrier' as const,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            pictureUrl: c.pictureUrl ?? null,
          };
        }

        authLogin(result.data.token, sessionUser);

        if (rememberEmail) {
          setLastEmail(email);
        } else {
          setLastEmail(null);
        }

        toast({ title: 'GiriÅŸ baÅŸarÄ±lÄ±', description: 'YÃ¶nlendiriliyor...' });
        setTimeout(() => {
          const redirect = searchParams.get('redirect');
          navigate(redirect || '/home');
        }, 1000);
      } else {
        const status = response.status;
        setErrorStatus(status);
        let errorMessage = result.message || 'GiriÅŸ sÄ±rasÄ±nda bir hata oluÅŸtu.';
        if (status === 403) {
          errorMessage = userType === 'carrier'
            ? 'Bu hesap bir mÃ¼ÅŸteri hesabÄ±dÄ±r. LÃ¼tfen "MÃ¼ÅŸteri" sekmesinden giriÅŸ yapÄ±n.'
            : 'Bu hesap bir nakliyeci hesabÄ±dÄ±r. LÃ¼tfen "Nakliyeci" sekmesinden giriÅŸ yapÄ±n.';
        } else if (status === 404) {
          errorMessage = 'Bu e-posta adresiyle kayÄ±tlÄ± hesap bulunamadÄ±.';
        } else if (status === 429) {
          errorMessage = 'Ã‡ok fazla baÅŸarÄ±sÄ±z deneme. LÃ¼tfen birkaÃ§ dakika bekleyin.';
        }
        setError(errorMessage);
      }
    } catch {
      setErrorStatus(undefined);
      setError('Sunucuya baÄŸlanÄ±lamÄ±yor. LÃ¼tfen internet baÄŸlantÄ±nÄ±zÄ± kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding & Features */}
          <div className="hidden lg:block space-y-8 animate-in fade-in slide-in-from-left duration-1000">
            <div className="space-y-6">
              {/* Branding link removed per request */}
              
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  TÃ¼rkiye'nin
                  <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    En GÃ¼venilir
                  </span>
                  <span className="block text-gray-700">Nakliye Platformu</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Nakliyeci ile mÃ¼ÅŸteri arasÄ±ndaki iletiÅŸimi dijitalleÅŸtiren, 
                  gÃ¼venli ve ÅŸeffaf taÅŸÄ±ma hizmeti
                </p>
              </div>
            </div>

            {/* Features with Glassmorphism */}
            <div className="space-y-4">
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">GÃ¼venli Ä°ÅŸlem AltyapÄ±sÄ±</h3>
                    <p className="text-gray-600 font-normal">SSL ÅŸifreleme ve doÄŸrulanmÄ±ÅŸ Ã¶deme sistemiyle koruma altÄ±nda</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg group-hover:shadow-amber-500/25 transition-shadow">
                    <IdCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">KimliÄŸi DoÄŸrulanmÄ±ÅŸ Nakliyeciler</h3>
                    <p className="text-gray-600 font-normal">TÃ¼m nakliyeciler resmi belgelerle kayÄ±tlÄ± ve onaylÄ±</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-blue-500/25 transition-shadow">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">YÃ¼kselen Dijital Nakliye Platformu</h3>
                    <p className="text-gray-600 font-normal">Modern altyapÄ± ve kullanÄ±cÄ± odaklÄ± tasarÄ±mla geliÅŸtirildi</p>
                  </div>
                </div>
              </div>

              <div className="group p-6 bg-white/40 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl hover:bg-white/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">AkÄ±llÄ± EÅŸleÅŸtirme Teknolojisi</h3>
                    <p className="text-gray-600 font-normal">Yapay zeka destekli sistem en uygun nakliyeciyi saniyeler iÃ§inde bulur</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats section removed: the space-y keeps consistent spacing above */}
          </div>

          {/* Right Side - Login Form with Glassmorphism */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-in fade-in slide-in-from-right duration-1000">
            <Card className="backdrop-blur-xl bg-white/30 border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/40">
              <CardHeader className="text-center pt-6 pb-8 space-y-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  HoÅŸ Geldiniz
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  HesabÄ±nÄ±za giriÅŸ yaparak taÅŸÄ±ma iÅŸlemlerinizi yÃ¶netin
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Tabs value={userType} onValueChange={(value) => { setUserType(value as 'customer' | 'carrier'); setUserTypeManuallySelected(true); setError(''); setErrorStatus(undefined); }} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/50 backdrop-blur-sm">
                    <TabsTrigger value="customer" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
                      <User className="h-4 w-4" />
                      <span>MÃ¼ÅŸteri</span>
                    </TabsTrigger>
                    <TabsTrigger value="carrier" className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
                      <Truck className="h-4 w-4" />
                      <span>Nakliyeci</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {error && (() => {
                  const errorType = !errorStatus ? 'network' : errorStatus === 403 ? 'wrong-type' : errorStatus === 401 ? 'wrong-credentials' : errorStatus === 429 ? 'rate-limit' : 'generic';
                  return (
                    <div className={[
                      'flex items-start gap-3 p-3 rounded-lg border text-sm',
                      errorType === 'wrong-type'        ? 'bg-blue-50 border-blue-200 text-blue-800'   : '',
                      errorType === 'wrong-credentials' ? 'bg-red-50 border-red-200 text-red-800'     : '',
                      errorType === 'network'           ? 'bg-orange-50 border-orange-200 text-orange-800' : '',
                      errorType === 'rate-limit'        ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : '',
                      errorType === 'generic'           ? 'bg-red-50 border-red-200 text-red-800'     : '',
                    ].join(' ').trim()}>
                      {errorType === 'wrong-type' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : errorType === 'network' ? (
                        <WifiOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{error}</p>
                        {errorType === 'wrong-type' && (
                          <button
                            type="button"
                            className="mt-1 underline text-xs font-semibold"
                            onClick={() => {
                              setUserType(userType === 'carrier' ? 'customer' : 'carrier');
                              setError('');
                              setErrorStatus(undefined);
                            }}
                          >
                            {userType === 'carrier' ? 'MÃ¼ÅŸteri sekmesine geÃ§ â†’' : 'Nakliyeci sekmesine geÃ§ â†’'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      E-posta Adresi
                    </Label>
                    <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder="ornek@email.com"
                      className="h-12 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                      required
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                      Åifre
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Åifrenizi girin"
                        className="h-12 pr-12 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  {/* Remember me */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        id="rememberEmail"
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="rememberEmail" className="text-sm text-gray-600">E-postayÄ± hatÄ±rla</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/sifremi-unuttum')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                    >
                      Åifremi Unuttum?
                    </button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>GiriÅŸ yapÄ±lÄ±yor...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <span>GiriÅŸ Yap</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </Button>
                </form>
                
                <div className="text-center space-y-4">
                  <p className="text-gray-600 font-medium">
                    HesabÄ±nÄ±z yok mu?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link 
                      to="/musteri-kayit" 
                      className="group p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-200/50 text-green-700 rounded-xl hover:from-green-500/20 hover:to-emerald-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      MÃ¼ÅŸteri KaydÄ±
                    </Link>
                    <Link 
                      to="/nakliyeci-kayit" 
                      className="group p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-200/50 text-orange-700 rounded-xl hover:from-orange-500/20 hover:to-red-500/20 transition-all duration-300 text-center font-medium hover:scale-105"
                    >
                      Nakliyeci KaydÄ±
                    </Link>
                  </div>
                </div>
                

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
````

---

## shadcn-ui/src/context/AuthContext.tsx:

````tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/types';
import {
  getAuthToken,
  clearAuth,
  getUserType,
  getUserId,
  getUserName,
  getUserEmail,
} from '@/lib/auth';
import { getSessionUser, setSessionUser, clearSessionUser } from '@/lib/storage';

interface AuthContextType {
  user: User | null;
  userType: 'customer' | 'carrier' | null;
  isAuthenticated: boolean;
  login: (token: string, sessionUser: User, ttlMs?: number) => void;
  logout: () => void;
  refreshUser: () => void;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Builds a minimal User from JWT if session storage has no entry */
function buildUserFromToken(): User | null {
  const tokenType = getUserType();
  const tokenId = getUserId();
  if (!tokenType || !tokenId) return null;

  const name = getUserName() || 'KullanÄ±cÄ±';
  const [firstName = name, ...rest] = name.split(' ');

  return {
    id: tokenId,
    name: firstName,
    surname: rest.join(' '),
    email: getUserEmail(),
    phone: '',
    city: '',
    type: tokenType,
    createdAt: new Date(),
    pictureUrl: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSessionUser() ?? buildUserFromToken());
  const [userType, setUserType] = useState<'customer' | 'carrier' | null>(
    () => getSessionUser()?.type ?? getUserType()
  );

  const refreshUser = useCallback(() => {
    const sessionUser = getSessionUser();
    if (sessionUser) {
      setUser(sessionUser);
      setUserType(sessionUser.type);
    } else if (getAuthToken()) {
      const tokenUser = buildUserFromToken();
      setUser(tokenUser);
      setUserType(tokenUser?.type ?? null);
    } else {
      setUser(null);
      setUserType(null);
    }
  }, []);

  /** Called after a successful login â€” saves token + session and updates state */
  const login = useCallback(
    (token: string, sessionUser: User, ttlMs = 5 * 24 * 60 * 60 * 1000) => {
      localStorage.setItem('authToken', token);
      setSessionUser(sessionUser, ttlMs);
      setUser(sessionUser);
      setUserType(sessionUser.type);
    },
    []
  );

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      setSessionUser(updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    clearSessionUser();
    setUser(null);
    setUserType(null);
  }, []);

  // Stay in sync when another tab modifies localStorage
  useEffect(() => {
    const handleStorage = () => refreshUser();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser]);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, userType, isAuthenticated, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
````

---

## shadcn-ui/src/lib/storage.ts:

````ts
import { User } from './types';

// Session keys (backward compatible with existing 'currentUser')
const SESSION_KEYS = {
  CURRENT_USER: 'currentUser',
  CURRENT_USER_EXPIRES_AT: 'currentUser_expiresAt',
};

const DEFAULT_SESSION_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 gÃ¼n

// ----- Session helpers (TTL'li oturum) -----
export const setSessionUser = (user: User, ttlMs: number = DEFAULT_SESSION_TTL_MS): void => {
  localStorage.setItem(SESSION_KEYS.CURRENT_USER, JSON.stringify(user));
  localStorage.setItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT, String(Date.now() + ttlMs));
};

export const getSessionUser = (): User | null => {
  const raw = localStorage.getItem(SESSION_KEYS.CURRENT_USER);
  if (!raw) return null;

  const expRaw = localStorage.getItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
  if (expRaw) {
    const exp = Number(expRaw);
    if (!Number.isNaN(exp) && Date.now() > exp) {
      // SÃ¼re dolmuÅŸ, temizle
      localStorage.removeItem(SESSION_KEYS.CURRENT_USER);
      localStorage.removeItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
      return null;
    }
  }
  // expiresAt yoksa geriye dÃ¶nÃ¼k uyumluluk iÃ§in kullanÄ±cÄ±yÄ± dÃ¶ndÃ¼r (sÄ±nÄ±rsÄ±z oturum)
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const clearSessionUser = (): void => {
  localStorage.removeItem(SESSION_KEYS.CURRENT_USER);
  localStorage.removeItem(SESSION_KEYS.CURRENT_USER_EXPIRES_AT);
};

// Uygulama baÅŸlangÄ±cÄ±nda Ã§aÄŸÄ±rÄ±n: SÃ¼resi dolmuÅŸsa oturumu temizler
export const ensureSessionValidity = (): void => {
  // getSessionUser, gerekirse otomatik temizler
  void getSessionUser();
};

// ---- Convenience: remember last used email on login ----
const LAST_EMAIL_KEY = 'tasiburada_last_email';

export const setLastEmail = (email: string | null): void => {
  if (email) {
    localStorage.setItem(LAST_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(LAST_EMAIL_KEY);
  }
};

export const getLastEmail = (): string | null => {
  return localStorage.getItem(LAST_EMAIL_KEY);
};
````

---

## shadcn-ui/src/lib/auth.ts:

````ts
export type UserType = 'customer' | 'carrier';

type AuthPayload = {
  exp?: number;
  type?: string;
  userType?: string;
  customerId?: string;
  carrierId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
};

function decodeAuthPayload(): AuthPayload | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const base64 = token.split('.')[1];
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload) as AuthPayload;

    if (payload?.exp && payload.exp * 1000 < Date.now()) {
      clearAuth();
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function clearAuth(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('userId');
}

export function getUserType(): UserType | null {
  const payload = decodeAuthPayload();
  const type = payload?.type ?? payload?.userType;
  return type === 'customer' || type === 'carrier' ? type : null;
}

export function getUserId(): string | null {
  const payload = decodeAuthPayload();
  return payload?.customerId || payload?.carrierId || null;
}

export function getUserName(): string {
  const payload = decodeAuthPayload();
  if (!payload) return '';

  if (payload.companyName) {
    return payload.companyName;
  }

  const fullName = [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim();
  return fullName;
}

export function getUserEmail(): string {
  const payload = decodeAuthPayload();
  return payload?.email ?? '';
}

export function isAuthenticated(): boolean {
  return getUserType() !== null;
}
````

---

## shadcn-ui/index.html:

````html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tasiburada - Lojistik Marketplace Platformu</title>
    <meta name="description" content="MÃ¼ÅŸteriler ve nakliyecileri buluÅŸturan akÄ±llÄ± lojistik marketplace platformu. GÃ¼venli, hÄ±zlÄ± ve ekonomik taÅŸÄ±macÄ±lÄ±k Ã§Ã¶zÃ¼mleri." />
    <!-- Fonts: Inter & Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
````

