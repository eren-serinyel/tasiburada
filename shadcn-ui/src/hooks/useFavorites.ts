import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';

export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isCustomer = isAuthenticated && user?.type === 'customer';

  const fetchFavoriteIds = useCallback(async () => {
    if (!isCustomer) return;
    try {
      setLoading(true);
      const res = await apiClient('/customers/me/favorites/ids');
      const json = await res.json();
      if (json.success) {
        setFavoriteIds(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    fetchFavoriteIds();
  }, [fetchFavoriteIds]);

  const toggleFavorite = useCallback(async (carrierId: string) => {
    if (!isCustomer) return;
    try {
      const res = await apiClient(`/customers/me/favorites/${carrierId}`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        setFavoriteIds(prev =>
          json.data.added
            ? [...prev, carrierId]
            : prev.filter(id => id !== carrierId)
        );
        return json.data.added;
      }
    } catch {
      // silent
    }
    return null;
  }, [isCustomer]);

  const isFavorite = useCallback(
    (carrierId: string) => favoriteIds.includes(carrierId),
    [favoriteIds]
  );

  return { favoriteIds, loading, isFavorite, toggleFavorite, refetch: fetchFavoriteIds, isCustomer };
}
