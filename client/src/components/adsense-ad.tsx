import { useAdSense } from '@/hooks/use-adsense';
import { ADSENSE_CONFIG, getAdSlot, getAdFormat } from '@/config/adsense';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'banner' | 'leaderboard' | 'skyscraper';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

export const AdSenseAd: React.FC<AdSenseAdProps> = ({
  adSlot,
  adFormat = 'auto',
  style,
  className = '',
  responsive = true
}) => {
  const adRef = useAdSense(adSlot);

  const getAdStyle = () => {
    const baseStyle: React.CSSProperties = {
      display: 'block',
      textAlign: 'center',
      overflow: 'hidden',
      ...style
    };

    if (responsive) {
      baseStyle.minHeight = '280px';
    }

    return baseStyle;
  };

  return (
    <div className={`adsense-container ${className}`} style={getAdStyle()}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CONFIG.PUBLISHER_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive}
      />
    </div>
  );
};

// Specific ad components for common placements
export const HeaderAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('HEADER')}
    adFormat={getAdFormat('HEADER')}
    className="w-full max-w-6xl mx-auto mb-4"
    style={{ minHeight: '90px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.HEADER}
  />
);

export const SidebarAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('SIDEBAR')}
    adFormat={getAdFormat('SIDEBAR')}
    className="w-full mb-4"
    style={{ minHeight: '250px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.SIDEBAR}
  />
);

export const InContentAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('IN_CONTENT')}
    adFormat={getAdFormat('IN_CONTENT')}
    className="w-full my-8 text-center"
    style={{ minHeight: '280px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.IN_CONTENT}
  />
);

export const FooterAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('FOOTER')}
    adFormat={getAdFormat('FOOTER')}
    className="w-full max-w-6xl mx-auto mt-8"
    style={{ minHeight: '90px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.FOOTER}
  />
);

export const MobileAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('MOBILE')}
    adFormat={getAdFormat('MOBILE')}
    className="w-full mb-4"
    style={{ minHeight: '100px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.MOBILE}
  />
);

export const ChapterTopAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('CHAPTER_TOP')}
    adFormat={getAdFormat('CHAPTER_TOP')}
    className="w-full mb-6 text-center"
    style={{ minHeight: '280px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.CHAPTER_TOP}
  />
);

export const ChapterBottomAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('CHAPTER_BOTTOM')}
    adFormat={getAdFormat('CHAPTER_BOTTOM')}
    className="w-full mt-6 text-center"
    style={{ minHeight: '280px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.CHAPTER_BOTTOM}
  />
);

export const NovelDetailAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('NOVEL_DETAIL')}
    adFormat={getAdFormat('NOVEL_DETAIL')}
    className="w-full mb-4"
    style={{ minHeight: '250px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.NOVEL_DETAIL}
  />
);

export const SearchResultsAd: React.FC = () => (
  <AdSenseAd
    adSlot={getAdSlot('SEARCH_RESULTS')}
    adFormat={getAdFormat('SEARCH_RESULTS')}
    className="w-full my-6 text-center"
    style={{ minHeight: '280px' }}
    responsive={ADSENSE_CONFIG.RESPONSIVE.SEARCH_RESULTS}
  />
); 