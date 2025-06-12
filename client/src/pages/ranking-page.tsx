import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Novel } from "@shared/schema";
// import NovelCard from "@/components/novel-card"; // No longer using NovelCard directly
import { Star, Eye, BookmarkIcon, Book } from "lucide-react";

// Extend Novel interface to include author name if necessary (based on API response)
interface RankedNovel extends Novel {
  authorName?: string;
  averageRating?: number;
  reviewCount?: string;
}

export default function RankingPage() {
  const [sortBy, setSortBy] = useState<"viewCount" | "bookmarkCount" | "rating">("viewCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: novels, isLoading, isError, error } = useQuery<RankedNovel[]>({
    queryKey: ["rankedNovels", sortBy, sortOrder],
    queryFn: async () => {
      const res = await fetch(`/api/novels?sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch ranked novels: ${res.status}`);
      }
      const data = await res.json();

      const publishedNovels = Array.isArray(data) ? data.filter(novel => novel.status === 'published') : [];

      // Fetch author names for each novel if not provided by the /api/novels endpoint
      const novelsWithAuthors = await Promise.all(publishedNovels.map(async (novel) => {
          if (novel.authorId && !novel.authorName) {
              try {
                  const authorRes = await fetch(`/api/users/${novel.authorId}`);
                  if (authorRes.ok) {
                      const author = await authorRes.json();
                      return { ...novel, authorName: author.username || "Unknown Author" };
                  } else {
                      return { ...novel, authorName: "Unknown Author" };
                  }
              } catch (err) {
                  console.error(`Error fetching author ${novel.authorId}:`, err);
                  return { ...novel, authorName: "Unknown Author" };
              }
          } else {
              return novel;
          }
      }));

      return novelsWithAuthors;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Log the novels data received on the client side for debugging
  console.log('Client-side novels data (first 10):', novels?.slice(0, 10));

  const handleSortByChange = (value: "viewCount" | "bookmarkCount" | "rating") => {
    setSortBy(value);
  };

  // Determine the metric value to display based on sortBy
  const getMetricValue = (novel: RankedNovel) => {
    if (sortBy === 'viewCount') return `${novel.viewCount || 0}`;
    if (sortBy === 'bookmarkCount') return `${novel.bookmarkCount || 0}`;
    if (sortBy === 'rating') return `${novel.reviewCount || 0}`;
    return '';
  };

   // Determine the metric icon to display based on sortBy
   const getMetricIcon = () => {
    if (sortBy === 'viewCount') return <Eye className="h-4 w-4" />;
    if (sortBy === 'bookmarkCount') return <BookmarkIcon className="h-4 w-4" />;
    if (sortBy === 'rating') return <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />;
    return null;
  };

   // Determine the metric label to display based on sortBy
   const getMetricLabel = () => {
    if (sortBy === 'viewCount') return 'Views';
    if (sortBy === 'bookmarkCount') return 'Bookmarks';
    if (sortBy === 'rating') return 'Reviews';
    return '';
  };

  const metricIcon = getMetricIcon();
  const metricLabel = getMetricLabel();


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-2xl text-gray-900">Novel Rankings</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-gray-200" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 text-red-600">
        Error loading rankings: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const novelsToDisplay = novels || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl text-gray-900">Novel Rankings</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Sort by:</span>
              <Select onValueChange={handleSortByChange} value={sortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewCount">Views</SelectItem>
                  <SelectItem value="bookmarkCount">Bookmarks</SelectItem>
                   <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {novelsToDisplay.length > 0 ? (
            <div className="space-y-4">
              {novelsToDisplay.map((novel, index) => (
                <div key={novel.id} className="flex items-center border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="text-xl font-bold text-gray-800 mr-4">#{index + 1}</div>
                  
                  {/* Novel Cover Image */}
                  <Link to={`/novels/${novel.id}`} className="flex-shrink-0 mr-4">
                    <div className="w-16 h-24 relative bg-gray-200 rounded-sm overflow-hidden flex items-center justify-center">
                        {novel.coverImage ? (
                            <img 
                                src={novel.coverImage} 
                                alt={`${novel.title} cover`}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                                width="64"
                                height="96"
                            />
                        ) : (
                            <Book className="text-gray-400" size={24} />
                        )}
                    </div>
                  </Link>

                  {/* Novel Title and Author */}
                  <div className="flex-1 min-w-0">
                     <Link href={`/novels/${novel.id}`} className="block">
                        <h3 className="font-semibold truncate text-base">{novel.title}</h3>
                     </Link>
                     {novel.authorName && <p className="text-sm text-gray-600">by {novel.authorName}</p>}
                  </div>
                  
                  {/* Metric Value Display */}
                  <div className="text-lg font-bold text-primary flex items-center gap-1 ml-4 flex-shrink-0">
                     {/* Display icon */}
                     {metricIcon}

                     {/* Display value and label */}
                     <span className="flex items-center gap-x-1">
                        {/* Conditional display for Rating (showing average and count) vs. others */}
                        {sortBy === 'rating' ? (
                           <>
                              {/* Display Average Rating */}
                              {/* Convert string to number and check if it's a valid number */}
                              {typeof novel.averageRating === 'string' && !isNaN(parseFloat(novel.averageRating)) ? (
                                 <span className="flex items-center gap-x-1 text-yellow-500">
                                    {/* Star icon is already included via metricIcon */}
                                    <span>{parseFloat(novel.averageRating).toFixed(1)}</span>
                                 </span>
                              ) : (
                                 <span className="text-sm font-medium text-gray-600">--</span>
                              )}

                              {/* Display Review Count */}
                              {/* Convert string to number, explicitly handling undefined */}
                              <span className="text-sm font-medium text-gray-600 ml-2">
                                 ({parseInt(novel.reviewCount ?? '0', 10)} Reviews)
                              </span>
                           </>
                        ) : (
                           <>
                              <span>{getMetricValue(novel)}</span>
                              <span className="text-sm font-medium text-gray-600">{metricLabel}</span>
                           </>
                        )}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No novels found for this ranking criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 