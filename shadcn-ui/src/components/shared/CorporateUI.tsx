import { ReactNode } from 'react';
import { ArrowRight, Info, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneStyle: Record<Tone, { color: string; bg: string; border: string }> = {
  neutral: { color: 'var(--tb-ink-700)', bg: 'var(--tb-divider)', border: 'var(--tb-border)' },
  info: { color: 'var(--tb-brand-700)', bg: 'var(--tb-brand-50)', border: 'var(--tb-brand-50)' },
  success: { color: 'var(--tb-success)', bg: 'var(--tb-success-bg)', border: 'var(--tb-success-border)' },
  warning: { color: 'var(--tb-warning)', bg: 'var(--tb-warning-bg)', border: 'var(--tb-warning-border)' },
  danger: { color: 'var(--tb-danger)', bg: 'var(--tb-danger-bg)', border: 'var(--tb-danger-border)' },
};

export function CorporateCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn('rounded-[var(--tb-radius)] border p-5', className)}
      style={{ background: 'var(--tb-surface)', borderColor: 'var(--tb-border)', boxShadow: 'var(--tb-shadow)' }}
    >
      {children}
    </section>
  );
}

export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: 'var(--tb-ink-500)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

export function ValueText({ children, empty = false }: { children: ReactNode; empty?: boolean }) {
  return (
    <span style={{ color: empty ? 'var(--tb-ink-400)' : 'var(--tb-ink-900)', fontWeight: empty ? 500 : 700 }}>
      {children}
    </span>
  );
}

export function EmptyValue({ children = '-' }: { children?: ReactNode }) {
  return <ValueText empty>{children}</ValueText>;
}

export function ToneBadge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const toneVars = toneStyle[tone];
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold', className)}
      style={{ background: toneVars.bg, borderColor: toneVars.border, color: toneVars.color }}
    >
      {children}
    </span>
  );
}

export function InlineNotice({ tone = 'info', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  const toneVars = toneStyle[tone];
  return (
    <div
      className="inline-flex items-start gap-2 rounded-[var(--tb-radius-sm)] border px-3 py-2 text-sm"
      style={{ background: toneVars.bg, borderColor: toneVars.border, color: toneVars.color }}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <Info className="h-4 w-4" />}</span>
      <span>{children}</span>
    </div>
  );
}

export function RoutePair({
  originCity,
  originDistrict,
  destinationCity,
  destinationDistrict,
  originFallback,
  destinationFallback,
  compact = false,
}: {
  originCity?: string | null;
  originDistrict?: string | null;
  destinationCity?: string | null;
  destinationDistrict?: string | null;
  originFallback?: string | null;
  destinationFallback?: string | null;
  compact?: boolean;
}) {
  const origin = splitLocation(originCity, originDistrict, originFallback);
  const destination = splitLocation(destinationCity, destinationDistrict, destinationFallback);

  return (
    <div
      className={cn('grid items-stretch gap-3 sm:grid-cols-[1fr,auto,1fr]', compact && 'gap-2')}
      style={{ color: 'var(--tb-ink-900)' }}
    >
      <RouteEndpoint label="Çıkış" city={origin.city} district={origin.district} compact={compact} />
      <div className="hidden items-center sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--tb-brand-50)', color: 'var(--tb-brand-700)' }}>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
      <RouteEndpoint label="Varış" city={destination.city} district={destination.district} compact={compact} />
    </div>
  );
}

function RouteEndpoint({ label, city, district, compact }: { label: string; city: string; district: string; compact: boolean }) {
  const empty = city === '-' && district === '-';
  return (
    <div
      className={cn('rounded-[var(--tb-radius-sm)] border', compact ? 'px-3 py-2' : 'px-4 py-3')}
      style={{ background: 'var(--tb-canvas)', borderColor: 'var(--tb-border)' }}
    >
      <div className="mb-1 flex items-center gap-1.5" style={{ color: 'var(--tb-ink-500)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <MapPin className="h-3.5 w-3.5" />
        {label}
      </div>
      {empty ? (
        <EmptyValue />
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span style={{ fontSize: compact ? 15 : 17, fontWeight: 800 }}>{city}</span>
          {district !== '-' && <span style={{ color: 'var(--tb-ink-500)', fontSize: compact ? 13 : 14 }}>· {district}</span>}
        </div>
      )}
    </div>
  );
}

export function DetailList({ rows }: { rows: Array<{ label: string; value: ReactNode; hideWhenEmpty?: boolean }> }) {
  const visibleRows = rows.filter((row) => !(row.hideWhenEmpty && isEmptyValue(row.value)));
  return (
    <dl className="divide-y" style={{ borderColor: 'var(--tb-divider)' }}>
      {visibleRows.map((row) => {
        const empty = isEmptyValue(row.value);
        return (
          <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[180px,1fr] sm:items-start">
            <dt style={{ color: 'var(--tb-ink-500)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {row.label}
            </dt>
            <dd className="sm:text-right" style={{ color: empty ? 'var(--tb-ink-400)' : 'var(--tb-ink-900)', fontSize: 14, fontWeight: empty ? 500 : 700 }}>
              {empty ? '-' : row.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function QuoteBlock({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="rounded-[var(--tb-radius-sm)] border-l-4 px-4 py-3 text-sm leading-6"
      style={{ background: 'var(--tb-canvas)', borderColor: 'var(--tb-border)', color: 'var(--tb-ink-700)' }}
    >
      {children}
    </blockquote>
  );
}

function splitLocation(city?: string | null, district?: string | null, fallback?: string | null) {
  const safeCity = String(city || '').trim();
  const safeDistrict = String(district || '').trim();
  if (safeCity || safeDistrict) return { city: safeCity || '-', district: safeDistrict || '-' };

  const parts = String(fallback || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return { city: parts[0] || '-', district: parts[1] || '-' };
}

function isEmptyValue(value: ReactNode) {
  return value === null || value === undefined || value === '' || value === '-' || value === 'Yok' || value === '—';
}
