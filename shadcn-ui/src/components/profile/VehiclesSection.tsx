import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { API_BASE } from './helpers';
import type { SectionProps, VehicleType } from './types';
import { Camera, Pencil, Plus, Trash2, Truck } from 'lucide-react';

type VehicleItem = {
  id: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  plate?: string | null;
  licensePlate?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  capacityKg?: number | null;
  capacityM3?: number | null;
  photoUrls?: string[];
};

type VehicleForm = {
  vehicleTypeId: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  capacityKg: string;
  capacityM3: string;
  photos: File[];
};

const emptyForm: VehicleForm = {
  vehicleTypeId: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  capacityKg: '',
  capacityM3: '',
  photos: [],
};

export default function VehiclesSection({ user }: SectionProps) {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const apiOrigin = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_URL || '').trim();
    if (!raw) return 'http://localhost:3001';
    return raw.replace(/\/api\/v1\/?$/, '');
  }, []);

  const photoPreviewUrls = useMemo(
    () => form.photos.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [form.photos],
  );

  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [photoPreviewUrls]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const [vehiclesRes, typesRes] = await Promise.all([
        apiClient(`${API_BASE}/carriers/me/vehicles`),
        apiClient(`${API_BASE}/vehicle-types`),
      ]);

      const vehiclesJson = await vehiclesRes.json().catch(() => ({}));
      const typesJson = await typesRes.json().catch(() => ({}));

      if (vehiclesRes.ok && vehiclesJson?.success) {
        setVehicles(Array.isArray(vehiclesJson.data) ? vehiclesJson.data : []);
      }

      if (typesRes.ok && typesJson?.success && Array.isArray(typesJson.data)) {
        setVehicleTypes(typesJson.data);
      }
    } catch {
      toast.error('Araç listesi alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchVehicles();
  }, [user.id]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (vehicle: VehicleItem) => {
    setEditingId(vehicle.id);
    setForm({
      vehicleTypeId: vehicle.vehicleTypeId || '',
      plate: vehicle.plate || vehicle.licensePlate || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year ? String(vehicle.year) : '',
      capacityKg: vehicle.capacityKg ? String(vehicle.capacityKg) : '',
      capacityM3: vehicle.capacityM3 ? String(vehicle.capacityM3) : '',
      photos: [],
    });
    setModalOpen(true);
  };

  const onPickPhotos: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = Array.from(event.target.files || []);
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...files] }));
  };

  const removeSelectedPhoto = (name: string) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((file) => file.name !== name) }));
  };

  const saveVehicle = async () => {
    if (!form.vehicleTypeId) {
      toast.error('Araç tipi seçin.');
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = editingId
        ? `${API_BASE}/carriers/me/vehicles/${editingId}`
        : `${API_BASE}/carriers/me/vehicles`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await apiClient(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleTypeId: form.vehicleTypeId,
          plate: form.plate || undefined,
          licensePlate: form.plate || undefined,
          brand: form.brand || undefined,
          model: form.model || undefined,
          year: form.year ? Number(form.year) : undefined,
          capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
          capacityM3: form.capacityM3 ? Number(form.capacityM3) : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Araç kaydedilemedi.');
      }

      const savedId = json?.data?.id || editingId;
      if (savedId && form.photos.length > 0) {
        const fd = new FormData();
        form.photos.forEach((file) => fd.append('photos', file));
        const photoRes = await apiClient(`${API_BASE}/carriers/me/vehicles/${savedId}/photos`, {
          method: 'POST',
          body: fd,
        });
        const photoJson = await photoRes.json().catch(() => ({}));
        if (!photoRes.ok || !photoJson?.success) {
          throw new Error(photoJson?.message || 'Araç fotoğrafları yüklenemedi.');
        }
      }

      toast.success(editingId ? 'Araç güncellendi.' : 'Araç eklendi.');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchVehicles();
    } catch (error: any) {
      toast.error(error?.message || 'Araç kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!window.confirm('Bu aracı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await apiClient(`${API_BASE}/carriers/me/vehicles/${vehicleId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Araç silinemedi.');
      toast.success('Araç silindi.');
      await fetchVehicles();
    } catch (error: any) {
      toast.error(error?.message || 'Araç silinemedi.');
    }
  };

  const deleteServerPhoto = async (vehicleId: string, photoUrl: string) => {
    if (!window.confirm('Bu fotoğrafı silmek istiyor musunuz?')) return;
    try {
      const photoId = encodeURIComponent(photoUrl.split('/').pop() || photoUrl);
      const res = await apiClient(`${API_BASE}/carriers/me/vehicles/${vehicleId}/photos/${photoId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Fotoğraf silinemedi.');
      toast.success('Araç fotoğrafı silindi.');
      await fetchVehicles();
    } catch (error: any) {
      toast.error(error?.message || 'Fotoğraf silinemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">Araçlarım</h2>
          <p className="text-sm text-slate-500 mt-1">Fiziksel araçlarınızı plaka, kapasite ve fotoğraflarıyla yönetin.</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
          <Plus className="h-4 w-4 mr-2" /> Araç Ekle
        </Button>
      </div>

      <div className="h-px bg-slate-100 mt-4 mb-6" />

      {isLoading ? (
        <div className="text-sm text-slate-500">Araçlar yükleniyor...</div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <Truck className="h-8 w-8 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700">Henüz araç eklemediniz</p>
          <p className="text-xs text-slate-500 mt-1">İlk aracınızı ekleyerek filonuzu görünür hale getirin.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> Araç Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {vehicle.brand || 'Araç'} {vehicle.model || ''} {vehicle.year ? `(${vehicle.year})` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {vehicle.vehicleTypeName || 'Araç tipi yok'} • {vehicle.plate || vehicle.licensePlate || 'Plaka yok'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {vehicle.capacityKg || 0} kg {vehicle.capacityM3 ? `• ${vehicle.capacityM3} m³` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(vehicle)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteVehicle(vehicle.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Sil
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {(vehicle.photoUrls || []).length > 0 ? (
                  vehicle.photoUrls?.map((photoUrl) => (
                    <div key={photoUrl} className="relative">
                      <img src={`${apiOrigin}${photoUrl}`} alt="Araç" className="h-20 w-28 rounded-lg object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => deleteServerPhoto(vehicle.id, photoUrl)}
                        className="absolute -top-2 -right-2 rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="h-20 w-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <Camera className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Aracı Düzenle' : 'Yeni Araç Ekle'}</DialogTitle>
            <DialogDescription>Plaka, kapasite ve fotoğraf bilgilerini girin.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Araç Tipi</Label>
              <Select value={form.vehicleTypeId} onValueChange={(value) => setForm((prev) => ({ ...prev, vehicleTypeId: value }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Araç tipi seçin" /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plaka</Label>
              <Input className="mt-1" value={form.plate} onChange={(e) => setForm((prev) => ({ ...prev, plate: e.target.value.toUpperCase() }))} placeholder="34 ABC 123" />
            </div>
            <div>
              <Label>Marka</Label>
              <Input className="mt-1" value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} placeholder="Ford" />
            </div>
            <div>
              <Label>Model</Label>
              <Input className="mt-1" value={form.model} onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))} placeholder="Transit" />
            </div>
            <div>
              <Label>Yıl</Label>
              <Input className="mt-1" type="number" value={form.year} onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))} placeholder="2020" />
            </div>
            <div>
              <Label>Kapasite kg</Label>
              <Input className="mt-1" type="number" value={form.capacityKg} onChange={(e) => setForm((prev) => ({ ...prev, capacityKg: e.target.value }))} placeholder="3500" />
            </div>
            <div className="md:col-span-2">
              <Label>Kapasite m³</Label>
              <Input className="mt-1" type="number" value={form.capacityM3} onChange={(e) => setForm((prev) => ({ ...prev, capacityM3: e.target.value }))} placeholder="12" />
            </div>
            <div className="md:col-span-2">
              <Label>Fotoğraflar</Label>
              <Input className="mt-1" type="file" accept="image/*" multiple onChange={onPickPhotos} />
              {photoPreviewUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {photoPreviewUrls.map((item) => (
                    <div key={item.name} className="relative">
                      <img src={item.url} alt={item.name} className="h-20 w-28 rounded-lg object-cover border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => removeSelectedPhoto(item.name)}
                        className="absolute -top-2 -right-2 rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>İptal</Button>
            <Button onClick={saveVehicle} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Araç Ekle')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
