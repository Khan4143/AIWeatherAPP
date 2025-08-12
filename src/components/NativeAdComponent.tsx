import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdEventType,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.NATIVE : 'ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy';

const NativeAdComponent = () => {
  const [nativeAd, setNativeAd] = useState<NativeAd>();

  useEffect(() => {
    NativeAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then(ad => {
        setNativeAd(ad);
      })
      .catch((error: Error) => {
        console.error('Failed to load native ad', error);
      });
  }, []);

  useEffect(() => {
    if (!nativeAd) {
      return;
    }

    const adListener = nativeAd.addAdEventListener(NativeAdEventType.IMPRESSION, () => {
      console.log('Native ad impression');
    });

    return () => {
      adListener?.remove();
      nativeAd.destroy();
    };
  }, [nativeAd]);

  if (!nativeAd) {
    return null;
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.adContainer}>
      <View style={styles.adContent}>
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.textContainer}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {nativeAd.advertiser && (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          )}
        </View>
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.callToActionContainer}>
            <Text style={styles.callToActionText}>{nativeAd.callToAction}</Text>
          </View>
        </NativeAsset>
        <Text style={styles.adBadge}>AD</Text>
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  adContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  advertiser: {
    fontSize: 11,
    color: '#888888',
  },
  adBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#FFCC00',
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 4,
  },
  callToActionContainer: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callToActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default NativeAdComponent;
