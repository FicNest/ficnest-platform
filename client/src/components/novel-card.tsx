// Update the novel-card.tsx component to make genres link to genre pages
import { Link } from "wouter";
import { Novel } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Eye, BookmarkIcon, Star, Book } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NovelCardProps {
  novel: Novel & {
    authorName?: string; // Add optional authorName property
  };
}

interface Author {
  id: number;
  username: string;
}

interface Review {
  id: number;
  rating: number;
}

export default function NovelCard({ novel }: NovelCardProps) {
  const isMobile = useIsMobile();
  
  // Fetch author data only if authorName is not provided
  const { data: author } = useQuery<Author>({
    queryKey: [`/api/users/${novel.authorId}`],
    // Skip query if authorName is already provided
    enabled: !novel.authorName,
    // We'll still show the card even if author fetch fails
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Calculate average rating from reviews (if available)
  const { data: reviews } = useQuery<Review[]>({
    queryKey: [`/api/novels/${novel.id}/reviews`],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length 
    : 0;
  
  // Use provided authorName or fetch from query
  const authorDisplayName = novel.authorName || (author ? author.username : "Author");
  
  // Limit is 2 for mobile, 3 for desktop
  const tagLimit = isMobile ? 2 : 3;
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition w-full h-full">
      <Link to={`/novels/${novel.id}`}>
        {/* Image container with fixed aspect ratio */}
        <div className="w-full relative" style={{ paddingBottom: '150%' }}> {/* 2:3 aspect ratio (height is 150% of width)*/}
           {novel.coverImage ? (
            <img 
              src={novel.coverImage} 
              alt={`${novel.title} cover`}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
              <Book className="text-gray-400" size={32} />
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/novels/${novel.id}`} className="block">
          {/* Fixed size title with truncation */}
          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition overflow-hidden text-ellipsis whitespace-nowrap">{novel.title}</h3>{/* Reduced text size */}
        </Link>
        
        {/* Removed Author, Genres, and Stats */}
        {/*
        <p className="text-gray-600 text-sm mb-2">
          by{" "}
          <Link to={`/authors/${novel.authorId}`} className="hover:text-primary">
            {authorDisplayName}
          </Link>
        </p>
        
        {novel.genres && novel.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {novel.genres.slice(0, tagLimit).map((genre, index) => (
              <Link key={index} to={`/genre/${encodeURIComponent(genre.toLowerCase())}`}>
                <span className="inline-block bg-primary-light/20 text-primary-dark text-xs py-1 px-2 rounded-full hover:bg-primary-light/30 transition">
                  {genre}
                </span>
              </Link>
            ))}
            {novel.genres.length > tagLimit && (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs py-1 px-2 rounded-full">
                +{novel.genres.length - tagLimit} more
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center text-gray-500 text-sm space-x-3">
          <div className="flex items-center">
            <Eye className="mr-1 h-4 w-4" />
            <span>{novel.viewCount >= 1000 
              ? `${(novel.viewCount / 1000).toFixed(1)}K` 
              : novel.viewCount}
            </span>
          </div>
          <div className="flex items-center">
            <BookmarkIcon className="mr-1 h-4 w-4" />
            <span>{novel.bookmarkCount}</span>
          </div>
          {reviews && reviews.length > 0 && (
            <div className="flex items-center text-yellow-500">
              <Star className="mr-1 h-4 w-4" />
              <span>{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        */}
      </div>
    </div>
  );
}