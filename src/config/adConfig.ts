export const AD_CONFIG = {
  USE_REAL_ADS_IN_DEBUG: false,
  
  // Google-provided native advanced test unit; never use a production ID in source.
  NATIVE_AD_UNIT_ID: 'ca-app-pub-3940256099942544/2247696110',
  
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
