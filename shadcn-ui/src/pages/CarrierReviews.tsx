import { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

type CarrierReview = {
  id: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const mask = (full: string) => {
  const [f, ...rest] = (full || '').trim().split(/\s+/);
  const last = rest.join(' ');
  return `${f || ''} ${last ? last[0] + '***' : ''}`.trim();
};

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : i < rating ? 'fill-yellow-200 text-yellow-400' : 'text-gray-300'}`} />
  ));
};

export default function CarrierReviews() {
  const [reviews, setReviews] = useState<CarrierReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportState, setReportState] = useState({ reason: '', details: '' });
  const { toast } = useToast();
  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get('highlight') || '';
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  const user = getSessionUser();
  const carrierId = user?.id;

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!carrierId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/carriers/me/reviews', {
          headers: authHeaders()
        });
        const json = await res.json();
        if (res.ok && json?.success && Array.isArray(json.data)) {
          const list = (json.data as CarrierReview[]).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          setReviews(list);
        } else {
          setReviews([]);
        }
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [carrierId]);

  useEffect(() => {
    if (!highlightId) return;
    // küçük bir gecikme ile scroll ve parlatma efekti
    setTimeout(() => {
      const el = document.getElementById(`rev-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2','ring-blue-400','bg-blue-50');
        setTimeout(() => el.classList.remove('ring-2','ring-blue-400','bg-blue-50'), 2000);
      }
    }, 150);
  }, [highlightId]);

  const activeCount = useMemo(() => reviews.length, [reviews]);
  const activeAvg = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, y) => acc + Number(y.rating || 0), 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  if (!user || user.type !== 'carrier') {
    return <div className="container mx-auto py-8">Bu sayfa sadece nakliyeciler içindir.</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tüm Değerlendirmelerim</h1>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="flex items-center gap-1">{renderStars(activeAvg)}<span className="font-medium">{activeAvg}/5</span></div>
          <span className="text-gray-400">•</span>
          <span>{activeCount} aktif yorum</span>
        </div>
      </div>

      <Card className="shadow-sm border border-gray-200 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Müşteri Değerlendirmeleri
          </CardTitle>
          <CardDescription>Son müşteri yorumları ve puanları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-gray-500 text-sm">Yükleniyor...</p>}
          {!loading && reviews.length === 0 && (
            <p className="text-gray-500 text-sm">Henüz yorum yapılmamış.</p>
          )}
          {reviews.map((y) => {
            const name = `${y.customerFirstName || ''} ${y.customerLastName || ''}`.trim() || 'Müşteri';
            const isSuspended = false;
            return (
              <div key={y.id} id={`rev-${y.id}`} className="border-b pb-3 last:border-0 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{mask(name)}</span>
                  <span className="text-sm text-gray-500">{new Date(y.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
                {isSuspended && <div className="text-xs text-red-600 mt-1">⛔ Bu yorum inceleniyor.</div>}
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">{renderStars(y.rating)}<span>{Number(y.rating).toFixed(1)}/5</span></div>
                <p className="text-gray-700 mt-1">{y.comment}</p>
                <div className="mt-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setReportId(y.id)} disabled={isSuspended}>Şikayet Et</Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Report inline modal */}
      {reportId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-2">Yorumu Şikayet Et</h2>
            <p className="text-sm text-gray-600 mb-4">Bu yorumu neden şikayet ediyorsunuz?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Argo / küfür', 'Yanlış bilgi', 'Haksız değerlendirme'].map(r => (
                <Button key={r} type="button" variant={reportState.reason === r ? 'default' : 'outline'} size="sm" onClick={() => setReportState(s => ({ ...s, reason: r }))}>{r}</Button>
              ))}
            </div>
            <div className="grid gap-2 mb-4">
              <Label className="text-sm">Açıklama</Label>
              <Textarea rows={3} value={reportState.details} onChange={(e) => setReportState(s => ({ ...s, details: e.target.value }))} />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setReportId(null)}>İptal</Button>
              <Button onClick={() => {
                if (!reportState.reason) { toast({ title: 'Gerekçe seçin' }); return; }
                setReviews(prev => prev.map(r => r.id === reportId ? { ...r } : r));
                setReportId(null);
                setReportState({ reason: '', details: '' });
                toast({ title: 'Şikayet alındı', description: 'Yorum incelemeye alındı.' });
              }}>Gönder</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
