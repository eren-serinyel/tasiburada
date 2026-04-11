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
		? `${experienceYears} Yıl Deneyim`
		: 'Yeni Başlayan';

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
			toast({ title: result ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı' });
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
								<div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white" title="Onaylı Nakliyeci">
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
								<span className="truncate max-w-[140px]">{carrier.city || 'Şehir belirtilmedi'}</span>
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
							title={liked ? 'Favorilerden çıkar' : 'Favorilere ekle'}
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
								{carrier.vehicleSummary || 'Araç bilgisi belirtilmemiş'}
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
									+{serviceAreas.length - 3} bölge
								</span>
							)}
						</div>
					)}
				</div>
			</CardContent>

			<CardFooter className="p-5 pt-0 mt-auto flex flex-col gap-3 border-t border-slate-100/50">
				<div className="flex items-center justify-between w-full pt-4">
					<div>
						<p className="text-xs text-slate-500 font-medium mb-0.5">Başlangıç</p>
						<p className="text-lg font-bold text-slate-900">{priceLabel}</p>
					</div>
					<div className="text-right">
						<Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700 font-medium">
							{experienceText}
						</Badge>
					</div>
				</div>

				<Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md group-hover:shadow-lg transition-all" onClick={handleInspect}>
					İncele & Teklif Al
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
		.replace(/ç/g, 'c')
		.replace(/ğ/g, 'g')
		.replace(/ı/g, 'i')
		.replace(/ö/g, 'o')
		.replace(/ş/g, 's')
		.replace(/ü/g, 'u')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		|| 'nakliyeci';
};
