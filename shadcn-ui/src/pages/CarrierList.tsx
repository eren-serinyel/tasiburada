import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import { ArrowRight, Award, MapPin, SearchX, Shield, Star, Truck } from 'lucide-react';

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
		<div className="bg-slate-50 min-h-screen pb-24">
			{/* ═══ HERO HEADER ═══ */}
			<div className="bg-white border-b border-slate-200 relative overflow-hidden">
				{/* Subtle background abstract blobs */}
				<div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-60 pointer-events-none" />
				<div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-50 blur-3xl opacity-60 pointer-events-none" />

				<div className="max-w-[1320px] mx-auto px-6 py-12 md:py-16 relative z-10">
					{/* Badge */}
					<div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
						<span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
						<span className="text-xs font-semibold text-blue-700 tracking-wide">GÜVENİLİR NAKLİYAT AĞI</span>
					</div>

					<h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
						Yükünüz İçin En Doğru<br />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
							Nakliyeciyi Bulun
						</span>
					</h1>

					<p className="text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
						Yüzlerce onaylı nakliyeci arasından puan, yorum ve fiyat karşılaştırması yaparak size en uygun olanı hemen seçin.
					</p>

					<div className="mt-8 flex flex-wrap gap-3">
						<span className="inline-flex items-center gap-2 border border-slate-200 rounded-full px-5 py-2 bg-white/80 backdrop-blur-sm text-sm font-medium text-slate-700 shadow-sm">
							<span className="text-green-500 font-bold">✓</span> Onaylı Profiller
						</span>
						<span className="inline-flex items-center gap-2 border border-slate-200 rounded-full px-5 py-2 bg-white/80 backdrop-blur-sm text-sm font-medium text-slate-700 shadow-sm">
							<Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Gerçek Müşteri Yorumları
						</span>
					</div>
				</div>
			</div>

			{/* ═══ MAIN CONTENT GRID ═══ */}
			<div className="max-w-[1320px] mx-auto px-6 pt-10 flex flex-col lg:flex-row gap-8">
				
				{/* ── LEFT: FILTER PANEL ── */}
				<aside className="w-full lg:w-[300px] shrink-0">
					<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
						<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
					</div>
				</aside>

				{/* ── RIGHT: RESULTS ── */}
				<main className="flex-1 min-w-0">
					{/* Results header */}
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
						<div>
							<div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Bulunan Sonuçlar</div>
							<h2 className="text-xl font-semibold text-slate-900">
								{isFetching ? (
									<span className="inline-block w-8 h-6 bg-slate-200 animate-pulse rounded align-middle" />
								) : total} nakliyeci listeleniyor
							</h2>
						</div>
						{total > HIGHLIGHT_LIMIT && (
							<button 
								onClick={handleViewAll} 
								className="h-10 px-5 inline-flex items-center justify-center rounded-xl font-medium text-sm transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
							>
								Tümünü Gör <ArrowRight className="w-4 h-4 ml-2" />
							</button>
						)}
					</div>

					{/* Error */}
					{isError && (
						<div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-center gap-3">
							<span className="w-6 h-6 flex items-center justify-center bg-red-100 rounded-full shrink-0">!</span>
							Liste alınamadı — {(error as Error)?.message || 'Beklenmeyen bir hata oluştu.'}
						</div>
					)}

					{/* Card grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl p-5">
									<div className="flex gap-4 mb-4">
										<div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0" />
										<div className="flex-1 space-y-2 py-1">
											<div className="h-4 w-3/4 bg-slate-100 rounded" />
											<div className="h-3 w-1/2 bg-slate-100 rounded" />
										</div>
									</div>
									<div className="h-10 bg-slate-50 rounded-lg mb-4" />
									<div className="flex gap-2 mb-5">
										{[1,2,3].map(j => <div key={j} className="h-6 w-16 bg-slate-100 rounded-full" />)}
									</div>
									<div className="pt-4 border-t border-slate-100 flex justify-between items-center">
										<div className="space-y-2">
											<div className="h-2 w-8 bg-slate-100 rounded" />
											<div className="h-5 w-20 bg-slate-200 rounded" />
										</div>
										<div className="h-10 w-32 bg-slate-200 rounded-xl" />
									</div>
								</div>
							))}
						</div>
					) : hasResults ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{carriers.map(c => <InlineCarrierCard key={c.id} carrier={c} navigate={navigate} />)}
						</div>
					) : (
						/* Empty state */
						<div className="text-center py-20 px-6 bg-white border border-slate-200 border-dashed rounded-2xl">
							<div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4">
								<SearchX className="w-8 h-8 text-slate-400" />
							</div>
							<h3 className="text-lg font-semibold text-slate-900 mb-2">Nakliyeci bulunamadı</h3>
							<p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Seçtiğiniz filtrelere uygun nakliyeci şu anda listelenmiyor. Filtreleri esneterek tekrar arayabilirsiniz.</p>
							<button
								onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}
								className="inline-flex items-center justify-center h-10 px-6 rounded-xl font-medium text-sm transition-all bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
							>
								Filtreleri Temizle
							</button>
						</div>
					)}

					{/* View All BOTTOM */}
					{hasResults && total > HIGHLIGHT_LIMIT && (
						<div className="flex justify-center mt-12 pt-8 border-t border-slate-200">
							<button 
								onClick={handleViewAll} 
								className="group relative h-12 px-8 inline-flex items-center justify-center rounded-xl font-semibold text-sm transition-all bg-blue-600 text-white overflow-hidden hover:bg-blue-700 hover:shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-0.5"
							>
								<span className="relative z-10 flex items-center gap-2">Tüm Nakliyecileri Keşfet <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
							</button>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

/* ═══ INLINE CARRIER CARD ═══ */
function InlineCarrierCard({ carrier, navigate }: { carrier: CarrierSearchItem; navigate: ReturnType<typeof useNavigate> }) {
	const initials = carrier.companyName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
	const slug = slugify(carrier.companyName);
	const detailPath = `/nakliyeciler/${carrier.id}/${slug}`;
	const ratingValue = num(carrier.rating);
	const priceLabel = typeof carrier.startingPrice === 'number' ? `₺${formatPrice(carrier.startingPrice)}` : null;
	const isVerified = (carrier.profileCompletion || 0) > 70;
	const expYears = num(carrier.experienceYears, NaN);
	const experienceText = Number.isFinite(expYears) ? `${expYears} Yıl Deneyim` : null;
	const serviceAreas = carrier.serviceAreas || [];

	return (
		<div
			onClick={() => navigate(detailPath)}
			className="group bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-blue-200 flex flex-col h-full relative overflow-hidden"
		>
			{/* Decorative top-right corner gradient on hover */}
			<div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-bl from-blue-100 to-transparent rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

			{/* TOP: Avatar + Info + Verified */}
			<div className="flex items-start gap-4 z-10 relative">
				<div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-blue-900 text-white text-lg font-bold flex items-center justify-center shrink-0 shadow-inner overflow-hidden border-2 border-white ring-1 ring-slate-100">
					{carrier.pictureUrl
						? <img src={carrier.pictureUrl} alt="" className="w-full h-full object-cover" />
						: initials}
				</div>
				<div className="flex-1 min-w-0 pt-0.5">
					<h3 className="text-[15px] font-bold text-slate-900 truncate pr-2 group-hover:text-blue-600 transition-colors">{carrier.companyName}</h3>
					<div className="flex items-center gap-1.5 mt-1">
						<MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
						<span className="text-xs text-slate-500 font-medium">{carrier.city || 'Şehir belirtilmedi'}</span>
					</div>
				</div>
			</div>

			{/* RATING & VERIFIED ROW */}
			<div className="flex items-center gap-2 mt-4 mb-1 flex-wrap">
				{isVerified && (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold tracking-wide">
						<Shield className="w-3 h-3" /> ONAYLI
					</span>
				)}
				<div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
					<Star className="w-3 h-3 text-amber-400 fill-amber-400" />
					<span className="text-xs font-bold text-slate-700">{ratingValue.toFixed(1)}</span>
					<span className="text-[11px] font-medium text-slate-400 ml-0.5">({carrier.reviewCount})</span>
				</div>
				{experienceText && (
					<span className="ml-auto inline-flex items-center gap-1 bg-amber-50 text-amber-700 rounded-md px-2 py-0.5 border border-amber-100 text-[11px] font-semibold">
						<Award className="w-3 h-3" />
						{experienceText}
					</span>
				)}
			</div>

			{/* VEHICLE INFO */}
			<div className="mt-4 bg-slate-50/70 border border-slate-100 rounded-lg p-2.5 flex items-center gap-2.5 text-xs">
				<div className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm border border-slate-100 shrink-0">
					<Truck className="w-3.5 h-3.5 text-blue-500" />
				</div>
				<span className={carrier.vehicleSummary ? "text-slate-700 font-medium" : "text-slate-400 italic"}>
					{carrier.vehicleSummary || 'Araç bilgisi bulunmuyor'}
				</span>
			</div>

			{/* ROUTE TAGS */}
			{serviceAreas.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mt-4">
					{serviceAreas.slice(0, 3).map(area => (
						<span key={area} className="bg-slate-100 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 border border-slate-200/50">
							{area}
						</span>
					))}
					{serviceAreas.length > 3 && (
						<span className="px-2 py-1 text-[11px] font-medium text-slate-400">+{serviceAreas.length - 3} daha</span>
					)}
				</div>
			)}
			<div className="flex-1" /> {/* Spacer */}

			{/* BOTTOM: Price + CTA */}
			<div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-end">
				<div>
					{priceLabel ? (
						<>
							<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">BAŞLANGIÇ</span>
							<span className="text-xl font-extrabold text-slate-900 block leading-none">{priceLabel}</span>
						</>
					) : (
						<span className="text-sm font-semibold text-slate-500">Fiyat Sorunuz</span>
					)}
				</div>
				<button
					onClick={e => { e.stopPropagation(); navigate(detailPath); }}
					className="relative h-10 px-5 inline-flex items-center justify-center rounded-xl font-semibold text-[13px] transition-all bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md"
				>
					Profili İncele
				</button>
			</div>
		</div>
	);
}
