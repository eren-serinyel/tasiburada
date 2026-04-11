import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/apiClient';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Package,
  Weight,
  Truck,
  Banknote,
  Clock,
  Star,
  X as XIcon,
  Check,
  Search,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { formatLocation } from '@/utils/formatLocation';

const API_BASE_URL = '/api/v1';

type StatusFilter = 'all' | 'completed' | 'cancelled';

interface BackendShipment {
  id: string;
  origin: string;
  destination: string;
  loadDetails: string;
  status: string;
  shipmentDate: string;
  createdAt: string;
  price?: number;
  weight?: number | string;
  carrierName?: string;
  hasReview?: boolean;
}

interface CustomerReview {
  id: string;
  shipmentId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 0 });
}

export default function History() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [shipments, setShipments] = useState<BackendShipment[]>([]);
  const [loading, setLoading] = useState(true);

  /* Review modal state */
  const [reviewTarget, setReviewTarget] = useState<BackendShipment | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSending, setReviewSending] = useState(false);

  /* Edit/delete review state */
  const [reviewsMap, setReviewsMap] = useState<Record<string, CustomerReview>>({});
  const [editTarget, setEditTarget] = useState<CustomerReview | null>(null);
  const [editStars, setEditStars] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editText, setEditText] = useState('');
  const [editSending, setEditSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerReview & { shipmentId: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const [shipmentsRes, reviewsRes] = await Promise.all([
        apiClient(`${API_BASE_URL}/customers/shipments`),
        apiClient(`${API_BASE_URL}/customers/me/reviews`),
      ]);
      const shipmentsJson = await shipmentsRes.json();
      if (shipmentsRes.ok && shipmentsJson?.success && Array.isArray(shipmentsJson.data)) {
        setShipments(shipmentsJson.data);
      } else {
        setShipments([]);
      }
      const reviewsJson = await reviewsRes.json().catch(() => ({}));
      if (reviewsRes.ok && reviewsJson?.success && Array.isArray(reviewsJson.data)) {
        const map: Record<string, CustomerReview> = {};
        for (const r of reviewsJson.data) {
          map[r.shipmentId] = r;
        }
        setReviewsMap(map);
      }
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const list = useMemo(() => {
    let items = shipments;
    if (statusFilter === 'completed') items = items.filter((s) => s.status === 'completed');
    else if (statusFilter === 'cancelled') items = items.filter((s) => s.status === 'cancelled');
    else items = items.filter((s) => s.status === 'completed' || s.status === 'cancelled');

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) => s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q)
      );
    }
    return items;
  }, [shipments, statusFilter, search]);

  const handleReviewSubmit = async () => {
    if (!reviewTarget || reviewStars === 0) {
      toast.error('Lütfen puan seçin.');
      return;
    }
    setReviewSending(true);
    try {
      const res = await apiClient('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: reviewTarget.id,
          rating: reviewStars,
          comment: reviewText || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.message || 'Yorum gönderilemedi.');
        return;
      }
      toast.success('Yorumunuz gönderildi.');
      if (json?.data) setReviewsMap(prev => ({ ...prev, [reviewTarget.id]: json.data }));
      setShipments((prev) =>
        prev.map((s) => (s.id === reviewTarget.id ? { ...s, hasReview: true } : s))
      );
      setReviewTarget(null);
      setReviewStars(0);
      setReviewText('');
    } catch {
      toast.error('Yorum gönderilemedi.');
    } finally {
      setReviewSending(false);
    }
  };

  const handleEditReviewSubmit = async () => {
    if (!editTarget || editStars === 0) { toast.error('Lütfen puan seçin.'); return; }
    setEditSending(true);
    try {
      const res = await apiClient(`/api/v1/reviews/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: editStars, comment: editText }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.message || 'Güncelleme başarısız.'); return; }
      setReviewsMap(prev => ({ ...prev, [editTarget.shipmentId]: { ...prev[editTarget.shipmentId], rating: editStars, comment: editText } }));
      toast.success('Yorumunuz güncellendi.');
      setEditTarget(null);
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setEditSending(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setDeleteActionLoading(true);
    try {
      const res = await apiClient(`/api/v1/reviews/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.message || 'Silme başarısız.'); return; }
      setReviewsMap(prev => { const next = { ...prev }; delete next[deleteTarget.shipmentId]; return next; });
      setShipments(prev => prev.map(s => s.id === deleteTarget.shipmentId ? { ...s, hasReview: false } : s));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      toast.success('Yorumunuz silindi.');
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setDeleteActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Taşıma Geçmişim</h1>
        <p className="text-sm text-gray-500 mt-1">Tamamlanan ve iptal edilen tüm taşımalarınız</p>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {([
            ['all', 'Tümü'],
            ['completed', 'Tamamlandı'],
            ['cancelled', 'İptal'],
          ] as [StatusFilter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Güzergah ara..."
            className="pl-9 h-10 border-gray-200 focus:border-blue-600 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* ── Empty state ── */}
      {list.length === 0 && (
        <div className="py-16 text-center">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[15px] font-medium text-gray-600">Henüz tamamlanmış taşıma yok</p>
          <Link
            to="/ilan-olustur"
            className="inline-block mt-3 text-sm text-blue-600 font-medium hover:underline"
          >
            İlanınızı oluşturun →
          </Link>
        </div>
      )}

      {/* ── Shipment cards ── */}
      <div className="space-y-3">
        {list.map((s) => {
          const isCompleted = s.status === 'completed';
          const isCancelled = s.status === 'cancelled';

          return (
            <Card
              key={s.id}
              className="border shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150"
            >
              <CardContent className="p-5 space-y-3">
                {/* Top row */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[16px] font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                    {formatLocation(s.origin)}
                    <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {formatLocation(s.destination)}
                  </p>
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                      <Check className="h-3 w-3" /> Tamamlandı
                    </span>
                  )}
                  {isCancelled && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 whitespace-nowrap">
                      <XIcon className="h-3 w-3" /> İptal Edildi
                    </span>
                  )}
                </div>

                {/* Detail chips */}
                <div className="flex flex-wrap gap-2">
                  <Chip icon={<Calendar className="h-3.5 w-3.5" />}>
                    {new Date(s.shipmentDate || s.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Chip>
                  {s.loadDetails && (
                    <Chip icon={<Package className="h-3.5 w-3.5" />}>{s.loadDetails}</Chip>
                  )}
                  {s.weight && (
                    <Chip icon={<Weight className="h-3.5 w-3.5" />}>{s.weight} kg</Chip>
                  )}
                  {s.carrierName && (
                    <Chip icon={<Truck className="h-3.5 w-3.5" />}>{s.carrierName}</Chip>
                  )}
                  {isCompleted && s.price && (
                    <Chip icon={<Banknote className="h-3.5 w-3.5" />}>₺{fmt(s.price)}</Chip>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-400">
                    Oluşturulma: {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCompleted && !s.hasReview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[13px] h-8"
                        onClick={() => {
                          setReviewTarget(s);
                          setReviewStars(0);
                          setReviewText('');
                        }}
                      >
                        Yorum Yaz
                      </Button>
                    )}
                    {isCompleted && s.hasReview && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-[12px] h-7 gap-1 text-blue-600"
                          onClick={() => {
                            const r = reviewsMap[s.id];
                            if (r) { setEditTarget(r); setEditStars(r.rating); setEditText(r.comment ?? ''); }
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Düzenle
                        </Button>
                        <Button variant="ghost" size="sm" className="text-[12px] h-7 gap-1 text-red-600 hover:text-red-700"
                          onClick={() => {
                            const r = reviewsMap[s.id];
                            if (r) { setDeleteTarget({ ...r, shipmentId: s.id }); setDeleteDialogOpen(true); }
                          }}
                        >
                          <Trash2 className="h-3 w-3" /> Sil
                        </Button>
                      </div>
                    )}
                    <Link
                      to={`/ilan/${s.id}`}
                      className="text-[13px] text-blue-600 font-medium hover:underline"
                    >
                      Detayları Gör
                    </Link>
                  </div>
                </div>

                {/* Repeat buttons */}
                {isCompleted && (
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[12px] h-7 gap-1"
                      onClick={() => {
                        sessionStorage.setItem('repeatShipment', JSON.stringify({
                          origin: s.origin,
                          destination: s.destination,
                          loadDetails: s.loadDetails,
                          weight: s.weight,
                        }));
                        navigate('/teklif-talebi?repeat=true');
                      }}
                    >
                      <Copy className="h-3 w-3" /> Tekrar Oluştur
                    </Button>
                    {s.carrierName && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[12px] h-7 gap-1"
                        onClick={() => {
                          sessionStorage.setItem('repeatShipment', JSON.stringify({
                            origin: s.origin,
                            destination: s.destination,
                            loadDetails: s.loadDetails,
                            weight: s.weight,
                            inviteCarrierName: s.carrierName,
                          }));
                          navigate('/teklif-talebi?repeat=true&invite=true');
                        }}
                      >
                        <RotateCcw className="h-3 w-3" /> Aynı Firma ile Tekrar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Review modal (inline dialog) ── */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nakliyeci Değerlendir</h3>
              <button
                onClick={() => setReviewTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {reviewTarget.carrierName && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-800">{reviewTarget.carrierName}</span>
              </div>
            )}

            {/* Stars */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setReviewHover(star)}
                  onMouseLeave={() => setReviewHover(0)}
                  onClick={() => setReviewStars(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className="h-8 w-8"
                    fill={(reviewHover || reviewStars) >= star ? '#F59E0B' : 'none'}
                    stroke={(reviewHover || reviewStars) >= star ? '#F59E0B' : '#e5e7eb'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Nakliyeci hakkındaki deneyiminizi paylaşın..."
              className="w-full min-h-[100px] resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
            />

            <div className="space-y-2">
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewSending}
                className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-semibold"
              >
                {reviewSending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor...
                  </span>
                ) : (
                  'Gönder'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setReviewTarget(null)}
                className="w-full h-10 text-gray-500"
              >
                Vazgeç
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Review modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Yorumu Düzenle</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setEditHover(star)}
                  onMouseLeave={() => setEditHover(0)}
                  onClick={() => setEditStars(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className="h-8 w-8"
                    fill={(editHover || editStars) >= star ? '#F59E0B' : 'none'}
                    stroke={(editHover || editStars) >= star ? '#F59E0B' : '#e5e7eb'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Yorumunuzu güncelleyin..."
              className="w-full min-h-[100px] resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
            />

            <div className="flex gap-2">
              <Button onClick={handleEditReviewSubmit} disabled={editSending || editStars === 0} className="flex-1 bg-blue-600 hover:bg-blue-700 h-10">
                {editSending ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</span> : 'Kaydet'}
              </Button>
              <Button variant="ghost" onClick={() => setEditTarget(null)} className="flex-1 h-10 text-gray-500">Vazgeç</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Review confirmation ── */}
      {deleteDialogOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Yorumu Sil</h3>
            <p className="text-sm text-gray-500">Yorumunuzu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>İptal</Button>
              <Button
                variant="destructive"
                disabled={deleteActionLoading}
                onClick={handleDeleteReview}
              >
                {deleteActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1">
      {icon}
      {children}
    </span>
  );
}
