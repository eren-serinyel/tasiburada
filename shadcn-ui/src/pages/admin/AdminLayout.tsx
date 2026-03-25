import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopbar } from '@/components/admin/layout/AdminTopbar';
import { adminApiClient } from '@/lib/adminAuth';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending approval count for sidebar badge
  useEffect(() => {
    adminApiClient('/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPendingCount(data.data.pendingCarriers ?? 0);
      })
      .catch(() => {});
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSidebar = useCallback(() => setCollapsed((v) => !v), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:flex">
        <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} pendingCount={pendingCount} />
      </div>

      {/* Sidebar - mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <AdminSidebar collapsed={false} onToggle={() => setMobileOpen(false)} pendingCount={pendingCount} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar
          onMenuClick={toggleMobile}
          onSearchOpen={() => setSearchOpen(true)}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
