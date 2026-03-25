import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  Star,
  FileCheck,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  ScrollText,
  Settings,
  UserCog,
  HandCoins,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  pendingCount?: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups = (pendingCount: number): NavGroup[] => [
  {
    title: 'Genel',
    items: [
      { to: '/admin/panel', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { to: '/admin/nakliyeciler', label: 'Nakliyeciler', icon: Truck },
      { to: '/admin/musteriler', label: 'Müşteriler', icon: Users },
      { to: '/admin/ilanlar', label: 'İlanlar', icon: Package },
      { to: '/admin/teklifler', label: 'Teklifler', icon: HandCoins },
      { to: '/admin/onay-kuyrugu', label: 'Onay Kuyruğu', icon: ShieldCheck, badge: pendingCount },
    ],
  },
  {
    title: 'İçerik & Kalite',
    items: [
      { to: '/admin/yorumlar', label: 'Yorumlar', icon: Star },
      { to: '/admin/belgeler', label: 'Belgeler', icon: FileCheck },
    ],
  },
  {
    title: 'Analitik',
    items: [
      { to: '/admin/raporlar', label: 'Raporlar', icon: BarChart3 },
      { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { to: '/admin/ayarlar', label: 'Ayarlar', icon: Settings },
      { to: '/admin/yonetim', label: 'Admin Yönetimi', icon: UserCog },
    ],
  },
];

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive
            ? 'bg-slate-800 text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-orange-500'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && item.badge > 0 ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
      {collapsed && item.badge && item.badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
          {item.badge && item.badge > 0 ? ` (${item.badge})` : ''}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function AdminSidebar({ collapsed, onToggle, pendingCount = 0 }: SidebarProps) {
  const groups = navGroups(pendingCount);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-slate-800 h-14', collapsed ? 'justify-center px-2' : 'px-5')}>
        {collapsed ? (
          <span className="text-lg font-bold text-orange-400">T</span>
        ) : (
          <div>
            <h1 className="text-base font-bold text-orange-400 leading-none">TaşıBurada</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, gi) => (
          <div key={group.title} className={cn(gi > 0 && 'mt-4')}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {group.title}
              </p>
            )}
            {collapsed && gi > 0 && <Separator className="mb-3 bg-slate-800" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Collapse Toggle */}
      <div className="border-t border-slate-800 p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full text-slate-400 hover:text-white hover:bg-slate-800',
            collapsed ? 'justify-center px-0' : 'justify-start',
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 mr-2" />}
          {!collapsed && <span className="text-xs">Daralt</span>}
        </Button>
      </div>
    </aside>
  );
}
