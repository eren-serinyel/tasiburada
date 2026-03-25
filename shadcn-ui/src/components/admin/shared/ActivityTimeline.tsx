import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  icon?: React.ReactNode;
  dotColor?: string;
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  return (
    <div className={cn('relative space-y-0', className)}>
      {items.map((item, idx) => (
        <div key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {/* Line */}
          {idx < items.length - 1 && (
            <div className="absolute left-[9px] top-5 h-full w-px bg-slate-200" />
          )}
          {/* Dot */}
          <div className="relative mt-1 flex-shrink-0">
            {item.icon || (
              <div className={cn('h-[18px] w-[18px] rounded-full border-2 border-white ring-2 ring-slate-200', item.dotColor || 'bg-slate-300')} />
            )}
          </div>
          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 leading-snug">{item.title}</p>
            {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}
            <p className="mt-0.5 text-xs text-slate-400">
              {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: tr })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
