import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import CarrierFilters from '@/components/carriers/CarrierFilters';
import CarrierCard from '@/components/carriers/CarrierCard';
import CarrierCardSkeleton from '@/components/carriers/CarrierCardSkeleton';
import {
	CarrierSearchFilters,
	filtersFromParams,
	filtersToParams,
	fetchCarrierSearch,
	type CarrierSearchResponse
} from '@/lib/carrierSearch';
import { ArrowLeft, ChevronLeft, ChevronRight, SearchX, SlidersHorizontal } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

const PAGE_SIZE = 12;

const parsePage = (params: URLSearchParams) => {
	const page = Number(params.get('page') ?? '1');
	return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
};

export default function CarrierDirectory() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const { isFavorite } = useFavorites();
	const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
	const page = useMemo(() => parsePage(searchParams), [searchParams]);
	const offset = (page - 1) * PAGE_SIZE;

	const filterKey = useMemo(() => filtersToParams(filters).toString(), [filters]);
	const { data, isLoading, isFetching, isError, error } = useQuery<CarrierSearchResponse>({
		queryKey: ['carrier-directory', filterKey, page],
		queryFn: ({ signal }) => fetchCarrierSearch(filters, PAGE_SIZE, offset, signal),
		placeholderData: keepPreviousData
	});

	const handleFilterChange = (nextFilters: CarrierSearchFilters) => {
		const params = filtersToParams(nextFilters);
		params.set('page', '1');
		setSearchParams(params, { replace: true });
	};

	const handlePageChange = (nextPage: number) => {
		const params = filtersToParams(filters);
		params.set('page', String(nextPage));
		setSearchParams(params, { replace: true });
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const allCarriers = data?.items ?? [];
	const carriers = filters.favoritesOnly
		? allCarriers.filter(c => isFavorite(c.id))
		: allCarriers;
	const hasResults = carriers.length > 0;
	const canPrev = page > 1;
	const canNext = page < totalPages;

	return (
		<div className="bg-[#F8FAFC] min-h-screen pb-24 font-['Plus_Jakarta_Sans',_sans-serif]">

			{/* ─── HEADER STRIP ─── */}
			<div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
				<div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
					<button
						onClick={() => navigate('/nakliyeciler')}
						className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Geri
					</button>

					<div className="flex items-center gap-2">
						<SlidersHorizontal className="h-4 w-4 text-blue-500" />
						<span className="text-sm font-black text-slate-700 uppercase tracking-widest">Detaylı Arama</span>
					</div>

					<div className="text-sm font-bold text-slate-400">
						{isFetching ? (
							<span className="inline-block w-20 h-4 bg-slate-100 animate-pulse rounded" />
						) : (
							<span>{total.toLocaleString()} nakliyeci</span>
						)}
					</div>
				</div>
			</div>

			{/* ─── MAIN CONTENT GRID ─── */}
			<div className="max-w-[1400px] mx-auto px-6 pt-8 flex flex-col lg:flex-row gap-8">

				{/* LEFT: Filter Panel */}
				<aside className="w-full lg:w-[320px] shrink-0">
					<div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto rounded-[32px] border border-white/50 bg-white/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
						<CarrierFilters filters={filters} onChange={handleFilterChange} />
					</div>
				</aside>

				{/* RIGHT: Results */}
				<main className="flex-1 min-w-0">

					{/* Error */}
					{isError && (
						<div className="bg-red-50 border border-red-100 rounded-[24px] p-5 mb-6 flex items-center gap-4 text-sm text-red-700 shadow-sm">
							<div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
								<SearchX className="w-5 h-5" />
							</div>
							<div>
								<p className="font-bold text-red-900 mb-0.5">Liste alınamadı</p>
								<p className="text-red-600">{(error as Error)?.message || 'Beklenmeyen bir hata oluştu.'}</p>
							</div>
						</div>
					)}

					{/* Grid */}
					<AnimatePresence mode="wait">
						{isLoading ? (
							<motion.div
								key="loading"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
							>
								{Array.from({ length: 6 }).map((_, i) => <CarrierCardSkeleton key={i} />)}
							</motion.div>
						) : hasResults ? (
							<motion.div
								key="results"
								initial="hidden"
								animate="visible"
								variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
								className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
							>
								{carriers.map(carrier => (
									<motion.div
										key={carrier.id}
										variants={{
											hidden: { opacity: 0, y: 16 },
											visible: { opacity: 1, y: 0 }
										}}
									>
										<CarrierCard carrier={carrier} />
									</motion.div>
								))}
							</motion.div>
						) : (
							<motion.div
								key="empty"
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								className="text-center py-24 px-8 bg-white border border-slate-100 rounded-[40px] shadow-sm"
							>
								<div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-[28px] mx-auto mb-5 shadow-inner">
									<SearchX className="w-8 h-8 text-slate-300" />
								</div>
								<h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Eşleşme Bulunamadı</h3>
								<p className="text-slate-500 mb-7 max-w-sm mx-auto leading-relaxed text-sm">
									Filtreleme kriterlerinizi genişleterek daha fazla sonuç elde edebilirsiniz.
								</p>
								<button
									onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}
									className="inline-flex items-center h-11 px-7 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
								>
									Tüm Filtreleri Temizle
								</button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Pagination */}
					{hasResults && totalPages > 1 && (
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-8 border-t border-slate-100">
							<p className="text-sm text-slate-400 font-medium">
								{carriers.length} nakliyeci gösteriliyor · Toplam <span className="font-bold text-slate-600">{total}</span> sonuç · Sayfa <span className="font-bold text-slate-600">{page} / {totalPages}</span>
							</p>
							<div className="flex items-center gap-2">
								<button
									disabled={!canPrev}
									onClick={() => handlePageChange(page - 1)}
									className="h-10 px-5 rounded-2xl font-bold text-sm border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
								>
									<ChevronLeft className="h-4 w-4" />
									Önceki
								</button>
								<button
									disabled={!canNext}
									onClick={() => handlePageChange(page + 1)}
									className="h-10 px-5 rounded-2xl font-bold text-sm border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
								>
									Sonraki
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
