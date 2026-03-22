import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, ArrowRight, ShieldCheck, IdCard, Rocket, Brain } from 'lucide-react';
import { getSessionUser } from '@/lib/storage';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (u) {
      navigate('/teklif-talebi');
      return;
    }
    navigate('/', { state: { scrollTo: 'quick-form' } });
  };

  const handleCarrierInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/nakliyeci-bilgi');
  };

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const u = getSessionUser() || (localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser') as string) : null);
    if (u) {
      navigate('/yardim');
      return;
    }

    const scrollToHelp = () => {
      try {
        const target = document.getElementById('yardim') || document.getElementById('yardim-sss');
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      } catch {}
    };

    // Anasayfadaysa sadece kaydır
    if (location.pathname === '/') {
      scrollToHelp();
      return;
    }

    // Değilse önce anasayfaya git, state ile bilgi ver ve kısa bir gecikmeden sonra kaydır
    navigate('/', {
      state: {
        scrollTo: 'yardim',
        toast: {
          title: 'Yardım alanına yönlendirildiniz',
          description: 'Daha fazla yardım için giriş yapabilirsiniz.',
        },
      },
    });
    setTimeout(scrollToHelp, 300);
  };


  return (
    <footer className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white relative overflow-hidden">
      {/* Modal kaldırıldı: Nakliyeciler listesi herkese açık. */}
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-600/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Company Info & Info Cards */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Taşıburada
              </span>
            </div>
            
            <p className="text-gray-300 text-lg leading-relaxed max-w-md mt-6">
              Türkiye'nin en güvenilir nakliye platformu. Nakliyeci ile müşteri arasındaki köprü, dijital çözümlerle güvenli taşımacılık.
            </p>
            
            {/* Info Cards (replacing numeric stats) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
              <div className="group flex items-center space-x-3 bg-gray-800/40 rounded-2xl p-4 backdrop-blur-md border border-gray-700/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 transform hover:scale-[1.03]">
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Güvenli İşlem Altyapısı</h4>
                  <p className="text-gray-400 text-sm font-normal">SSL şifreleme ve doğrulanmış ödeme sistemiyle koruma altında</p>
                </div>
              </div>
              <div className="group flex items-center space-x-3 bg-gray-800/40 rounded-2xl p-4 backdrop-blur-md border border-gray-700/40 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 transform hover:scale-[1.03]">
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <IdCard className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Kimliği Doğrulanmış Nakliyeciler</h4>
                  <p className="text-gray-400 text-sm font-normal">Tüm nakliyeciler resmi belgelerle kayıtlı ve onaylı</p>
                </div>
              </div>
              <div className="group flex items-center space-x-3 bg-gray-800/40 rounded-2xl p-4 backdrop-blur-md border border-gray-700/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:scale-[1.03]">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <Rocket className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Yükselen Dijital Nakliye Platformu</h4>
                  <p className="text-gray-400 text-sm font-normal">Modern altyapı ve kullanıcı odaklı tasarımla geliştirildi</p>
                </div>
              </div>
              <div className="group flex items-center space-x-3 bg-gray-800/40 rounded-2xl p-4 backdrop-blur-md border border-gray-700/40 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 transform hover:scale-[1.03]">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Brain className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Akıllı Eşleştirme Teknolojisi</h4>
                  <p className="text-gray-400 text-sm font-normal">Yapay zeka destekli sistem en uygun nakliyeciyi saniyeler içinde bulur</p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="pt-8">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-white">Bizi Takip Edin</h4>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent mx-4"></div>
              </div>
              <div className="flex space-x-3">
                <a href="https://facebook.com/tasiburada" target="_blank" rel="noopener noreferrer" 
                   className="group relative p-3 bg-gray-800/50 hover:bg-blue-600 rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50 hover:border-blue-500/50">
                  <Facebook className="h-5 w-5 group-hover:text-white transition-colors" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Facebook
                  </div>
                </a>
                <a href="https://twitter.com/tasiburada" target="_blank" rel="noopener noreferrer" 
                   className="group relative p-3 bg-gray-800/50 hover:bg-sky-500 rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50 hover:border-sky-500/50">
                  <Twitter className="h-5 w-5 group-hover:text-white transition-colors" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Twitter
                  </div>
                </a>
                <a href="https://instagram.com/tasiburada" target="_blank" rel="noopener noreferrer" 
                   className="group relative p-3 bg-gray-800/50 hover:bg-pink-600 rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50 hover:border-pink-500/50">
                  <Instagram className="h-5 w-5 group-hover:text-white transition-colors" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Instagram
                  </div>
                </a>
                <a href="https://linkedin.com/company/tasiburada" target="_blank" rel="noopener noreferrer" 
                   className="group relative p-3 bg-gray-800/50 hover:bg-blue-700 rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50 hover:border-blue-500/50">
                  <Linkedin className="h-5 w-5 group-hover:text-white transition-colors" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    LinkedIn
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links + Contact stacked on right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Hızlı Erişim</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" onClick={handleCreateClick} className="text-gray-300 hover:text-blue-400 flex items-center group transition-all duration-300">
                  <ArrowRight className="h-4 w-4 mr-2 transform group-hover:translate-x-1 transition-transform" />
                  Taşıma Talebi Oluştur
                </a>
              </li>
              <li>
                <a href="#" onClick={handleCarrierInfoClick} className="text-gray-300 hover:text-blue-400 flex items-center group transition-all duration-300">
                  <ArrowRight className="h-4 w-4 mr-2 transform group-hover:translate-x-1 transition-transform" />
                  Nakliyeci Ol
                </a>
              </li>
              <li>
                <Link to="/nakliyeciler" className="text-gray-300 hover:text-blue-400 flex items-center group transition-all duration-300">
                  <ArrowRight className="h-4 w-4 mr-2 transform group-hover:translate-x-1 transition-transform" />
                  Nakliyeciler
                </Link>
              </li>
              <li>
                <Link to="/fiyatlandirma" className="text-gray-300 hover:text-blue-400 flex items-center group transition-all duration-300">
                  <ArrowRight className="h-4 w-4 mr-2 transform group-hover:translate-x-1 transition-transform" />
                  Fiyatlandırma
                </Link>
              </li>
            </ul>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">İletişim</h3>
              <ul className="space-y-4">
              <li className="flex items-center space-x-3 text-gray-300">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">E-posta</p>
                  <a href="mailto:info@tasiburada.com" className="text-white hover:underline">info@tasiburada.com</a>
                </div>
              </li>
              <li className="flex items-center space-x-3 text-gray-300">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <Phone className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Telefon</p>
                  <a href="tel:+905551234567" className="text-white hover:underline">+90 555 123 45 67</a>
                </div>
              </li>
              <li className="flex items-center space-x-3 text-gray-300">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <MapPin className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Adres</p>
                  <p className="text-white">İstanbul, Türkiye</p>
                </div>
              </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-gray-400 text-sm">
              © 2025 Taşıburada.com. Tüm hakları saklıdır.
            </p>
            <div className="flex flex-wrap gap-6">
                <Link to="/gizlilik-politikasi" className="text-gray-400 hover:text-white text-sm transition-colors">
                Gizlilik Politikası
              </Link>
                <Link to="/kullanim-sartlari" className="text-gray-400 hover:text-white text-sm transition-colors">
                Kullanım Şartları
              </Link>
                <Link to="/cerez-politikasi" className="text-gray-400 hover:text-white text-sm transition-colors">
                Çerez Politikası
              </Link>
                <button onClick={handleHelpClick} className="text-gray-400 hover:text-white text-sm transition-colors">
                  Yardım
                </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}