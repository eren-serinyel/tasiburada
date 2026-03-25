import { useLocation, Link } from 'react-router-dom';
import { Bell, Menu, Search, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { clearAdminAuth, getAdminRole } from '@/lib/adminAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AdminTopbarProps {
  onMenuClick: () => void;
  onSearchOpen: () => void;
  sidebarCollapsed: boolean;
}

const routeLabels: Record<string, string> = {
  panel: 'Dashboard',
  nakliyeciler: 'Nakliyeciler',
  musteriler: 'Müşteriler',
  ilanlar: 'İlanlar',
  teklifler: 'Teklifler',
  'onay-kuyrugu': 'Onay Kuyruğu',
  yorumlar: 'Yorumlar',
  belgeler: 'Belgeler',
  raporlar: 'Raporlar',
  'audit-log': 'Audit Log',
  ayarlar: 'Ayarlar',
  yonetim: 'Admin Yönetimi',
};

function useBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);

  return segments.map((seg, i) => ({
    label: routeLabels[seg] || seg,
    href: '/admin/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));
}

export function AdminTopbar({ onMenuClick, onSearchOpen, sidebarCollapsed }: AdminTopbarProps) {
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs();
  const role = getAdminRole();

  const handleLogout = () => {
    clearAdminAuth();
    navigate('/admin/giris', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Menu toggle (mobile + collapse) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:text-slate-700 lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumb */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/admin/panel" className="text-slate-500 hover:text-slate-700">
                Admin
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <span key={crumb.href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="font-medium text-slate-900">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href} className="text-slate-500 hover:text-slate-700">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-slate-400 font-normal border-slate-200 hover:border-slate-300 h-8 px-3"
        onClick={onSearchOpen}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Ara...</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-400">
          ⌘K
        </kbd>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-8 w-8 text-slate-500 hover:text-slate-700">
        <Bell className="h-4 w-4" />
      </Button>

      {/* Profile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <span className="text-xs font-bold">A</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-slate-800">Admin</p>
            <p className="text-xs text-slate-500 capitalize">{role ?? 'admin'}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/admin/ayarlar')}>
            <User className="mr-2 h-4 w-4" />
            Profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600">
            <LogOut className="mr-2 h-4 w-4" />
            Çıkış Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
