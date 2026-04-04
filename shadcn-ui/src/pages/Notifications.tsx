import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Bell, Truck, Wallet, HandCoins, CheckCheck } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string | null;
  createdAt: string;
}

type FilterTab = 'all' | 'unread' | 'offer' | 'payment' | 'system';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'unread', label: 'Okunmamış' },
  { key: 'offer', label: 'İş Fırsatları' },
  { key: 'payment', label: 'Ödemeler' },
  { key: 'system', label: 'Sistem' },
];

function typeCategory(type: string): 'offer' | 'payment' | 'status' | 'system' {
  const t = type.toLowerCase();
  if (t.includes('offer') || t.includes('teklif') || t.includes('bid')) return 'offer';
  if (t.includes('payment') || t.includes('ödeme') || t.includes('earning')) return 'payment';
  if (t.includes('status') || t.includes('shipment') || t.includes('transit')) return 'status';
  return 'system';
}

function iconForType(cat: ReturnType<typeof typeCategory>) {
  switch (cat) {
    case 'offer':
      return { bg: 'bg-blue-50', fg: 'text-blue-600', Icon: HandCoins };
    case 'payment':
      return { bg: 'bg-emerald-50', fg: 'text-emerald-600', Icon: Wallet };
    case 'status':
      return { bg: 'bg-amber-50', fg: 'text-amber-600', Icon: Truck };
    default:
      return { bg: 'bg-gray-100', fg: 'text-gray-500', Icon: Bell };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}g`;
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function dayGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (d >= today) return 'BUGÜN';
  if (d >= yesterday) return 'DÜN';
  if (d >= weekAgo) return 'BU HAFTA';
  return 'DAHA ESKİ';
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('all');
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient('/notifications');
      const json = await res.json();
      if (res.ok && json?.success) {
        setNotifs(Array.isArray(json.data) ? json.data : []);
      } else {
        setNotifs([]);
      }
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await apiClient(`/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      }
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const unread = notifs.filter((n) => !n.isRead);
      await Promise.all(unread.map((n) => apiClient(`/notifications/${n.id}/read`, { method: 'PUT' })));
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  const filtered = useMemo(() => {
    return notifs.filter((n) => {
      if (tab === 'unread') return !n.isRead;
      if (tab === 'offer') return typeCategory(n.type) === 'offer';
      if (tab === 'payment') return typeCategory(n.type) === 'payment';
      if (tab === 'system') return typeCategory(n.type) === 'system';
      return true;
    });
  }, [notifs, tab]);

  /* group by day */
  const grouped = useMemo(() => {
    const map = new Map<string, ApiNotification[]>();
    filtered.forEach((n) => {
      const g = dayGroup(n.createdAt);
      const arr = map.get(g) || [];
      arr.push(n);
      map.set(g, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="text-[13px]" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const isUnread = t.key === 'unread';
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {isUnread && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[15px] font-medium text-gray-500">
            {tab === 'all' ? 'Bildirim bulunmuyor' : 'Bu kategoride bildirim yok'}
          </p>
        </div>
      )}

      {/* ── Notification list ── */}
      {!loading &&
        grouped.map(([group, items]) => (
          <div key={group}>
            {/* Group header */}
            <div className="px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group}
            </div>

            {items.map((n) => {
              const cat = typeCategory(n.type);
              const { bg, fg, Icon } = iconForType(cat);

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.isRead) markAsRead(n.id);
                    if (n.relatedId) navigate(`/ilan/${n.relatedId}`);
                  }}
                  className={`w-full text-left flex items-start gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !n.isRead ? 'bg-blue-50/40 border-l-[3px] border-l-blue-600' : ''
                  }`}
                >
                  {/* Icon circle */}
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${fg}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-normal'} text-gray-900`}>
                      {n.title}
                    </p>
                    <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    {n.relatedId && (
                      <span className="inline-block text-xs text-blue-600 mt-1">İlanı görüntüle →</span>
                    )}
                  </div>

                  {/* Right: time + unread dot */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 ml-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
}
