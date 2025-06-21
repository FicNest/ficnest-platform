export const ADSENSE_CONFIG = {
  // Replace with your actual AdSense publisher ID
  PUBLISHER_ID: 'ca-pub-8683278633236041',
  
  // Ad slot IDs - replace with your actual ad slot IDs from AdSense
  AD_SLOTS: {
    HEADER: 'YOUR_HEADER_AD_SLOT',
    SIDEBAR: 'YOUR_SIDEBAR_AD_SLOT',
    IN_CONTENT: 'YOUR_IN_CONTENT_AD_SLOT',
    FOOTER: 'YOUR_FOOTER_AD_SLOT',
    MOBILE: 'YOUR_MOBILE_AD_SLOT',
    CHAPTER_TOP: 'YOUR_CHAPTER_TOP_AD_SLOT',
    CHAPTER_BOTTOM: 'YOUR_CHAPTER_BOTTOM_AD_SLOT',
    NOVEL_DETAIL: 'YOUR_NOVEL_DETAIL_AD_SLOT',
    SEARCH_RESULTS: 'YOUR_SEARCH_RESULTS_AD_SLOT',
  },
  
  // Ad formats and styles
  AD_FORMATS: {
    HEADER: 'banner' as const,
    SIDEBAR: 'rectangle' as const,
    IN_CONTENT: 'auto' as const,
    FOOTER: 'leaderboard' as const,
    MOBILE: 'banner' as const,
    CHAPTER_TOP: 'auto' as const,
    CHAPTER_BOTTOM: 'auto' as const,
    NOVEL_DETAIL: 'rectangle' as const,
    SEARCH_RESULTS: 'auto' as const,
  },
  
  // Responsive settings
  RESPONSIVE: {
    HEADER: true,
    SIDEBAR: true,
    IN_CONTENT: true,
    FOOTER: true,
    MOBILE: true,
    CHAPTER_TOP: true,
    CHAPTER_BOTTOM: true,
    NOVEL_DETAIL: true,
    SEARCH_RESULTS: true,
  },
  
  // Ad placement settings
  PLACEMENT: {
    // Show ads on these pages
    ENABLED_PAGES: [
      '/',
      '/novels',
      '/search',
      '/browse',
      '/ranking',
      '/genre',
      '/profile',
      '/bookmarks',
      '/reading-history',
    ],
    
    // Don't show ads on these pages
    DISABLED_PAGES: [
      '/auth',
      '/author/dashboard',
      '/author/novels/create',
      '/author/novels/edit',
      '/author/novels/chapters/create',
      '/author/novels/chapters/edit',
      '/terms',
      '/privacy',
      '/copyright',
      '/guidelines',
    ],
  },
  
  // Ad loading settings
  LOADING: {
    DELAY: 100, // milliseconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // milliseconds
  },
};

// Helper function to check if ads should be shown on current page
export const shouldShowAds = (pathname: string): boolean => {
  const { ENABLED_PAGES, DISABLED_PAGES } = ADSENSE_CONFIG.PLACEMENT;
  
  // Check if current page is in disabled list
  if (DISABLED_PAGES.some(page => pathname.startsWith(page))) {
    return false;
  }
  
  // Check if current page is in enabled list
  return ENABLED_PAGES.some(page => pathname.startsWith(page));
};

// Helper function to get ad slot by type
export const getAdSlot = (type: keyof typeof ADSENSE_CONFIG.AD_SLOTS): string => {
  return ADSENSE_CONFIG.AD_SLOTS[type];
};

// Helper function to get ad format by type
export const getAdFormat = (type: keyof typeof ADSENSE_CONFIG.AD_FORMATS) => {
  return ADSENSE_CONFIG.AD_FORMATS[type];
}; 