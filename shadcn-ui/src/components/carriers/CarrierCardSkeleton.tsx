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
