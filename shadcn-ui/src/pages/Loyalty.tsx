import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles } from 'lucide-react';

export default function Loyalty() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sadakat & Premium</h1>
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900"><Crown className="h-5 w-5 text-purple-600" /> Program Detayları</CardTitle>
          <CardDescription>3 taşıma sonrası %10 indirim, Premium için ek avantajlar</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>%10 indirim kuponu otomatik tanımlanır</li>
            <li>Öncelikli destek ve hızlı eşleşme</li>
            <li>Sigortalı taşıma indirimi</li>
          </ul>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-gray-900">Durumunuz</CardTitle>
          <CardDescription>Örnek durum göstergesi</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1"><Sparkles className="h-3 w-3" /> 2/3 taşıma • Bronze</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
