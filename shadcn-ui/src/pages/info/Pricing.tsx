import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function Pricing() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Fiyatlandırma</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-gray-900">Taşıma Ücreti Nasıl Hesaplanır?</CardTitle>
          <CardDescription>
            Ücretler; mesafe, eşya hacmi/ağırlığı ve seçilen ek hizmetlere göre değişir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Mesafe:</span> Kilometre bazlı çarpan uygulanır. Şehir içi sabit başlangıç ücreti + km başına ücret.
            </li>
            <li>
              <span className="font-medium">Eşya Hacmi/Ağırlığı:</span> Seçilecek araç tipine göre (panelvan, kamyonet, kamyon) kapasite katsayısı uygulanır.
            </li>
            <li>
              <span className="font-medium">Ek Hizmetler:</span> Sigorta, profesyonel paketleme, kat hizmeti, montaj/demontaj gibi opsiyonlar toplam ücrete eklenir.
            </li>
            <li>
              <span className="font-medium">Yoğunluk ve Tarih:</span> Hafta sonu/özel günler veya yoğun saatlerde dinamik fiyatlama etkisi olabilir.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Örnek Başlangıç Fiyatları</CardTitle>
          <CardDescription>Gerçek fiyatlar talebinizin detaylarına göre değişebilir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hizmet</TableHead>
                <TableHead>Detay</TableHead>
                <TableHead className="text-right">Başlangıç</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">İstanbul içi küçük taşıma</TableCell>
                <TableCell>
                  0-10 km, az eşya, <Badge variant="secondary">panelvan</Badge>
                </TableCell>
                <TableCell className="text-right">1.500 TL+</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Şehir içi orta ölçekli</TableCell>
                <TableCell>
                  10-30 km, 2+ oda, <Badge variant="secondary">kamyonet</Badge>
                </TableCell>
                <TableCell className="text-right">2.500 TL+</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Şehirlerarası</TableCell>
                <TableCell>
                  200-500 km arası, <Badge variant="secondary">kamyon</Badge>
                </TableCell>
                <TableCell className="text-right">4.000 TL+ (ortalama)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Ek hizmetler</TableCell>
                <TableCell>
                  Sigorta, paketleme, kat hizmeti, montaj/demontaj
                </TableCell>
                <TableCell className="text-right">+250 TL’den itibaren</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-gray-500 mt-4">Not: Bu rakamlar örnek amaçlıdır. En doğru fiyatı almak için talep oluşturun ve teklifleri karşılaştırın.</p>
        </CardContent>
      </Card>
    </section>
  );
}
