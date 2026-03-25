import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  statusMap: Record<string, { label: string; color: string; dot?: string }>;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, statusMap, className, size = 'sm' }: StatusBadgeProps) {
  const config = statusMap[status];
  if (!config) return <span className="text-xs text-slate-400">—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        config.color,
        className,
      )}
    >
      {config.dot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  );
}
