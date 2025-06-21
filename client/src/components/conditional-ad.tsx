import { useLocation } from 'wouter';
import { shouldShowAds } from '@/config/adsense';
import { useAuth } from '@/hooks/use-auth';

interface ConditionalAdProps {
  children: React.ReactNode;
  showForAdmins?: boolean;
  showForAuthors?: boolean;
}

export const ConditionalAd: React.FC<ConditionalAdProps> = ({
  children,
  showForAdmins = false,
  showForAuthors = false
}) => {
  const [location] = useLocation();
  const { user } = useAuth();

  // Check if ads should be shown on current page
  if (!shouldShowAds(location)) {
    return null;
  }

  // Don't show ads to authors unless explicitly allowed
  if (user?.isAuthor && !showForAuthors) {
    return null;
  }

  return <>{children}</>;
};

// Specific conditional ad components
export const ConditionalHeaderAd: React.FC = () => (
  <ConditionalAd>
    <HeaderAd />
  </ConditionalAd>
);

export const ConditionalSidebarAd: React.FC = () => (
  <ConditionalAd>
    <SidebarAd />
  </ConditionalAd>
);

export const ConditionalInContentAd: React.FC = () => (
  <ConditionalAd>
    <InContentAd />
  </ConditionalAd>
);

export const ConditionalFooterAd: React.FC = () => (
  <ConditionalAd>
    <FooterAd />
  </ConditionalAd>
);

export const ConditionalChapterTopAd: React.FC = () => (
  <ConditionalAd>
    <ChapterTopAd />
  </ConditionalAd>
);

export const ConditionalChapterBottomAd: React.FC = () => (
  <ConditionalAd>
    <ChapterBottomAd />
  </ConditionalAd>
);

export const ConditionalNovelDetailAd: React.FC = () => (
  <ConditionalAd>
    <NovelDetailAd />
  </ConditionalAd>
);

export const ConditionalSearchResultsAd: React.FC = () => (
  <ConditionalAd>
    <SearchResultsAd />
  </ConditionalAd>
);

// Import the ad components
import {
  HeaderAd,
  SidebarAd,
  InContentAd,
  FooterAd,
  ChapterTopAd,
  ChapterBottomAd,
  NovelDetailAd,
  SearchResultsAd
} from './adsense-ad'; 