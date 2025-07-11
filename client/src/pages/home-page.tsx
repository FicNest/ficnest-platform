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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useTheme } from "../components/theme-provider";

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

// Extend Novel type for topNovels to include authorName
interface TopNovel extends Novel {
  authorName?: string;
}

function ContinueReading({ readingProgress }: ContinueReadingProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Continue Reading</h2>
      <div className="bg-white rounded-lg shadow-sm px-3 py-2 flex flex-row items-center gap-3 w-full">
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
        {/* Info and progress */}
        <div className="flex-1 min-w-0 w-full flex flex-col">
          <div>
            <h3 className="font-semibold text-base truncate">{readingProgress.novel.title}</h3>
            <p className="text-xs text-gray-500 truncate">
              by <Link to={`/authors/${readingProgress.novel.authorId}`} className="text-primary hover:underline">
                {readingProgress.novel.authorName || "Unknown Author"}
              </Link>
            </p>
            <p className="text-xs text-blue-600 truncate">
              Chapter {readingProgress.chapter.chapterNumber}: "{readingProgress.chapter.title}"
            </p>
          </div>
          {/* Progress bar and percentage side by side, always below info */}
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
        {/* Button: always compact, never full width */}
        <div className="md:ml-2 flex-shrink-0">
          <Link to={`/novels/${readingProgress.novel.title}/chapters/${readingProgress.chapter.chapterNumber}`}> 
            <Button size="sm" className="whitespace-nowrap">
              Continue
            </Button>
          </Link>
        </div>
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

// Helper function for relative time
function getRelativeTime(dateStr: string | undefined) {
  if (!dateStr) return '';
  const now = new Date();
  const updateDate = new Date(dateStr);
  const diffMs = now.getTime() - updateDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [emblaApi, setEmblaApi] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState('login');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!user) {
      setShowRegisterPrompt(true);
    } else {
      setShowRegisterPrompt(false);
    }
  }, [user]);
  
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
  const { data: topNovels, isLoading: isLoadingTop } = useQuery<TopNovel[]>({
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
      const res = await fetch('/api/chapters/latest?limit=10');
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
  
  // Group latestUpdates by novel
  const groupedUpdates = (latestUpdates || []).reduce((acc, chapter) => {
    const key = chapter.novel.id;
    if (!acc[key]) acc[key] = { novel: chapter.novel, chapters: [] };
    acc[key].chapters.push(chapter);
    return acc;
  }, {} as Record<number, { novel: ChapterWithNovelInfo['novel'], chapters: ChapterWithNovelInfo[] }>);
  let groupedUpdatesArr = Object.values(groupedUpdates);
  // Sort by most recent chapter update (descending)
  groupedUpdatesArr.sort((a, b) => {
    const aLatest = a.chapters.reduce((max, c) => c.updatedAt > max ? c.updatedAt : max, a.chapters[0]?.updatedAt || '');
    const bLatest = b.chapters.reduce((max, c) => c.updatedAt > max ? c.updatedAt : max, b.chapters[0]?.updatedAt || '');
    return new Date(bLatest).getTime() - new Date(aLatest).getTime();
  });
  
  const handleCreateAccount = () => {
    setShowAuthModal(true);
    setAuthModalDefaultTab('register');
    setShowRegisterPrompt(false);
  };
  
  return (
    <div className="pt-8 pb-2">
      <div className="container mx-auto px-4">
        {/* Registration Prompt Dialog for unregistered users */}
        <Dialog open={showRegisterPrompt} onOpenChange={setShowRegisterPrompt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Join FicNest for More Features!</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-center">
              <p className="mb-4">Create a free account to unlock reading history, bookmarks, and more personalized features.</p>
              <Button className="w-full" onClick={handleCreateAccount}>
                Create Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* AnimatedLogo on white background */}
        <div className="mb-10 bg-white rounded-xl p-8">
          <AnimatedLogo />
        </div>

        {/* Continue Reading Section (for logged-in users) */}
        {user && enhancedReadingProgress?.chapter && (
          <ContinueReading readingProgress={enhancedReadingProgress} />
        )}

        {/* AuthModal (lazy loaded) - always render outside the popup */}
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

        {/* Two-column section for Top Fan-Fics and Latest Updates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Top Fan-Fics List */}
          <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Fan-Fics</h2>
            {topNovels && topNovels.length > 0 && (
              <Link href="/ranking">
                <Button variant="outline">View More</Button>
              </Link>
            )}
          </div>
          {isLoadingTop ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white rounded shadow-sm">
                    <Skeleton className="h-16 w-12 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topNovels && topNovels.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto md:max-h-none md:overflow-visible">
                {topNovels.map((novel, idx) => (
                  <Link
                    key={novel.id}
                    to={`/novels/${novel.title}`}
                    className="flex items-center gap-3 p-2 bg-white rounded shadow-sm hover:bg-gray-50 transition"
                  >
                    {/* Ranking Number - theme-aware styling */}
                    <span
                      className={`min-w-[2.5rem] text-right mr-2 font-extrabold text-lg select-none drop-shadow-sm ${
                        idx === 0
                          ? theme === 'dark'
                            ? 'text-yellow-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                            : 'text-yellow-500'
                          : idx === 1
                          ? theme === 'dark'
                            ? 'text-gray-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                            : 'text-gray-400'
                          : idx === 2
                          ? theme === 'dark'
                            ? 'text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                            : 'text-amber-700'
                          : theme === 'dark'
                            ? 'text-gray-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]'
                            : 'text-gray-500'
                      }`}
                      title={`Rank ${idx + 1}`}
                    >
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`}
                    </span>
                    {novel.coverImage ? (
                      <img
                        src={novel.coverImage}
                        alt={`${novel.title} cover`}
                        className="w-12 h-16 object-cover rounded-md shadow-sm"
                        loading="lazy"
                        width="48"
                        height="64"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-gray-200 flex items-center justify-center rounded-md shadow-sm">
                        <BookOpen className="text-gray-400" size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base truncate">{novel.title}</div>
                      <div className="text-xs text-gray-500 truncate">by {novel.authorName || 'Unknown Author'}</div>
                </div>
                  </Link>
              ))}
            </div>
          ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No top fan-fics found</h3>
                <p className="text-gray-500">No top fan-fics to display.</p>
            </div>
          )}
        </div>
        
          {/* Latest Updates List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Latest Updates</h2>
              {latestUpdates && latestUpdates.length > 0 && (
                <Button variant="outline" onClick={handleRefreshUpdates}>Refresh</Button>
              )}
            </div>
            {isLoadingUpdates ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white rounded shadow-sm">
                    <Skeleton className="h-16 w-12 rounded-md" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : latestUpdates && latestUpdates.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto md:max-h-none md:overflow-visible">
                {groupedUpdatesArr.map(({ novel, chapters }) => (
                  <div key={novel.id} className="flex gap-3 p-2 bg-white rounded shadow-sm">
                    {novel.coverImage ? (
                      <img
                        src={novel.coverImage}
                        alt={`${novel.title} cover`}
                        className="w-12 h-16 object-cover rounded-md shadow-sm flex-shrink-0"
                        loading="lazy"
                        width="48"
                        height="64"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-gray-200 flex items-center justify-center rounded-md shadow-sm flex-shrink-0">
                        <BookOpen className="text-gray-400" size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="font-semibold text-base truncate">{novel.title}</div>
                        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">{getRelativeTime(chapters[0].updatedAt)}</span>
                      </div>
                      <div className="space-y-0.5">
                        {chapters.length > 3 ? (
                          <>
                            {/* Sort chapters by createdAt ascending for first, descending for last */}
                            {(() => {
                              const sorted = [...chapters].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                              const first = sorted[0];
                              const last = sorted[sorted.length - 1];
                              return (
                                <>
                                  <Link
                                    key={first.id}
                                    to={`/novels/${novel.title}/chapters/${first.chapterNumber}`}
                                    className="block text-xs text-gray-800 hover:underline truncate"
                                  >
                                    <span className="font-bold text-sm text-black">#{first.chapterNumber}</span> {first.title}
                                  </Link>
                                  <div className="text-xs text-gray-500 text-center">...</div>
                                  <Link
                                    key={last.id}
                                    to={`/novels/${novel.title}/chapters/${last.chapterNumber}`}
                                    className="block text-xs text-gray-800 hover:underline truncate"
                                  >
                                    <span className="font-bold text-sm text-black">#{last.chapterNumber}</span> {last.title}
                                  </Link>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          chapters.map((chapter) => (
                            <Link
                              key={chapter.id}
                              to={`/novels/${novel.title}/chapters/${chapter.chapterNumber}`}
                              className="block text-xs text-gray-800 hover:underline truncate"
                            >
                              <span className="font-bold text-sm text-black">#{chapter.chapterNumber}</span> {chapter.title}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
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
        </div>
      </div>
    </div>
  );
}