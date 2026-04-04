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
import { SearchX, Star, Truck } from 'lucide-react';

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
		<div style={{ background: '#F8FAFC', minHeight: '100vh' }}>

			{/* ═══ HERO HEADER ═══ */}
			<div style={{ background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 100%)', borderBottom: '1px solid #E2E8F0', padding: '32px 40px' }}>
				<div style={{ maxWidth: '1320px', margin: '0 auto' }}>
					{/* Badge */}
					<div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '9999px', padding: '5px 14px', marginBottom: '12px' }}>
						<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', animation: 'pulse 2s infinite' }} />
						<span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>GÜVENİLİR NAKLİYAT AĞI</span>
					</div>

					<h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>
						Yükünüz İçin En Doğru<br />
						<span style={{ color: '#2563EB' }}>Nakliyeciyi Bulun</span>
					</h1>

					<p style={{ fontSize: '15px', color: '#64748B', maxWidth: '520px', marginTop: '10px', lineHeight: 1.6 }}>
						Yüzlerce onaylı nakliyeci arasından puan, yorum ve fiyat karşılaştırması yaparak size en uygun olanı hemen seçin.
					</p>

					<div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '8px 18px', background: 'white', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
							✓ Onaylı Profiller
						</span>
						<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', borderRadius: '9999px', padding: '8px 18px', background: 'white', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
							★ Gerçek Müşteri Yorumları
						</span>
					</div>
				</div>
			</div>

			{/* ═══ MAIN CONTENT GRID ═══ */}
			<div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', padding: '32px 40px', maxWidth: '1320px', margin: '0 auto' }}>

				{/* ── LEFT: FILTER PANEL ── */}
				<aside>
					<div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', position: 'sticky', top: '88px', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
						<CarrierFilters filters={filters} onChange={handleFilterChange} hideHeader />
					</div>
				</aside>

				{/* ── RIGHT: RESULTS ── */}
				<main>
					{/* Results header */}
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
						<div>
							<div style={{ fontSize: '12px', color: '#94A3B8' }}>Bulunan Sonuçlar</div>
							<div style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
								{isFetching ? '...' : total} nakliyeci listeleniyor
							</div>
						</div>
						{total > HIGHLIGHT_LIMIT && (
							<button onClick={handleViewAll} style={{ height: '36px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 16px', fontSize: '13px', fontWeight: 500, color: '#374151', background: 'white', cursor: 'pointer' }}>
								Tümünü Gör →
							</button>
						)}
					</div>

					{/* Error */}
					{isError && (
						<div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontSize: '13px', color: '#B91C1C' }}>
							Liste alınamadı — {(error as Error)?.message || 'Beklenmeyen bir hata oluştu.'}
						</div>
					)}

					{/* Card grid */}
					{isLoading ? (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="animate-pulse" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
									<div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
										<div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#E2E8F0', flexShrink: 0 }} />
										<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
											<div style={{ height: '14px', width: '60%', background: '#F1F5F9', borderRadius: '4px' }} />
											<div style={{ height: '10px', width: '40%', background: '#F1F5F9', borderRadius: '4px' }} />
											<div style={{ height: '10px', width: '30%', background: '#F1F5F9', borderRadius: '4px' }} />
										</div>
									</div>
									<div style={{ background: '#F8FAFC', borderRadius: '8px', height: '36px', marginBottom: '10px' }} />
									<div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
										{[1,2,3].map(j => <div key={j} style={{ height: '22px', width: '60px', background: '#F1F5F9', borderRadius: '6px' }} />)}
									</div>
									<div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
											<div style={{ height: '10px', width: '40px', background: '#F1F5F9', borderRadius: '4px' }} />
											<div style={{ height: '18px', width: '64px', background: '#E2E8F0', borderRadius: '4px' }} />
										</div>
										<div style={{ height: '36px', width: '120px', background: '#E2E8F0', borderRadius: '8px' }} />
									</div>
								</div>
							))}
						</div>
					) : hasResults ? (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
							{carriers.map(c => <InlineCarrierCard key={c.id} carrier={c} navigate={navigate} />)}
						</div>
					) : (
						/* Empty state */
						<div style={{ textAlign: 'center', padding: '60px 20px' }}>
							<SearchX style={{ width: '48px', height: '48px', color: '#CBD5E1', margin: '0 auto 16px' }} />
							<div style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', marginBottom: '8px' }}>Nakliyeci bulunamadı</div>
							<div style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>Filtreleri değiştirerek tekrar deneyin</div>
							<button
								onClick={() => handleFilterChange({ serviceAreas: [], vehicleTypeIds: [] })}
								style={{ border: '1px solid #2563EB', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 500, color: '#2563EB', background: 'white', cursor: 'pointer' }}
							>
								Filtreleri Temizle
							</button>
						</div>
					)}

					{/* View All */}
					{hasResults && total > HIGHLIGHT_LIMIT && (
						<div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
							<button onClick={handleViewAll} style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
								Tüm Nakliyecileri Keşfet →
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
			style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 200ms', display: 'flex', flexDirection: 'column' }}
			onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
			onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
		>
			{/* TOP: Avatar + Info + Verified */}
			<div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
				<div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)', color: 'white', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
					{carrier.pictureUrl
						? <img src={carrier.pictureUrl} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover' }} />
						: initials}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{carrier.companyName}</div>
					<div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
						<span style={{ fontSize: '12px' }}>📍</span> {carrier.city || 'Şehir belirtilmedi'}
					</div>
				</div>
				{isVerified && (
					<span style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
						✓ Onaylı
					</span>
				)}
			</div>

			{/* RATING ROW */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '12px 0' }}>
				<span style={{ color: '#F59E0B', fontSize: '14px' }}>{'★'.repeat(Math.round(ratingValue))}</span>
				<span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{ratingValue.toFixed(1)}</span>
				<span style={{ fontSize: '12px', color: '#94A3B8' }}>({carrier.reviewCount} yorum)</span>
				{experienceText && (
					<span style={{ marginLeft: 'auto', background: '#FFF7ED', color: '#C2410C', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
						{experienceText}
					</span>
				)}
			</div>

			{/* VEHICLE INFO */}
			<div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: carrier.vehicleSummary ? '#374151' : '#94A3B8', fontStyle: carrier.vehicleSummary ? 'normal' : 'italic' }}>
				<Truck style={{ width: '14px', height: '14px', color: '#2563EB', flexShrink: 0 }} />
				{carrier.vehicleSummary || 'Araç bilgisi eklenmemiş'}
			</div>

			{/* ROUTE TAGS */}
			{serviceAreas.length > 0 && (
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '10px 0' }}>
					{serviceAreas.slice(0, 3).map(area => (
						<span key={area} style={{ background: '#F1F5F9', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#64748B' }}>{area}</span>
					))}
					{serviceAreas.length > 3 && (
						<span style={{ fontSize: '11px', color: '#94A3B8', padding: '3px 6px' }}>+{serviceAreas.length - 3} daha</span>
					)}
				</div>
			)}

			{/* BOTTOM: Price + CTA */}
			<div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '14px', marginTop: serviceAreas.length > 0 ? '4px' : '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					{priceLabel ? (
						<>
							<span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>itibaren</span>
							<span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'block' }}>{priceLabel}</span>
						</>
					) : (
						<span style={{ fontSize: '14px', color: '#64748B' }}>Fiyat Sorunuz</span>
					)}
				</div>
				<button
					onClick={e => { e.stopPropagation(); navigate(detailPath); }}
					style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}
					onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.25)'; }}
					onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.boxShadow = 'none'; }}
				>
					İncele & Teklif Al
				</button>
			</div>
		</div>
	);
}
