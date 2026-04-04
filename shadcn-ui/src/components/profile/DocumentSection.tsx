import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Save } from 'lucide-react';
import FileUpload from '@/components/ui/file-upload';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

export default function DocumentSection({ user, refreshProfileStatus }: SectionProps) {
  const [docs, setDocs] = useState({
    kYetki: [] as File[], src: [] as File[], ruhsat: [] as File[], vergi: [] as File[], sigorta: [] as File[],
  });

  const mockFilePath = (file?: File | null) => {
    if (!file?.name) return '';
    return `/uploads/${file.name.replace(/\s+/g, '_')}`;
  };

  const buildPayload = () => {
    const payload: { type: string; fileUrl: string }[] = [];
    const pushSingle = (type: string, files?: File[]) => {
      if (!files?.length) return;
      const url = mockFilePath(files[0]);
      if (url) payload.push({ type, fileUrl: url });
    };
    pushSingle('AUTHORIZATION_CERT', docs.kYetki);
    pushSingle('SRC_CERT', docs.src);
    pushSingle('TAX_PLATE', docs.vergi);
    pushSingle('INSURANCE_POLICY', docs.sigorta);
    if (docs.ruhsat?.length) {
      docs.ruhsat.forEach(file => { const url = mockFilePath(file); if (url) payload.push({ type: 'VEHICLE_LICENSE', fileUrl: url }); });
    }
    return payload;
  };

  const save = async () => {
    try {
      const res = await apiClient(`${API_BASE}/carriers/${user.id}/documents`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: buildPayload() }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Belge kaydı başarısız');
      toast.success(json?.allRequiredHaveDoc ? 'Tüm belgeler kaydedildi.' : 'Belgeler taslak olarak kaydedildi.');
      await refreshProfileStatus?.();
    } catch {
      toast.error('Belgeler kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Belgeler</h2>
      <p className="text-sm text-slate-500 mt-1">PDF, JPG veya PNG formatında yükleyin. Admin tarafından doğrulanacaktır.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUpload label="K Yetki Belgesi (K1/K2)" required onUpload={(files) => setDocs(prev => ({ ...prev, kYetki: files }))} uploadedFiles={docs.kYetki} />
        <FileUpload label="SRC Belgesi" required onUpload={(files) => setDocs(prev => ({ ...prev, src: files }))} uploadedFiles={docs.src} />
        <FileUpload label="Araç Ruhsatı (en az 1)" required onUpload={(files) => setDocs(prev => ({ ...prev, ruhsat: files }))} uploadedFiles={docs.ruhsat} multiple />
        <FileUpload label="Vergi Levhası" required onUpload={(files) => setDocs(prev => ({ ...prev, vergi: files }))} uploadedFiles={docs.vergi} />
        <FileUpload label="Sigorta Poliçesi (opsiyonel)" onUpload={(files) => setDocs(prev => ({ ...prev, sigorta: files }))} uploadedFiles={docs.sigorta} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
