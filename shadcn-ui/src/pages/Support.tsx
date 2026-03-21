import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageCircle, HelpCircle } from 'lucide-react';

export default function Support() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Destek Merkezi</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900"><HelpCircle className="h-5 w-5 text-blue-600" /> Sıkça Sorulan Sorular</CardTitle>
          <CardDescription>En çok merak edilen konular</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="a1">
              <AccordionTrigger>Ödeme nasıl korunuyor?</AccordionTrigger>
              <AccordionContent>
                Ödemeler korumalı hesapta tutulur, teslimattan sonra nakliyeciye aktarılır.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="a2">
              <AccordionTrigger>İptal politikası nedir?</AccordionTrigger>
              <AccordionContent>
                Taşıma tarihinden 24 saat öncesine kadar ücretsiz iptal.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900"><MessageCircle className="h-5 w-5 text-green-600" /> Canlı Destek</CardTitle>
          <CardDescription>Hafta içi 09:00-22:00 arası</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-gray-600 text-sm">Yakında: canlı chat widget</div>
        </CardContent>
      </Card>
    </div>
  );
}
