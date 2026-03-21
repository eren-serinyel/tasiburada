import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Gift, Sparkles } from 'lucide-react';

export default function Campaigns() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kampanyalar</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900"><Ticket className="h-5 w-5 text-purple-600" /> İndirim Kodları</CardTitle>
            <CardDescription>Geçerli kuponları ekleyin ve indirim kazanın</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">Örnek: TASIN10 (ilk 3 taşımada %10)</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900"><Gift className="h-5 w-5 text-amber-500" /> Promosyonlar</CardTitle>
            <CardDescription>Sezonluk kampanyalar ve özel fırsatlar</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Yeni: Sonbahar Fırsatları</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
