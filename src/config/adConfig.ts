export const AD_CONFIG = {
  USE_REAL_ADS_IN_DEBUG: false,
  
  NATIVE_AD_UNIT_ID: 'ca-app-pub-1643025320304360/3508132956',
  
  TEST_NATIVE_AD_UNIT_ID: 'ca-app-pub-3940256099942544/2247696110',
};

export const getAdUnitId = (isDev: boolean) => {
  if (isDev && !AD_CONFIG.USE_REAL_ADS_IN_DEBUG) {
    return AD_CONFIG.TEST_NATIVE_AD_UNIT_ID;
  }
  return AD_CONFIG.NATIVE_AD_UNIT_ID;
};

export const isUsingRealAds = (isDev: boolean) => {
  return !isDev || AD_CONFIG.USE_REAL_ADS_IN_DEBUG;
};
