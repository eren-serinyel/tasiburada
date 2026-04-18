import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/apiClient';
import { Save, FileText } from 'lucide-react';
import FileUpload from '@/components/ui/file-upload';
import { useEffect } from 'react';
import type { SectionProps } from './types';
import { API_BASE } from './helpers';

export default function DocumentSection({ user, refreshProfileStatus }: SectionProps) {
  const [docs, setDocs] = useState({
    kYetki: [] as File[], src: [] as File[], ruhsat: [] as File[], vergi: [] as File[], sigorta: [] as File[],
  });
  const [backendDocs, setBackendDocs] = useState<any[]>([]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/carriers/me/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const json = await response.json();
        setBackendDocs(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

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
      await fetchDocuments();
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
            <div className="space-y-6">
        {backendDocs.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Mevcut Belgeler</h3>
            {backendDocs.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
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
                      {doc.status.toLowerCase()} • {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                    doc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {doc.status === 'APPROVED' ? 'Onaylandı' : 
                     doc.status === 'PENDING' ? 'Beklemede' : 'Reddedildi'}
                  </span>
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
