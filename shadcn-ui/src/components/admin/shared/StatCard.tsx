import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrendDirection } from '@/lib/admin-constants';
import { getTrendColor, getTrendBg } from '@/lib/admin-constants';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { direction: TrendDirection; value: string };
  subtitle?: string;
  onClick?: () => void;
  accentBorder?: string;
  className?: string;
}

const trendIcons: Record<TrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-slate-400',
  trend,
  subtitle,
  onClick,
  accentBorder,
  className,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300',
        className,
      )}
    >
      {accentBorder && (
        <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full', accentBorder)} />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50', iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold tabular-nums text-slate-900">
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </span>
        {trend && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              getTrendColor(trend.direction),
              getTrendBg(trend.direction),
            )}
          >
            {(() => { const TIcon = trendIcons[trend.direction]; return <TIcon className="h-3 w-3" />; })()}
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
