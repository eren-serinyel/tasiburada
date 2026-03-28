import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { MapPin, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { toast } from '@/components/ui/sonner';

const API_BASE_URL = '/api/v1';

interface BackendOffer {
  id: string;
  shipmentId: string;
  carrierId: string;
  shipment?: { id: string; origin?: string; destination?: string; loadDetails?: string; status?: string };
  price: number;
  message?: string;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  offeredAt: string;
}

const statusLabel: Record<string, string> = {
  pending: 'Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri Çekildi',
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

export default function CarrierOffers() {
  const [offers, setOffers] = useState<BackendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<{ id: string; price: string; message: string; estimatedDuration: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string } | null>(null);
  const navigate = useNavigate();

  const fetchOffers = async () => {
    try {
      const res = await apiClient(`${API_BASE_URL}/carriers/me/offers`);
      const json = await res.json();
      if (res.ok && json?.success) {
        setOffers(json.data || []);
      }
    } catch {
      toast.error('Teklifler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleUpdate = async () => {
    if (!edit) return;
    try {
      const body: Record<string, unknown> = {};
      const price = parseFloat(edit.price);
      if (!isNaN(price) && price > 0) body.price = price;
      if (edit.message !== undefined) body.message = edit.message;
      const dur = parseInt(edit.estimatedDuration);
      if (!isNaN(dur) && dur > 0) body.estimatedDuration = dur;
      const res = await apiClient(`${API_BASE_URL}/offers/${edit.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif güncellendi.');
        fetchOffers();
      } else {
        toast.error(json?.message || 'Güncelleme başarısız.');
      }
    } catch {
      toast.error('Teklif güncellenirken hata oluştu.');
    } finally {
      setEdit(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm) return;
    try {
      const res = await apiClient(`${API_BASE_URL}/offers/${confirm.id}/withdraw`, { method: 'PUT' });
      const json = await res.json();
      if (res.ok && json?.success) {
        toast.success('Teklif geri çekildi.');
        fetchOffers();
      } else {
        toast.error(json?.message || 'İptal başarısız.');
      }
    } catch {
      toast.error('Teklif iptal edilirken hata oluştu.');
    } finally {
      setConfirm(null);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card><CardContent className="py-10 text-center text-gray-600">Yükleniyor...</CardContent></Card>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Teklif Yönetimi</h1>
        <p className="text-gray-600">Verdiğiniz teklifleri görüntüleyin.</p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Henüz teklif vermediniz.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map(o => {
            const s = o.shipment;
            return (
              <Card key={o.id} className="hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" /> {s ? `${s.origin} → ${s.destination}` : o.shipmentId}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor[o.status] || 'bg-gray-100 text-gray-800'}>{statusLabel[o.status] || o.status}</Badge>
                      <div className="text-xl font-bold text-green-600">{o.price}₺</div>
                    </div>
                  </CardTitle>
                  <CardDescription>Oluşturma: {new Date(o.offeredAt).toLocaleString('tr-TR')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm space-y-0.5">
                    {o.estimatedDuration && <div><strong>Tahmini Süre:</strong> {o.estimatedDuration} saat</div>}
                    {o.message && <div className="text-gray-600">{o.message}</div>}
                  </div>
                  <div className="flex gap-2">
                    {o.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEdit({ id: o.id, price: String(o.price), message: o.message || '', estimatedDuration: o.estimatedDuration ? String(o.estimatedDuration) : '' })}><Pencil className="h-4 w-4 mr-1" /> Güncelle</Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirm({ id: o.id })}><Trash2 className="h-4 w-4 mr-1" /> İptal Et</Button>
                      </>
                    )}
                    {o.status === 'accepted' && s && (
                      <Button size="sm" onClick={() => navigate(`/ilan/${s.id}`)}><CheckCircle2 className="h-4 w-4 mr-1" /> İşi Aç</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Yeni Fiyat (₺)</Label>
              <Input value={edit?.price || ''} onChange={(e) => setEdit(prev => prev ? { ...prev, price: e.target.value } : prev)} type="number" />
            </div>
            <div>
              <Label>Mesaj</Label>
              <Input value={edit?.message || ''} onChange={(e) => setEdit(prev => prev ? { ...prev, message: e.target.value } : prev)} />
            </div>
            <div>
              <Label>Tahmini Süre (saat)</Label>
              <Input value={edit?.estimatedDuration || ''} onChange={(e) => setEdit(prev => prev ? { ...prev, estimatedDuration: e.target.value } : prev)} type="number" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}><XCircle className="h-4 w-4 mr-1" /> Vazgeç</Button>
              <Button onClick={handleUpdate}><CheckCircle2 className="h-4 w-4 mr-1" /> Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklifi İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Bu teklifi iptal etmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}><XCircle className="h-4 w-4 mr-1" /> Vazgeç</Button>
              <Button onClick={handleCancel}><Trash2 className="h-4 w-4 mr-1" /> İptal Et</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
