import React, { useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Bookmark, Search, Trash2, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; // Import from your lib, not from @tanstack
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Define the interface for a bookmark with novel data
interface BookmarkWithNovel {
  id: number;
  userId: number;
  novelId: number;
  createdAt: string;
  novel?: {
    id: number;
    title: string;
    description: string;
    coverImage?: string;
    authorId: number;
    authorName?: string;
    rating?: number;
  };
}

// Properly type the children prop
interface BookmarkCardProps {
  children: ReactNode;
}

export default function BookmarksPage() {
  // The key change is to always render a complete UI component, never conditionally render the entire component
  // This avoids React hydration issues on refresh
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  // Set mounted to true when component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch bookmarks only when authenticated
  const {
    data: bookmarksData,
    isLoading: isBookmarksLoading,
    refetch,
    isError,
    error
  } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Fetch bookmarks
        const res = await fetch("/api/bookmarks", {
          credentials: "include"
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch bookmarks: ${res.status}`);
        }
        
        const bookmarks = await res.json();
        if (!Array.isArray(bookmarks)) return [];
        
        // Enhance bookmarks with novel data
        const enhancedBookmarks = await Promise.all(
          bookmarks.map(async (bookmark) => {
            if (!bookmark?.novelId) return null;
            
            try {
              // Fetch novel data
              const novelRes = await fetch(`/api/novels/${bookmark.novelId}`, {
                credentials: "include"
              });
              
              if (!novelRes.ok) {
                return {
                  ...bookmark,
                  novel: {
                    id: bookmark.novelId,
                    title: "Novel not found",
                    description: "This novel may have been removed",
                    authorId: 0,
                    authorName: "Unknown"
                  }
                };
              }
              
              const novel = await novelRes.json();
              
              // Get author name
              let authorName = "Unknown Author";
              if (novel?.authorId) {
                try {
                  const authorRes = await fetch(`/api/users/${novel.authorId}`, {
                    credentials: "include"
                  });
                  if (authorRes.ok) {
                    const author = await authorRes.json();
                    authorName = author.username || "Unknown Author";
                  }
                } catch (err) {
                  console.error("Error fetching author:", err);
                }
              }
              
              return {
                ...bookmark,
                novel: {
                  ...novel,
                  authorName
                }
              };
            } catch (err) {
              console.error(`Error processing bookmark ${bookmark.id}:`, err);
              return null;
            }
          })
        );
        
        return enhancedBookmarks.filter(Boolean) as BookmarkWithNovel[];
      } catch (err) {
        console.error("Error in bookmarks query:", err);
        return [];
      }
    },
    enabled: !!user && mounted,
    staleTime: 60000 // 1 minute
  });

  // Function to remove a bookmark
  const removeBookmark = async (novelId: number) => {
    if (!user) return;
    
    try {
      await apiRequest("DELETE", `/api/bookmarks/${novelId}`);
      
      toast({
        title: "Bookmark removed",
        description: "Novel has been removed from your bookmarks",
      });
      
      // Refresh the bookmarks list
      refetch();
    } catch (error) {
      console.error("Error removing bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  // Filter bookmarks based on search
  const bookmarks = bookmarksData || [];
  const filteredBookmarks = searchQuery.trim() 
    ? bookmarks.filter(bookmark => 
        bookmark?.novel?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark?.novel?.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookmarks;

  // Determine if we're in a loading state
  const isLoading = isAuthLoading || (!mounted) || (user && isBookmarksLoading);

  // Simple helper for Card container to avoid duplication
  const BookmarkCard = ({ children }: BookmarkCardProps) => (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl text-gray-900">My Bookmarks</CardTitle>
            {user && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search bookmarks..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <BookmarkCard>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-100 pb-6">
              <Skeleton className="h-36 w-24 bg-gray-200" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </BookmarkCard>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your bookmarks.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <BookmarkCard>
        <div className="text-center py-6">
          <h3 className="text-xl font-medium text-red-600 mb-4">Error Loading Bookmarks</h3>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : "Failed to load your bookmarks"}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </BookmarkCard>
    );
  }

  // Content state - has bookmarks or no bookmarks
  return (
    <BookmarkCard>
      {filteredBookmarks.length > 0 ? (
        <div className="space-y-6">
          {filteredBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="flex items-start gap-4 border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 flex-row">
              <Link to={`/novels/${encodeURIComponent(bookmark.novel?.title || '')}`} className="flex-shrink-0">
                {bookmark.novel?.coverImage ? (
                  <img
                    src={bookmark.novel.coverImage}
                    alt={`${bookmark.novel.title} cover`}
                    className="w-20 h-28 object-cover rounded-md shadow-sm bg-gray-200 dark:bg-gray-900"
                  />
                ) : (
                  <div className="w-20 h-28 bg-gray-200 dark:bg-gray-900 flex items-center justify-center rounded-md shadow-sm">
                    <BookOpen className="text-gray-400" size={32} />
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/novels/${encodeURIComponent(bookmark.novel?.title || '')}`} className="block">
                  <h3 className="font-semibold text-base mb-1 hover:text-primary transition text-gray-900 dark:text-gray-100 truncate">
                    {bookmark.novel?.title || `Novel ${bookmark.novelId}`}
                  </h3>
                </Link>
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 line-clamp-2">
                  {bookmark.novel?.description || "No description available."}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 truncate">
                  by {bookmark.novel?.authorName || "Unknown Author"}
                </p>
                {/* Optionally add rating display back here if needed, with styling */}
                {/* <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-auto">
                  <Star className="h-4 w-4 mr-1 text-yellow-400" fill="yellow" />
                  <span>{bookmark.novel?.rating?.toFixed(1) || 'N/A'}</span>
                </div> */}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeBookmark(bookmark.novelId)}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <div className="text-center py-10">
          <h3 className="text-xl font-medium text-gray-900 mb-2">No matching bookmarks</h3>
          <p className="text-gray-500 mb-6">
            No bookmarks match your search criteria. Try a different search term.
          </p>
          <Button onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="text-center py-10">
          <Bookmark className="mx-auto h-16 w-16 text-gray-300 mb-6" />
          
          <h3 className="text-xl font-medium text-gray-900 mb-2">No bookmarks yet</h3>
          <p className="text-gray-500 mb-6">
            You haven't bookmarked any novels yet. Browse novels to add some to your bookmarks.
          </p>
          <Link href="/browse">
            <Button>Browse Novels</Button>
          </Link>
        </div>
      )}
    </BookmarkCard>
  );
}