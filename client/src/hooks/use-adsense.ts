import { useEffect, useRef } from 'react';

export const useAdSense = (adSlot: string) => {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const loadAd = () => {
      try {
        if ((window as any).adsbygoogle && adRef.current) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch (error) {
        console.error('AdSense error:', error);
      }
    };

    // Load ad after a short delay to ensure AdSense script is loaded
    const timer = setTimeout(loadAd, 100);
    return () => clearTimeout(timer);
  }, [adSlot]);

  return adRef;
};

// Utility function to check if AdSense is loaded
export const isAdSenseLoaded = (): boolean => {
  return !!(window as any).adsbygoogle;
};

// Utility function to reload ads
export const reloadAds = (): void => {
  try {
    if ((window as any).adsbygoogle) {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    }
  } catch (error) {
    console.error('Error reloading ads:', error);
  }
}; 