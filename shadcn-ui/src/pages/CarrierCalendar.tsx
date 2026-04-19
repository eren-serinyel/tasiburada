import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Carrier } from '@/lib/types';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeAvailableDates(dates: unknown): string[] {
  if (!Array.isArray(dates)) {
    return [];
  }

  return Array.from(
    new Set(
      dates
        .map((date) => String(date).trim())
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
    ),
  ).sort();
}

interface CalendarDay {
  date: Date;
  isAvailable: boolean;
  hasBooking: boolean;
  isToday: boolean;
  isPast: boolean;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function CarrierCalendar() {
  const [user, setUser] = useState<Carrier | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [initialDates, setInitialDates] = useState<string[]>([]);
  const [existingActivity, setExistingActivity] = useState<Record<string, unknown> | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const hasChanges = useMemo(() => {
    const sorted = [...availableDates].sort().join(',');
    const sortedInitial = [...initialDates].sort().join(',');
    return sorted !== sortedInitial;
  }, [availableDates, initialDates]);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/giris');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (userData.type !== 'carrier') {
      navigate('/panel');
      return;
    }

    setUser(userData);

    (async () => {
      try {
        const res = await apiClient('/api/v1/carriers/me/activity');
        const json = await res.json();
        if (res.ok && json?.success) {
          const activity = json.data ?? {};
          const dates = normalizeAvailableDates(activity.availableDates);
          setAvailableDates(dates);
          setInitialDates(dates);
          setExistingActivity(activity);
        }
      } catch {
        toast.error('Takvim yüklenemedi.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, availableDates]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    /* Monday-based start: getDay() returns 0=Sun..6=Sat → shift to 0=Mon..6=Sun */
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDow);

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalCells = Math.max(35, startDow + lastDay.getDate() > 35 ? 42 : 35);

    for (let i = 0; i < totalCells; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateString = formatDateKey(date);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;

      days.push({
        date,
        isAvailable: isCurrentMonth && availableDates.includes(dateString),
        hasBooking: false,
        isToday: isCurrentMonth && isToday,
        isPast: !isCurrentMonth || isPast,
      });
    }

    setCalendarDays(days);
  };

  const toggleDateAvailability = (day: CalendarDay) => {
    if (!user || day.isPast) return;

    const dateString = formatDateKey(day.date);
    const newAvailableDates = availableDates.includes(dateString)
      ? availableDates.filter((d) => d !== dateString)
      : [...availableDates, dateString];

    setAvailableDates(normalizeAvailableDates(newAvailableDates));
  };

  const handleSave = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const body = {
        city: (existingActivity?.city as string) ?? '',
        district: existingActivity?.district,
        address: existingActivity?.address,
        serviceAreas: (existingActivity?.serviceAreas as string[]) ?? [],
        availableDates: normalizeAvailableDates(availableDates),
      };
      const res = await apiClient('/api/v1/carriers/me/activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error((json as { message?: string }).message ?? 'Kayıt başarısız.');
        return;
      }
      const json = await res.json().catch(() => ({}));
      const savedActivity = json?.data ?? body;
      const savedDates = normalizeAvailableDates(savedActivity.availableDates);
      setAvailableDates(savedDates);
      setInitialDates(savedDates);
      setExistingActivity(savedActivity);
      toast.success('Müsaitlik takvimi kaydedildi.');
    } catch {
      toast.error('Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Takvimim</h1>
          <p className="text-sm text-gray-500 mt-1">Müsait olduğunuz günleri işaretleyin</p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[120px] text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Calendar ── */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 pb-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, i) => {
              const inMonth = day.date.getMonth() === currentMonth.getMonth();
              const isToday = day.isToday;
              const isAvailable = day.isAvailable;
              const hasBooking = day.hasBooking;
              const isPast = day.isPast;

              let cellCls =
                'relative flex flex-col items-center justify-center rounded-lg p-2 min-h-[44px] transition-all duration-150 select-none';

              if (isToday) {
                cellCls += ' bg-blue-600 text-white font-bold';
              } else if (isAvailable && !isPast) {
                cellCls += ' bg-blue-50 text-blue-600 border border-blue-600';
              } else if (hasBooking) {
                cellCls += ' bg-amber-50 text-amber-600';
              } else if (isPast) {
                cellCls += ' opacity-40 cursor-not-allowed';
              } else {
                cellCls += ' hover:bg-gray-100 cursor-pointer';
              }

              if (!isPast && !isToday) {
                cellCls += ' cursor-pointer';
              }

              return (
                <button
                  type="button"
                  key={i}
                  disabled={isPast}
                  onClick={() => toggleDateAvailability(day)}
                  className={cellCls}
                >
                  <span className={`text-sm font-medium ${!inMonth ? 'opacity-30' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  {/* Dot indicators */}
                  {inMonth && !isPast && (isAvailable || hasBooking) && !isToday && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        hasBooking ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100">
            <LegendItem color="bg-blue-600" label="Müsait" />
            <LegendItem color="bg-amber-500" label="Meşgul" />
            <LegendItem color="bg-gray-800" label="Bugün" />
          </div>
        </CardContent>
      </Card>

      {/* ── Save button ── */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-semibold rounded-lg disabled:opacity-60"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Kaydediliyor...
            </span>
          ) : 'Müsaitliği Kaydet'}
        </Button>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
