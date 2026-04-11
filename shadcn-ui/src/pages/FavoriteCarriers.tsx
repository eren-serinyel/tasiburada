import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import CarrierCard from '@/components/carriers/CarrierCard';
import { Heart, Loader2 } from 'lucide-react';

interface FavoriteCarrierItem {
  id: string;
  carrierId: string;
  createdAt: string;
  carrier: {
    id: string;
    companyName: string;
    city: string | null;
    rating: number;
    reviewCount: number;
    vehicleSummary: string | null;
    serviceAreas: string[];
    startingPrice: number | null;
    experienceYears: number | null;
    profileCompletion: number | null;
    pictureUrl: string | null;
  };
}

export default function FavoriteCarriers() {
  const [favorites, setFavorites] = useState<FavoriteCarrierItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/customers/me/favorites');
      const json = await res.json();
      if (json.success) {
        setFavorites(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-7 w-7 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-slate-900">Kayıtlı Firmalarım</h1>
        <span className="text-sm text-slate-500">({favorites.length})</span>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Henüz favori nakliyeciniz yok</h2>
          <p className="text-slate-500">Nakliyeci listesinden beğendiğiniz firmaları favorilere ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map(fav => (
            <CarrierCard
              key={fav.id}
              carrier={{
                id: fav.carrier.id,
                companyName: fav.carrier.companyName,
                city: fav.carrier.city,
                rating: fav.carrier.rating ?? 0,
                reviewCount: fav.carrier.reviewCount ?? 0,
                vehicleSummary: fav.carrier.vehicleSummary,
                serviceAreas: fav.carrier.serviceAreas ?? [],
                startingPrice: fav.carrier.startingPrice,
                experienceYears: fav.carrier.experienceYears,
                profileCompletion: fav.carrier.profileCompletion,
                pictureUrl: fav.carrier.pictureUrl
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
