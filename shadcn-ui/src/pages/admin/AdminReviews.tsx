import { useEffect, useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/adminAuth';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader, EmptyState, ErrorState } from '@/components/admin/shared';
import { Trash2, Star, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type RatingFilter = null | 1 | 2 | 3 | 4 | 5;

const ratingButtons: { value: RatingFilter; label: string }[] = [
  { value: null, label: 'Tümü' },
  { value: 1, label: '⭐1' },
  { value: 2, label: '⭐⭐2' },
  { value: 3, label: '⭐⭐⭐3' },
  { value: 4, label: '⭐⭐⭐⭐4' },
  { value: 5, label: '⭐⭐⭐⭐⭐5' },
];

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  carrier?: { companyName: string };
  customer?: { firstName: string; lastName: string };
}

export default function AdminReviews() {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(null);
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const limit = 20;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(ratingFilter !== null ? { rating: String(ratingFilter) } : {}),
      });
      const res = await adminApiClient(`/admin/reviews?${params}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data?.data ?? data.data?.reviews ?? []);
        setTotal(data.data?.total ?? data.data?.pagination?.total ?? 0);
      } else {
        toast.error(data.message);
        setError(true);
      }
    } catch {
      toast.error('Sunucuya bağlanılamadı.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter]);

  useEffect(() => { setPage(1); }, [ratingFilter]);
  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      const res = await adminApiClient(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Yorum silindi.');
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setTotal((prev) => prev - 1);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Silme işlemi başarısız.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Yorumlar" description={`Toplam ${total} yorum`} />

      {/* Rating filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {ratingButtons.map((btn) => (
          <Button
            key={String(btn.value)}
            variant={ratingFilter === btn.value ? 'default' : 'outline'}
            size="sm"
            className={`text-xs h-8 ${ratingFilter === btn.value ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            onClick={() => setRatingFilter(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {error ? (
        <ErrorState onRetry={fetchReviews} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-600">Müşteri</TableHead>
                <TableHead className="font-semibold text-slate-600">Nakliyeci</TableHead>
                <TableHead className="font-semibold text-slate-600">Puan</TableHead>
                <TableHead className="font-semibold text-slate-600">Yorum</TableHead>
                <TableHead className="font-semibold text-slate-600">Tarih</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={MessageSquare} title="Yorum bulunamadı" description="Filtre kriterlerinize uygun yorum yok." className="py-10" />
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-sm text-slate-700">
                      {review.customer ? `${review.customer.firstName} ${review.customer.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{review.carrier?.companyName ?? '—'}</TableCell>
                    <TableCell><StarRating rating={review.rating} /></TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-600 max-w-xs truncate">{review.comment}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: tr })}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50" disabled={deletingId === review.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Yorumu Sil</AlertDialogTitle>
                            <AlertDialogDescription>Bu yorumu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(review.id)} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                {total} kayıttan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} gösteriliyor
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
