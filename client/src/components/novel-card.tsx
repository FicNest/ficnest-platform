// Update the novel-card.tsx component to make genres link to genre pages
import { Link } from "wouter";
import { Novel } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Eye, BookmarkIcon, Star, Book, BookOpen, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useRef } from "react";

interface NovelCardProps {
  novel: Novel & {
    authorName?: string;
    chapterCount?: number;
    synopsis?: string;
  };
}

interface Author {
  id: number;
  username: string;
}

export default function NovelCard({ novel }: NovelCardProps) {
  const isMobile = useIsMobile();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  
  // Fetch author data only if authorName is not provided
  const { data: author } = useQuery<Author>({
    queryKey: [`/api/users/${novel.authorId}`],
    // Skip query if authorName is already provided
    enabled: !novel.authorName,
    // We'll still show the card even if author fetch fails
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Use provided authorName or fetch from query
  const authorDisplayName = novel.authorName || (author ? author.username : "Author");
  
  // Limit is 2 for mobile, 3 for desktop
  const tagLimit = isMobile ? 2 : 3;
  
  // Handle case where novel might be null or undefined
  if (!novel) {
    return null; // Or render a skeleton/placeholder
  }

  // Use novel.title for the link
  const novelLink = `/novels/${encodeURIComponent(novel.title)}`;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load image when it's about to be visible
            setImageSrc(novel.coverImage || '');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Load images 50px before they come into view
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [novel.coverImage]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 h-full">
      {/* Image container with fixed aspect ratio */}
      <Link to={novelLink} className="block">
        <div 
          ref={imageRef}
          className="relative w-full h-56 bg-gray-100"
        >
          {imageSrc ? (
            <>
              {/* Placeholder while image loads */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                  <BookOpen className="text-gray-400" size={40} />
                </div>
              )}
              
              {/* Actual image */}
              <img
                src={imageSrc}
                alt={novel.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
                width="200"
                height="280"
              />
            </>
          ) : (
            // Default placeholder for novels without covers
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <BookOpen className="text-gray-400" size={40} />
            </div>
          )}
          
          {/* Optional: View count overlay */}
          {novel.viewCount > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Eye size={12} />
              {novel.viewCount.toLocaleString()}
            </div>
          )}
        </div>
      </Link>

      {/* Card content */}
      <div className="p-4">
        <Link to={novelLink} className="block">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 text-sm hover:text-primary transition-colors">
            {novel.title}
          </h3>
        </Link>
        
        <p className="text-xs text-gray-600 mb-2 line-clamp-1">
          by{" "}
          <Link to={`/authors/${encodeURIComponent(authorDisplayName)}`} className="hover:text-primary transition-colors">
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
        
        {/* Optional: Synopsis preview */}
        {novel.synopsis && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
            {novel.synopsis}
          </p>
        )}
      </div>
    </div>
  );
}