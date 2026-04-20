import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Download, Eye, Save, FileText, Trash2 } from 'lucide-react';
import FileUpload from '@/components/ui/file-upload';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

type BackendDocument = {
  id?: string;
  type: string;
  status: string;
  uploadedAt?: string;
  fileUrl?: string;
};

export default function DocumentSection({ user, refreshProfileStatus }: SectionProps) {
  const [docs, setDocs] = useState({
    kYetki: [] as File[], src: [] as File[], ruhsat: [] as File[], vergi: [] as File[], sigorta: [] as File[],
  });
  const [backendDocs, setBackendDocs] = useState<BackendDocument[]>([]);

  const apiOrigin = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_URL || '').trim();
    if (!raw) return 'http://localhost:3001';
    return raw.replace(/\/api\/v1\/?$/, '');
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await apiClient(`${API_BASE}/carriers/me/documents`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) return;

      const docList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.data?.documents)
          ? json.data.documents
          : [];

      setBackendDocs(docList);
    } catch {}
  };

  const openDocument = async (doc: BackendDocument, download = false) => {
    if (!doc.id) return;
    try {
      const response = await apiClient(`${API_BASE}/carriers/me/documents/${doc.id}/download`);
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.message || 'Belge açılamadı.');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const extension = (doc.fileUrl || '').split('.').pop() || 'pdf';
      const fileName = `${doc.type.toLowerCase()}.${extension}`;

      if (download) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      }

      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: any) {
      toast.error(error?.message || 'Belge açılamadı.');
    }
  };

  const deleteDocument = async (doc: BackendDocument) => {
    if (!doc.id) return;
    if (!window.confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;

    try {
      const response = await apiClient(`${API_BASE}/carriers/me/documents/${doc.id}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) throw new Error(json?.message || 'Belge silinemedi.');
      toast.success('Belge silindi.');
      await fetchDocuments();
      await refreshProfileStatus?.();
    } catch (error: any) {
      toast.error(error?.message || 'Belge silinemedi.');
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, [user.id]);

  const buildUploadQueue = () => {
    const payload: { type: string; file: File }[] = [];
    const pushSingle = (type: string, files?: File[]) => {
      if (files?.[0]) payload.push({ type, file: files[0] });
    };

    pushSingle('AUTHORIZATION_CERT', docs.kYetki);
    pushSingle('SRC_CERT', docs.src);
    pushSingle('TAX_PLATE', docs.vergi);
    pushSingle('INSURANCE_POLICY', docs.sigorta);

    if (docs.ruhsat?.length) {
      docs.ruhsat.forEach(file => payload.push({ type: 'VEHICLE_LICENSE', file }));
    }

    return payload;
  };

  const save = async () => {
    const uploads = buildUploadQueue();
    if (!uploads.length) {
      toast.error('Lütfen en az bir belge seçin.');
      return;
    }

    try {
      let allRequiredHaveDoc = false;

      for (const upload of uploads) {
        const formData = new FormData();
        formData.append('type', upload.type);
        formData.append('file', upload.file);

        const res = await apiClient(`${API_BASE}/carriers/me/documents`, {
          method: 'PUT',
          body: formData,
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Belge kaydı başarısız');
        }

        allRequiredHaveDoc = Boolean(json?.allRequiredHaveDoc);
      }

      toast.success(allRequiredHaveDoc ? 'Tüm belgeler kaydedildi.' : 'Belgeler taslak olarak kaydedildi.');
      setDocs({ kYetki: [], src: [], ruhsat: [], vergi: [], sigorta: [] });
      await fetchDocuments();
      await refreshProfileStatus?.();
    } catch (error: any) {
      toast.error(error?.message || 'Belgeler kaydedilemedi.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">Belgeler</h2>
      <p className="text-sm text-slate-500 mt-1">PDF, JPG veya PNG formatında yükleyin. Admin tarafından doğrulanacaktır.</p>
      <div className="h-px bg-slate-100 mt-4 mb-6" />
            <div className="space-y-6">
        {backendDocs.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Mevcut Belgeler</h3>
            {backendDocs.map((doc, idx) => (
              <div key={doc.id || `${doc.type}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {doc.type === 'AUTHORIZATION_CERT' ? 'K Yetki Belgesi (K1/K2)' : 
                       doc.type === 'SRC_CERT' ? 'SRC Belgesi' : 
                       doc.type === 'VEHICLE_LICENSE' ? 'Araç Ruhsatı' : 
                       doc.type === 'TAX_PLATE' ? 'Vergi Levhası' : 
                       doc.type === 'INSURANCE_POLICY' ? 'Sigorta Poliçesi' : doc.type}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
                      {String(doc.status || '').toLowerCase()} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('tr-TR') : 'Tarih yok'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {doc.status === 'APPROVED' ? 'Onaylandı' : 
                     doc.status === 'PENDING' ? 'Beklemede' : 'Reddedildi'}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => openDocument(doc, false)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Görüntüle
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openDocument(doc, true)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> İndir
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteDocument(doc)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!backendDocs.some(d => d.type === 'AUTHORIZATION_CERT') && (
            <FileUpload label="K Yetki Belgesi (K1/K2)" required onUpload={(files) => setDocs(prev => ({ ...prev, kYetki: files }))} uploadedFiles={docs.kYetki} />
          )}
          {!backendDocs.some(d => d.type === 'SRC_CERT') && (
            <FileUpload label="SRC Belgesi" required onUpload={(files) => setDocs(prev => ({ ...prev, src: files }))} uploadedFiles={docs.src} />
          )}
          {!backendDocs.some(d => d.type === 'VEHICLE_LICENSE') && (
            <FileUpload label="Araç Ruhsatı (en az 1)" required onUpload={(files) => setDocs(prev => ({ ...prev, ruhsat: files }))} uploadedFiles={docs.ruhsat} multiple />
          )}
          {!backendDocs.some(d => d.type === 'TAX_PLATE') && (
            <FileUpload label="Vergi Levhası" required onUpload={(files) => setDocs(prev => ({ ...prev, vergi: files }))} uploadedFiles={docs.vergi} />
          )}
          {!backendDocs.some(d => d.type === 'INSURANCE_POLICY') && (
            <FileUpload label="Sigorta Poliçesi (opsiyonel)" onUpload={(files) => setDocs(prev => ({ ...prev, sigorta: files }))} uploadedFiles={docs.sigorta} />
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={save} className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Save className="h-4 w-4 mr-2" />Taslağı Kaydet</Button>
      </div>
    </div>
  );
}
