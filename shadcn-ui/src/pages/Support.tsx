import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, MessageSquare,
  Phone, Mail, FileText, Shield,
  CreditCard, Truck, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    category: 'Taşıma Talebi',
    icon: Truck,
    questions: [
      {
        q: 'Taşıma talebi nasıl oluşturulur?',
        a: 'Ana sayfadan "Yeni Taşıma Talebi Oluştur" butonuna tıklayın. Çıkış ve varış adresini, taşıma tarihini ve yük bilgilerini girin. Talebiniz nakliyecilere iletilir ve teklif almaya başlarsınız.',
      },
      {
        q: 'Talebi iptal edebilir miyim?',
        a: 'Nakliyeci seçilmeden önce talebinizi istediğiniz zaman iptal edebilirsiniz. İlan detay sayfasından "İlanı İptal Et" butonunu kullanabilirsiniz.',
      },
      {
        q: 'Kaç teklif alabilirim?',
        a: 'Talebinize birden fazla nakliyeci teklif verebilir. Teklifleri fiyat, puan ve tahmini süreye göre karşılaştırabilirsiniz.',
      },
    ],
  },
  {
    category: 'Teklif ve Nakliyeci Seçimi',
    icon: MessageSquare,
    questions: [
      {
        q: 'Teklifi nasıl kabul ederim?',
        a: '"Tekliflerim" sayfasından gelen teklifleri görebilirsiniz. İstediğiniz teklifi inceleyip "Kabul Et" butonuna tıklayın.',
      },
      {
        q: 'Nakliyeci seçtikten sonra değiştirebilir miyim?',
        a: 'Nakliyeci seçimi onaylandıktan sonra değişiklik yapılamamaktadır. Sorun yaşarsanız destek ekibimizle iletişime geçin.',
      },
      {
        q: 'Nakliyecilerle nasıl iletişim kurabilirim?',
        a: 'Teklif kabul edildikten sonra platform içi mesajlaşma özelliğini kullanarak nakliyeciyle iletişime geçebilirsiniz.',
      },
    ],
  },
  {
    category: 'Ödeme',
    icon: CreditCard,
    questions: [
      {
        q: 'Ödeme nasıl yapılır?',
        a: 'Platform üzerinden güvenli ödeme yapabilirsiniz. Taşıma tamamlandıktan sonra ödeme nakliyeciye aktarılır.',
      },
      {
        q: 'İptal durumunda para iadesi alabilir miyim?',
        a: 'İptal politikamıza göre, taşımadan 24 saat önce yapılan iptallerde tam iade yapılmaktadır. Destek ekibimizle iletişime geçin.',
      },
    ],
  },
  {
    category: 'Güvenlik ve Sigorta',
    icon: Shield,
    questions: [
      {
        q: 'Eşyalarım sigortalı mı?',
        a: 'Talep oluştururken sigorta seçeneği ekleyebilirsiniz. Sigortalı taşımalarda hasar durumunda tazminat talep edebilirsiniz.',
      },
      {
        q: 'Nakliyeciler doğrulanmış mı?',
        a: 'Platformdaki tüm nakliyeciler admin onayından geçmektedir. K Belgesi, SRC belgesi ve diğer evraklar kontrol edilmektedir.',
      },
    ],
  },
  {
    category: 'Hesap',
    icon: Clock,
    questions: [
      {
        q: 'Şifremi unuttum, ne yapmalıyım?',
        a: 'Giriş sayfasındaki "Şifremi Unuttum" linkine tıklayın. E-posta adresinize şifre sıfırlama linki gönderilecektir.',
      },
      {
        q: 'Hesabımı nasıl silebilirim?',
        a: 'Hesap silme işlemi için destek ekibimizle iletişime geçmeniz gerekmektedir.',
      },
    ],
  },
];

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between
                   py-4 text-left hover:text-primary
                   transition-colors"
      >
        <span className="text-sm font-medium pr-4">
          {question}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 flex-shrink-0
                                  text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0
                                    text-muted-foreground" />
        }
      </button>
      {open && (
        <p className="text-sm text-muted-foreground pb-4 pr-8">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function Support() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] =
    useState(FAQ_ITEMS[0].category);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">

      {/* Başlık */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold">
          Nasıl Yardımcı Olabiliriz?
        </h1>
        <p className="text-muted-foreground mt-2">
          Sık sorulan sorular veya destek ekibimizle
          iletişime geçin
        </p>
      </div>

      {/* İletişim kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: MessageSquare,
            title: 'Platform İçi Mesaj',
            description: 'Aktif taşımanız için nakliyeciyle mesajlaşın',
            action: 'Mesajlara Git',
            href: '/mesajlar',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            icon: Mail,
            title: 'E-posta Desteği',
            description: 'destek@tasiburada.com',
            action: 'E-posta Gönder',
            href: 'mailto:destek@tasiburada.com',
            color: 'text-green-600',
            bg: 'bg-green-50',
            external: true,
          },
          {
            icon: FileText,
            title: 'Nasıl Çalışır?',
            description: 'Platform kullanım rehberi',
            action: 'Rehberi İncele',
            href: '/nasil-calisir',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map(({
          icon: Icon, title, description,
          action, href, color, bg, external
        }) => (
          <div key={title}
               className="border rounded-xl p-4 bg-card
                          hover:shadow-sm transition-all">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center',
              'justify-center mb-3', bg
            )}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {description}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => external
                ? window.open(href, '_blank')
                : navigate(href)
              }
            >
              {action}
            </Button>
          </div>
        ))}
      </div>

      {/* SSS */}
      <div className="border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold">Sık Sorulan Sorular</h2>
        </div>

        <div className="md:flex">
          {/* Kategori sidebar */}
          <div className="md:w-48 border-b md:border-b-0
                          md:border-r p-2">
            {FAQ_ITEMS.map(({ category, icon: Icon }) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2',
                  'rounded-lg text-sm text-left transition-colors',
                  activeCategory === category
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {category}
              </button>
            ))}
          </div>

          {/* Sorular */}
          <div className="flex-1 p-4">
            {FAQ_ITEMS.find(
              f => f.category === activeCategory
            )?.questions.map((item) => (
              <FAQItem
                key={item.q}
                question={item.q}
                answer={item.a}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
