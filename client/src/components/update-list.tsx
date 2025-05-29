// client/src/components/update-list.tsx
import { Link } from "wouter";
import UpdateCard from "@/components/update-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface Chapter {
  id: number;
  title: string;
  chapterNumber: number;
  novelId: number;
  content: string;
  updatedAt: string;
}

interface Novel {
  id: number;
  title: string;
  authorId: number;
  coverImage?: string;
  authorName?: string;
}

interface ChapterUpdate extends Chapter {
  novel?: Novel;
}

interface UpdateListProps {
  updates: ChapterUpdate[];
  isLoading: boolean;
  title: string;
  emptyMessage: string;
  showMoreLink?: string;
}

export default function UpdateList({
  updates,
  isLoading,
  title,
  emptyMessage,
  showMoreLink
}: UpdateListProps) {
  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showMoreLink && (
          <Link to={showMoreLink}>
            <Button variant="outline">View All</Button>
          </Link>
        )}
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
          {updates.map((update) => (
            <UpdateCard key={update.id} chapter={update} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No updates found</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}