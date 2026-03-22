import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, FileText, Truck, IdCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CarrierInfo() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-md shadow-sm hover:bg-blue-100 transition-colors">Bilgilendirme</span>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">Nakliyeci Olmadan Önce Bilmeniz Gerekenler</h1>
        </div>
        <p className="mt-3 text-gray-600">Başvuru öncesi gerekli belgeler ve temel gereksinimler aşağıdadır.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600"/> Resmi Belgeler</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            K belgesi, SRC, ehliyet ve ruhsat gibi belgelerin güncel olması gerekir.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600"/> Sigorta</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            Zorunlu trafik ve taşımacılık sigortaları tavsiye edilir.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-sky-600"/> Araç Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            Araç tipiniz, kapasite ve bakım durumunun güncel olması beklenir.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><IdCard className="h-5 w-5 text-indigo-600"/> Kimlik Doğrulama</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            Kimlik ve iletişim bilgileri doğru ve doğrulanabilir olmalıdır.
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={() => navigate('/nakliyeci-kayit')} className="bg-sky-600 hover:bg-sky-700">Nakliyeci olarak kayıt olmak istiyorum</Button>
      </div>
    </div>
  );
}
