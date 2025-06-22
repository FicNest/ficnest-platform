import React, { useState, useEffect, useRef, Suspense } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertNovelSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as baseQueryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import NovelCard from "@/components/novel-card";
import UpdateCard from "@/components/update-card";
import AnimatedLogo from "@/components/AnimatedLogo";
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Novel, Chapter, ReadingProgress } from "@shared/schema";
import { AuthModal } from "@/components/auth-modal";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

const LazyAuthModal = React.lazy(() => import("@/components/auth-modal").then(module => ({ default: module.AuthModal })));

// Define Author interface
interface Author {
  id: number;
  username: string;
}

interface ContinueReadingProps {
  readingProgress: ReadingProgress & {
    novel: Novel & {
      authorName?: string;
    };
    chapter: Chapter;
  };
}

// Define a type for chapters with enhanced novel information
interface ChapterWithNovelInfo {
  id: number;
  novelId: number;
  title: string;
  content: string;
  chapterNumber: number;
  authorNote?: string | null;
  viewCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  novel: {
    id: number;
    title: string;
    authorId: number;
    coverImage?: string | null;
  };
  username: string;
}

function ContinueReading({ readingProgress }: ContinueReadingProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Continue Reading</h2>
      <div className="bg-white rounded-lg shadow-sm px-3 py-2 flex items-center gap-3 w-full max-w-lg mx-auto">
        {/* Cover image */}
        {readingProgress.novel.coverImage ? (
          <img
            src={readingProgress.novel.coverImage}
            alt={`${readingProgress.novel.title} cover`}
            className="w-12 h-16 object-cover rounded-md flex-shrink-0"
            loading="lazy"
            width="48"
            height="64"
          />
        ) : (
          <div className="w-12 h-16 bg-gray-200 flex items-center justify-center rounded-md flex-shrink-0">
            <BookOpen className="text-gray-400" size={20} />
          </div>
        )}
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base truncate">{readingProgress.novel.title}</h3>
          </div>
          <p className="text-xs text-gray-500 truncate">
            by <Link to={`/authors/${readingProgress.novel.authorId}`} className="text-primary hover:underline">
              {readingProgress.novel.authorName || "Unknown Author"}
            </Link>
          </p>
          <p className="text-xs text-blue-600 truncate">
            Chapter {readingProgress.chapter.chapterNumber}: "{readingProgress.chapter.title}"
          </p>
          {/* Progress bar and percentage side by side */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full"
                style={{ width: `${readingProgress.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 min-w-[2.5rem] text-right">{readingProgress.progress}%</span>
          </div>
        </div>
        {/* Button */}
        <Link to={`/novels/${readingProgress.novel.title}/chapters/${readingProgress.chapter.chapterNumber}`}> 
          <Button size="sm" className="ml-2 whitespace-nowrap">
            Continue
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Latest Updates section component
function LatestUpdates({ 
  updates, 
  isLoading,
  onRefresh
}: { 
  updates: ChapterWithNovelInfo[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Latest Updates</h2>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-100 pb-6">
              <Skeleton className="h-36 w-24 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : updates && updates.length > 0 ? (
        <div className="space-y-6">
          {updates.map((chapter) => (
            <UpdateCard key={chapter.id} chapter={chapter} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No updates found</h3>
          <p className="text-gray-500">No recent chapter updates to display.</p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [emblaApi, setEmblaApi] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState('login');
  
  // Fetch featured novels
  const { data: featuredNovels, isLoading: isLoadingFeatured, refetch: refetchFeaturedNovels } = useQuery<Novel[]>({
    queryKey: ['/api/novels/latest'],
    queryFn: async () => {
      const res = await fetch('/api/novels/latest?limit=10');
      if (!res.ok) {
        throw new Error(`Error fetching novels: ${res.statusText}`);
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch top 10 novels by views
  const { data: topNovels, isLoading: isLoadingTop } = useQuery<Novel[]>({
    queryKey: ['/api/novels/top'],
    queryFn: async () => {
      const res = await fetch('/api/novels?sortBy=viewCount&sortOrder=desc&limit=10');
      if (!res.ok) {
        throw new Error(`Error fetching top novels: ${res.statusText}`);
      }
      return await res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // If user is logged in, fetch continue reading with author data
  const { data: continueReading } = useQuery<ContinueReadingProps['readingProgress']>({
    queryKey: ['/api/reading-progress/latest'],
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Fetch latest chapter updates with no cache
  const { 
    data: latestUpdates, 
    isLoading: isLoadingUpdates,
    refetch: refetchUpdates 
  } = useQuery<ChapterWithNovelInfo[]>({
    queryKey: ['/api/chapters/latest'],
    queryFn: async () => {
      const res = await fetch('/api/chapters/latest?limit=5');
      if (!res.ok) {
        throw new Error(`Error fetching latest updates: ${res.statusText}`);
      }
      return await res.json();
    },
    staleTime: 0, // Always fetch fresh data
  });
  
  // Fetch author data for the continue reading novel with proper typing
  const { data: author } = useQuery<Author>({
    queryKey: [`/api/users/${continueReading?.novel?.authorId}`],
    enabled: !!continueReading?.novel?.authorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Combine the continue reading data with author data
  const enhancedReadingProgress = continueReading && author ? {
    ...continueReading,
    novel: {
      ...continueReading.novel,
      authorName: author.username
    }
  } : continueReading;
  
  // Function to refresh latest updates
  const handleRefreshUpdates = () => {
    refetchUpdates();
  };
  
  return (
    <div className="py-8">
      <div className="container mx-auto px-4">
        {/* AnimatedLogo on white background */}
        <div className="mb-10 bg-white rounded-xl p-8">
          <AnimatedLogo />
        </div>

        {/* Continue Reading Section (for logged-in users) */}
        {user && enhancedReadingProgress?.chapter && (
          <ContinueReading readingProgress={enhancedReadingProgress} />
        )}

        {/* AuthModal (lazy loaded) */}
        <Suspense fallback={null}>
          <LazyAuthModal 
            isOpen={showAuthModal}
            onOpenChange={setShowAuthModal}
            defaultTab={authModalDefaultTab}
          />
        </Suspense>

        {/* Featured Novels Section */}
        <div className="mb-12">
           {/* Header with Title and Navigation */}
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-2xl font-bold">Latest Fan-Fics</h2>
             {/* Navigation Buttons positioned here */}
               {featuredNovels && featuredNovels.length > 0 && (
                 <Link href="/browse">
                   <Button variant="outline">View More</Button>
                 </Link>
              )}
          </div>
          
          {isLoadingFeatured ? (
            // Keep skeleton for loading state, adjust styling for slider if needed
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <Skeleton className="w-full h-56" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
               {/* Carousel Container */}
              <Carousel setApi={setEmblaApi} opts={{ align: 'start', dragFree: true }}>
                <CarouselContent>
                  {featuredNovels?.map((novel) => (
                    <CarouselItem key={novel.id} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 2xl:w-1/6 mr-4">
                      <NovelCard novel={novel} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        </div>

        {/* Top Novels Section */}
        <div className="mb-12">
          {/* Header with Title and Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Fan-Fics</h2>
            {/* Navigation Buttons positioned here */}
            {topNovels && topNovels.length > 0 && (
              <Link href="/ranking">
                <Button variant="outline">View More</Button>
              </Link>
            )}
          </div>
          
          {isLoadingTop ? (
            // Loading skeleton
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <Skeleton className="w-full h-56" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              {/* Carousel Container */}
              <Carousel setApi={setEmblaApi} opts={{ align: 'start', dragFree: true }}>
                <CarouselContent>
                  {topNovels?.map((novel) => (
                    <CarouselItem key={novel.id} className="w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 2xl:w-1/6 mr-4">
                      <NovelCard novel={novel} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        </div>
        
        {/* Latest Updates Section */}
        <LatestUpdates
          updates={latestUpdates}
          isLoading={isLoadingUpdates}
          onRefresh={handleRefreshUpdates}
        />
      </div>
    </div>
  );
}