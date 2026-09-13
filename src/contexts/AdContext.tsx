import React, { createContext, useContext, useEffect, useState } from 'react';
import mobileAds from 'react-native-google-mobile-ads';
import {DEMO_MODE} from '../config/appConfig';

type AdMobContextType = {
  initialized: boolean;
};

const AdMobContext = createContext<AdMobContextType>({ initialized: false });

export const useAdMob = () => useContext(AdMobContext);

export const AdMobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setInitialized(true);
      return;
    }

    mobileAds()
      .initialize()
      .then(() => {
        setInitialized(true);
      });
  }, []);

  return (
    <AdMobContext.Provider value={{ initialized }}>
      {children}
    </AdMobContext.Provider>
  );
};
