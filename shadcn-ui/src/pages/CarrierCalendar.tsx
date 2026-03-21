import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Carrier } from '@/lib/types';

interface CalendarDay {
  date: Date;
  isAvailable: boolean;
  hasBooking: boolean;
  isToday: boolean;
  isPast: boolean;
}

export default function CarrierCalendar() {
  const [user, setUser] = useState<Carrier | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    const userData = JSON.parse(storedUser);
    if (userData.type !== 'carrier') {
      navigate('/dashboard');
      return;
    }
    
    setUser(userData);
    
    // Load available dates from localStorage
    const savedDates = JSON.parse(localStorage.getItem(`availability_${userData.id}`) || '[]');
    setAvailableDates(savedDates);
  }, [navigate]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, availableDates]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      
      if (isCurrentMonth) {
        days.push({
          date,
          isAvailable: availableDates.includes(dateString),
          hasBooking: false, // TODO: Check for actual bookings
          isToday,
          isPast
        });
      }
    }
    
    setCalendarDays(days);
  };

  const toggleDateAvailability = (date: Date) => {
    if (!user) return;
    
    const dateString = date.toISOString().split('T')[0];
    const newAvailableDates = availableDates.includes(dateString)
      ? availableDates.filter(d => d !== dateString)
      : [...availableDates, dateString];
    
    setAvailableDates(newAvailableDates);
    localStorage.setItem(`availability_${user.id}`, JSON.stringify(newAvailableDates));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  if (!user) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Takvim & Müsaitlik</h1>
        <p className="text-gray-600 mt-2">
          Müsait olduğunuz günleri işaretleyin. Müşteriler sadece bu günlerde taşıma talep edebilir.
        </p>
      </div>

      {/* Calendar Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                ‹ Önceki
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                Sonraki ›
              </Button>
            </div>
          </div>
          <CardDescription>
            Günlere tıklayarak müsaitliğinizi güncelleyin
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span>Müsait</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
              <span>Rezerve</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span>Müsait Değil</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span>Bugün</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => !day.isPast && toggleDateAvailability(day.date)}
                disabled={day.isPast}
                className={`
                  p-2 text-sm border-2 rounded-lg transition-colors min-h-[40px] relative
                  ${day.isPast 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' 
                    : 'hover:bg-gray-50 cursor-pointer'
                  }
                  ${day.isToday 
                    ? 'border-blue-500 bg-blue-50' 
                    : day.isAvailable 
                      ? 'border-green-500 bg-green-50' 
                      : day.hasBooking 
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                  }
                `}
              >
                <span className="block">{day.date.getDate()}</span>
                {day.isAvailable && !day.isPast && (
                  <CheckCircle className="h-3 w-3 text-green-600 absolute top-1 right-1" />
                )}
                {day.hasBooking && (
                  <Clock className="h-3 w-3 text-red-600 absolute top-1 right-1" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bu Ay Müsait Günler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {calendarDays.filter(day => day.isAvailable && !day.isPast).length}
            </div>
            <p className="text-xs text-muted-foreground">Toplam müsait gün</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rezervasyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {calendarDays.filter(day => day.hasBooking).length}
            </div>
            <p className="text-xs text-muted-foreground">Onaylanmış işler</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Doluluk Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {availableDates.length > 0 
                ? Math.round((calendarDays.filter(day => day.hasBooking).length / availableDates.length) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">Rezerve edilmiş günler</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}