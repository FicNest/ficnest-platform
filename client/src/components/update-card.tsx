import { Link } from "wouter";
import { Book } from "lucide-react";

// Define the minimal interfaces needed
interface Chapter {
  id: number;
  title: string;
  chapterNumber: number;
  novelId: number;
  content: string;
  updatedAt: string;
  authorNote?: string | null;
  viewCount: number;
  status: string;
}

interface NovelInfo {
  id: number;
  title: string;
  authorId: number;
  coverImage?: string | null;
}

interface UpdateCardProps {
  chapter: Chapter & {
    novel: NovelInfo;
    username: string;
  };
}

export default function UpdateCard({ chapter }: UpdateCardProps) {
  // Format relative time with safe type handling
  const getRelativeTime = (dateStr: string | undefined) => {
    if (!dateStr) return "recently";
    
    try {
      const now = new Date();
      const updateDate = new Date(dateStr);
      const diffMs = now.getTime() - updateDate.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return diffDays === 1 ? "yesterday" : `${diffDays} days ago`;
      } else if (diffHours > 0) {
        return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
      } else {
        return "just now";
      }
    } catch (e) {
      // Fallback in case of date parsing errors
      return "recently";
    }
  };
  
  // Access novel and author directly from chapter prop
  const { novel, username } = chapter;

  // Return null if we don't have valid novel data (chapter should always be valid if passed)
  if (!novel) {
    return null;
  }
  
  return (
    <div className="flex items-start gap-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
      {/* Book cover - with flex-shrink-0 to prevent it from shrinking */}
      <Link to={`/novels/${encodeURIComponent(novel.title)}`} className="flex-shrink-0">
        {novel.coverImage ? (
          <img 
            src={novel.coverImage} 
            alt={`${novel.title} cover`} 
            className="w-16 h-24 object-cover rounded-md shadow-sm"
            loading="lazy"
            width="64"
            height="96"
          />
        ) : (
          <div className="w-16 h-24 bg-gray-200 flex items-center justify-center rounded-md shadow-sm">
            <Book className="text-gray-400" size={20} />
          </div>
        )}
      </Link>
      
      {/* Content container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top row with title and timestamp */}
        <div className="flex justify-between items-start gap-2">
          {/* Title and author */}
          <div className="min-w-0">
            <h3 className="font-semibold text-lg hover:text-primary transition truncate">
              <Link to={`/novels/${encodeURIComponent(novel.title)}`}>{novel.title}</Link>
            </h3>
            <p className="text-sm text-gray-600 truncate">
              by{" "}
              <Link 
                to={`/authors/${novel.authorId}`} 
                className="hover:text-primary"
              >
                {username || "Author"}
              </Link>
            </p>
          </div>
          
          {/* Timestamp - pushed to the right */}
          <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
            {getRelativeTime(chapter.updatedAt)}
          </span>
        </div>
        
        {/* Chapter link - on its own row */}
        <div className="mt-2">
          <Link 
            to={`/novels/${encodeURIComponent(novel.title)}/chapters/${chapter.chapterNumber}`} 
            className="text-primary hover:underline"
          >
            <span className="block truncate">
              Chapter {chapter.chapterNumber || '?'}: {chapter.title || 'Untitled'}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}