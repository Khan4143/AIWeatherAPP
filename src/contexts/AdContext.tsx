// src/context/AdMobProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import mobileAds from 'react-native-google-mobile-ads';

type AdMobContextType = {
  initialized: boolean;
};

const AdMobContext = createContext<AdMobContextType>({ initialized: false });

export const useAdMob = () => useContext(AdMobContext);

export const AdMobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        console.log('✅ AdMob initialized globally');
        setInitialized(true);
      });
  }, []);

  return (
    <AdMobContext.Provider value={{ initialized }}>
      {children}
    </AdMobContext.Provider>
  );
};
