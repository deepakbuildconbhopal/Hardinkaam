import React, { createContext, useContext, useState, useEffect } from 'react';

const FAVOURITES_STORAGE_KEY = 'hardinkaam_favourite_services_v1';

interface FavouritesContextType {
  favouriteServiceIds: string[];
  toggleFavouriteService: (serviceId: string) => void;
  isFavouriteService: (serviceId: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export const FavouritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favouriteServiceIds, setFavouriteServiceIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Favourites storage load notice:', e);
    }
    return ['srv_elec_fan', 'srv_ac_service', 'srv_plumb_tap'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(favouriteServiceIds));
    } catch (e) {
      console.warn('Favourites storage save notice:', e);
    }
  }, [favouriteServiceIds]);

  const toggleFavouriteService = (serviceId: string) => {
    setFavouriteServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const isFavouriteService = (serviceId: string) => {
    return favouriteServiceIds.includes(serviceId);
  };

  return (
    <FavouritesContext.Provider
      value={{
        favouriteServiceIds,
        toggleFavouriteService,
        isFavouriteService,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return context;
};
