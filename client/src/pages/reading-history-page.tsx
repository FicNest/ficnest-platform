import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, History, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Define interfaces for better type checking
interface Chapter {
  id: number;
  title: string;
  chapterNumber: number;
  novelId: number;
}

interface Novel {
  id: number;
  title: string;
  authorId: number;
  coverImage?: string;
  authorName?: string;
}

interface ReadingProgressItem {
  id: number;
  userId: number;
  novelId: number;
  chapterId: number;
  progress: number;
  lastReadAt: string;
  novel?: Novel;
  chapter?: Chapter;
}

// Function to format time ago
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      return "Recently";
    }
    
    // Calculate time difference
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 30) {
      return new Date(dateString).toLocaleDateString();
    } else if (diffDay > 0) {
      return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
    } else if (diffHour > 0) {
      return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffMin > 0) {
      return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
  } catch (e) {
    console.error("Error calculating time ago:", e);
    return "Recently";
  }
}

export default function ReadingHistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [readingData, setReadingData] = useState<ReadingProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reading history
  const { data: readingHistory, isLoading: isHistoryLoading, refetch: refetchHistory, error: historyError } = 
    useQuery<ReadingProgressItem[]>({
      queryKey: ["/api/reading-progress/recent", user?.id],
      queryFn: async () => {
        try {
          console.log("Fetching reading history...");
          const response = await fetch("/api/reading-progress/recent?limit=50", {
            credentials: "include"
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response (${response.status}): ${errorText}`);
            throw new Error(`Error response: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log("Reading history data received:", data);
          return data;
        } catch (error) {
          console.error("Error fetching reading history:", error);
          throw error;
        }
      },
      enabled: !!user,
      staleTime: 60000 // 1 minute
    });

  // Update state when data is loaded
  useEffect(() => {
    setIsLoading(isHistoryLoading);
    
    if (readingHistory) {
      setReadingData(readingHistory);
    }
    
    if (historyError) {
      setError(historyError?.toString() || "Error loading reading data");
    }
  }, [readingHistory, isHistoryLoading, historyError]);

  // Handle retry
  const handleRetry = () => {
    setIsLoading(true);
    refetchHistory();
  };

  // Display login prompt if user is not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your reading history.</p>
            <Button onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Reading History Section */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-2xl text-gray-900">Reading History</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 border-b border-gray-100 pb-6 last:border-b-0">
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
          ) : error ? (
            <div className="text-center py-10">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-xl font-medium text-red-600 mb-2">Error loading reading history</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : readingData.length > 0 ? (
            <div className="space-y-6">
              {readingData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 flex-row"
                >
                  <Link to={`/novels/${item.novel?.title}`} className="flex-shrink-0">
                    {item.novel?.coverImage ? (
                      <img
                        src={item.novel.coverImage}
                        alt={`${item.novel.title} cover`}
                        className="w-20 h-28 object-cover rounded-md shadow-sm bg-gray-200 dark:bg-gray-900"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-gray-200 dark:bg-gray-900 flex items-center justify-center rounded-md shadow-sm">
                        <BookOpen className="text-gray-400" size={32} />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/novels/${item.novel?.title}`} className="block">
                      <h3 className="font-semibold text-base mb-1 hover:text-primary transition text-gray-900 dark:text-gray-100 truncate">
                        {item.novel?.title || `Novel ${item.novelId}`}
                      </h3>
                    </Link>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 truncate">
                      by {item.novel?.authorName || "Unknown Author"}
                    </p>
                    <p className="text-xs font-medium text-primary mb-1 truncate">
                      {item.chapter ? (
                        <Link to={`/novels/${item.novel?.title}/chapters/${item.chapter.chapterNumber}`} className="text-primary hover:underline">{`Chapter ${item.chapter.chapterNumber}: "${item.chapter.title}"`}</Link>
                      ) : (
                        'Unavailable Chapter'
                      )}
                    </p>
                    <div className="mt-2 mb-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2 w-full" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Last read {formatTimeAgo(item.lastReadAt)}
                      </div>
                      <Link
                        to={item.chapter ? `/novels/${item.novel?.title}/chapters/${item.chapter.chapterNumber}` : `/novels/${item.novel?.title}`}
                        onClick={(e) => {!item.chapter && e.preventDefault();}}
                      >
                        <Button size="sm" disabled={!item.chapter} className="mt-1">
                          Continue Reading
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white">
              <History className="mx-auto h-16 w-16 text-gray-300 mb-6" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No reading history yet</h3>
              <p className="text-gray-500 mb-6">
                You haven't read any novels yet. Browse novels to start reading.
              </p>
              <Link to="/browse">
                <Button>
                  Browse Novels
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}