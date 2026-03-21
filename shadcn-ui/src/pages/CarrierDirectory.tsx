import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ArrowLeft, ChevronLeft, ChevronRight, Target } from 'lucide-react';

const PAGE_SIZE = 12;

const parsePage = (params: URLSearchParams) => {
	const page = Number(params.get('page') ?? '1');
	return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
};

export default function CarrierDirectory() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
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
	};

	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const carriers = data?.items ?? [];
	const hasResults = carriers.length > 0;
	const canPrev = page > 1;
	const canNext = page < totalPages;

	return (
		<div className="container mx-auto py-8 space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/nakliyeciler')}>
					<ArrowLeft className="h-4 w-4" />
					Geri
				</Button>
				<Badge variant="outline" className="text-sky-700 border-sky-200 bg-sky-50 gap-2">
					<Target className="h-4 w-4" />
					Detaylı nakliyeci araması
				</Badge>
			</div>

			<section className="grid gap-6 lg:grid-cols-[320px,1fr]">
				<Card className="h-fit shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Filtreler</CardTitle>
						<CardDescription>Konumu, araç tipini ve bütçeni seç</CardDescription>
					</CardHeader>
					<CardContent>
						<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card className="border-dashed">
						<CardContent className="py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-sm text-slate-500">Toplam sonuç</p>
								<p className="text-2xl font-semibold text-slate-900">{isFetching ? '...' : `${total} nakliyeci`}</p>
							</div>
							<div className="text-sm text-slate-600">
								Sayfa {page} / {totalPages}
							</div>
						</CardContent>
					</Card>

					{isError && (
						<Alert variant="destructive">
							<AlertTitle>Liste alınamadı</AlertTitle>
							<AlertDescription>{(error as Error)?.message || 'Beklenmeyen bir hata oluştu.'}</AlertDescription>
						</Alert>
					)}

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{isLoading
							? Array.from({ length: 6 }).map((_, idx) => <CarrierCardSkeleton key={idx} />)
							: hasResults
								? carriers.map(carrier => (
									<CarrierCard key={carrier.id} carrier={carrier} />
								))
								: (
									<Card>
										<CardContent className="py-14 text-center text-slate-600">
											Kriterlerinize uygun nakliyeci bulunamadı. Filtreleri gevşetmeyi deneyin.
										</CardContent>
									</Card>
								)
						}
					</div>

					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4">
						<p className="text-sm text-slate-500">
							Gösterilen {carriers.length} nakliyeci · Toplam {total} sonuç
						</p>
						<div className="flex gap-2 justify-end">
							<Button variant="outline" className="gap-2" disabled={!canPrev} onClick={() => handlePageChange(page - 1)}>
								<ChevronLeft className="h-4 w-4" />
								Önceki
							</Button>
							<Button variant="outline" className="gap-2" disabled={!canNext} onClick={() => handlePageChange(page + 1)}>
								Sonraki
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
