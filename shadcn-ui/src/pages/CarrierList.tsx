import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { ChevronRight, Search, Users, Shield, Award } from 'lucide-react';

const HIGHLIGHT_LIMIT = 12;

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
		<div className="min-h-screen bg-slate-50/50">
			{/* Hero Section */}
			<div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 text-white">
				<div className="container mx-auto py-12 md:py-16">
					<div className="max-w-3xl space-y-4">
						<div className="flex items-center gap-2 text-blue-300 mb-2">
							<Shield className="h-5 w-5" />
							<span className="text-sm font-medium tracking-wide uppercase">Güvenilir Nakliyat Ağı</span>
						</div>
						<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
							Yükünüz İçin En Doğru <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Nakliyeciyi Bulun</span>
						</h1>
						<p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
							Yüzlerce onaylı nakliyeci arasından puan, yorum ve fiyat karşılaştırması yaparak size en uygun olanı hemen seçin.
						</p>
						<div className="flex flex-wrap gap-4 pt-4">
							<div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
								<Award className="h-4 w-4 text-yellow-400" />
								<span className="text-sm font-medium">Onaylı Profiller</span>
							</div>
							<div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
								<Users className="h-4 w-4 text-blue-400" />
								<span className="text-sm font-medium">Gerçek Müşteri Yorumları</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto py-8 lg:py-12">
				<section className="grid gap-8 lg:grid-cols-[300px,1fr] xl:grid-cols-[320px,1fr]">

					{/* Sidebar Filters */}
					<aside className="space-y-6">
						<Card className="shadow-sm border-slate-200 sticky top-24">
							<CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
								<CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
									<Search className="h-4 w-4 text-blue-600" />
									Filtreleme
								</CardTitle>
								<CardDescription>Aramayı detaylandırın</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
							</CardContent>
						</Card>


					</aside>

					{/* Results Area */}
					<main className="space-y-6">
						<div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
							<div>
								<p className="text-sm text-slate-500 font-medium">Bulunan Sonuçlar</p>
								<div className="flex items-baseline gap-2">
									<p className="text-2xl font-bold text-slate-900">
										{isFetching ? '...' : total}
									</p>
									<span className="text-slate-600 font-medium">nakliyeci listeleniyor</span>
								</div>
							</div>
							{total > HIGHLIGHT_LIMIT && (
								<Button variant="outline" className="gap-2 border-slate-300 hover:bg-slate-50 text-slate-700" onClick={handleViewAll}>
									Tüm Sonuçları Gör
									<ChevronRight className="h-4 w-4" />
								</Button>
							)}
						</div>

						{isError && (
							<Alert variant="destructive">
								<AlertTitle>Liste alınamadı</AlertTitle>
								<AlertDescription>{(error as Error)?.message || 'Beklenmeyen bir hata oluştu.'}</AlertDescription>
							</Alert>
						)}

						<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
							{isLoading
								? Array.from({ length: 6 }).map((_, idx) => <CarrierCardSkeleton key={idx} />)
								: hasResults
									? carriers.map(carrier => (
										<CarrierCard key={carrier.id} carrier={carrier} />
									))
									: (
										<Card className="col-span-full border-dashed border-2 bg-slate-50/50">
											<CardContent className="py-16 text-center space-y-4">
												<div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
													<Search className="h-8 w-8 text-slate-400" />
												</div>
												<div className="space-y-1">
													<h3 className="text-lg font-semibold text-slate-900">Sonuç Bulunamadı</h3>
													<p className="text-slate-500 max-w-sm mx-auto">
														Seçtiğiniz kriterlere uygun nakliyeci bulunamadı. Filtreleri temizleyerek tekrar deneyebilirsiniz.
													</p>
												</div>
												<Button variant="outline" onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}>
													Filtreleri Temizle
												</Button>
											</CardContent>
										</Card>
									)
							}
						</div>

						{hasResults && total > HIGHLIGHT_LIMIT && (
							<div className="pt-8 flex justify-center">
								<Button size="lg" className="px-8 bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all" onClick={handleViewAll}>
									Tüm Nakliyecileri Keşfet
									<ChevronRight className="h-4 w-4 ml-2" />
								</Button>
							</div>
						)}
					</main>
				</section>
			</div>
		</div>
	);
}
