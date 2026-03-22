import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Package, TrendingUp, CheckCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Notification } from '@/lib/types';
import { getSessionUser } from '@/lib/storage';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : {});
    if (!user.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Load notifications for current user
    const storedNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const userNotifications = storedNotifications
      .filter(n => n.userId === user.id)
      // Normalize actionUrl for rating notifications to reviews page
      .map((n) => {
        if (n.type === 'rating_received') {
          const highlight = (n as any).relatedId ? `?highlight=${encodeURIComponent((n as any).relatedId)}` : '';
          return { ...n, actionUrl: `/nakliyeci/yorumlar${highlight}` };
        }
        return n;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10); // Show last 10 notifications

    setNotifications(userNotifications);
    setLoading(false);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    setNotifications(updatedNotifications);

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const updatedAllNotifications = allNotifications.map((n: Notification) => 
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    localStorage.setItem('notifications', JSON.stringify(updatedAllNotifications));
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updatedNotifications);

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const updatedAllNotifications = allNotifications.map((n: Notification) => 
      n.userId === user.id ? { ...n, isRead: true } : n
    );
    localStorage.setItem('notifications', JSON.stringify(updatedAllNotifications));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'offer_received':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'offer_accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offer_rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'shipment_update':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'rating_received':
        return <Bell className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Az önce';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return new Date(date).toLocaleDateString('tr-TR');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Bildirimler</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Tümünü okundu işaretle
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="h-6 w-6 mx-auto rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Henüz bildiriminiz yok</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {notification.actionUrl && (
                      <div className="mt-2 ml-7">
                        <Link 
                          to={notification.type === 'rating_received' ? (notification.actionUrl || '/nakliyeci/yorumlar') : notification.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline" className="text-xs">
                            Görüntüle
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}