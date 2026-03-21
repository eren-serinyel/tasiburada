import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Debug() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Load data from localStorage
    const loadData = () => {
      const storedCustomers = localStorage.getItem('mockCustomers');
      const storedCarriers = localStorage.getItem('mockCarriers');
  const currentUserData = localStorage.getItem('currentUser') || localStorage.getItem('currentUser_expiresAt') && localStorage.getItem('currentUser');

      if (storedCustomers) {
        setCustomers(JSON.parse(storedCustomers));
      }
      
      if (storedCarriers) {
        setCarriers(JSON.parse(storedCarriers));
      }

      if (currentUserData) {
        setCurrentUser(JSON.parse(currentUserData));
      }
    };

    loadData();
  }, []);

  const clearData = () => {
    localStorage.removeItem('mockCustomers');
    localStorage.removeItem('mockCarriers');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUser_expiresAt');
    setCustomers([]);
    setCarriers([]);
    setCurrentUser(null);
    alert('Tüm veriler temizlendi!');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debug - Kayıtlı Kullanıcılar</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              const data = {
                customers: localStorage.getItem('mockCustomers'),
                carriers: localStorage.getItem('mockCarriers'),
                currentUser: localStorage.getItem('currentUser')
              };
              navigator.clipboard.writeText(JSON.stringify(data));
              alert('Veriler panoya kopyalandı! Başka tarayıcıda Import yapabilirsiniz.');
            }}
            variant="outline"
          >
            📋 Export (Kopyala)
          </Button>
          
          <Button 
            onClick={() => {
              const imported = prompt('Export edilmiş veriyi yapıştırın:');
              if (imported) {
                try {
                  const data = JSON.parse(imported);
                  if (data.customers) localStorage.setItem('mockCustomers', data.customers);
                  if (data.carriers) localStorage.setItem('mockCarriers', data.carriers);
                  if (data.currentUser) localStorage.setItem('currentUser', data.currentUser);
                  window.location.reload();
                } catch (e) {
                  alert('Geçersiz veri formatı!');
                }
              }
            }}
            variant="outline"
          >
            📥 Import (Yapıştır)
          </Button>
          
          <Button onClick={clearData} variant="destructive">
            🗑️ Tümünü Temizle
          </Button>
        </div>
      </div>

      {/* Current User */}
      <Card>
        <CardHeader>
          <CardTitle>Aktif Kullanıcı</CardTitle>
        </CardHeader>
        <CardContent>
          {currentUser ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> {currentUser.id}</p>
              <p><strong>Ad Soyad:</strong> {currentUser.name} {currentUser.surname}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Telefon:</strong> {currentUser.phone}</p>
              <p><strong>Şehir:</strong> {currentUser.city}</p>
              <p><strong>Tip:</strong> {currentUser.type}</p>
              <p><strong>Kayıt Tarihi:</strong> {new Date(currentUser.createdAt).toLocaleString('tr-TR')}</p>
            </div>
          ) : (
            <p className="text-gray-500">Aktif kullanıcı yok</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı Müşteriler ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length > 0 ? (
            <div className="space-y-4">
              {customers.map((customer, index) => (
                <div key={customer.id} className="border p-4 rounded-lg">
                  <p><strong>#{index + 1}</strong></p>
                  <p><strong>ID:</strong> {customer.id}</p>
                  <p><strong>Ad Soyad:</strong> {customer.name} {customer.surname}</p>
                  <p><strong>Email:</strong> {customer.email}</p>
                  <p><strong>Telefon:</strong> {customer.phone}</p>
                  <p><strong>Şehir:</strong> {customer.city}</p>
                  <p><strong>Şifre:</strong> {customer.password ? '•'.repeat(customer.password.length) : 'Belirtilmemiş'}</p>
                  <p><strong>Kayıt Tarihi:</strong> {new Date(customer.createdAt).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Henüz kayıtlı müşteri yok</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Carriers */}
      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı Nakliyeciler ({carriers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {carriers.length > 0 ? (
            <div className="space-y-4">
              {carriers.map((carrier, index) => (
                <div key={carrier.id} className="border p-4 rounded-lg">
                  <p><strong>#{index + 1}</strong></p>
                  <p><strong>ID:</strong> {carrier.id}</p>
                  <p><strong>Ad Soyad:</strong> {carrier.name} {carrier.surname}</p>
                  <p><strong>Email:</strong> {carrier.email}</p>
                  <p><strong>Telefon:</strong> {carrier.phone}</p>
                  <p><strong>Şehir:</strong> {carrier.city}</p>
                  <p><strong>Şifre:</strong> {carrier.password ? '•'.repeat(carrier.password.length) : 'Belirtilmemiş'}</p>
                  <p><strong>Araç Tipi:</strong> {carrier.vehicle?.type}</p>
                  <p><strong>Plaka:</strong> {carrier.vehicle?.licensePlate}</p>
                  <p><strong>Onaylanmış:</strong> {carrier.isApproved ? 'Evet' : 'Hayır'}</p>
                  <p><strong>Kayıt Tarihi:</strong> {new Date(carrier.createdAt).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Henüz kayıtlı nakliyeci yok</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}