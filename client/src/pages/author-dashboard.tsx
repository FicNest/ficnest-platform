import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Novel } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Update your imports in author-dashboard.tsx:
import { Plus, Edit, Book, BookPlus, MessageSquare, Star, ExternalLink, Reply, FileText, Trash2} from "lucide-react";
import DraftManager from "@/components/DraftManager";
import { DashboardDeleteButton } from "@/components/DashboardDeleteButton";
import CommentSection from "@/components/comment-section";

// Common utility functions and interfaces
interface User {
  id: number;
  username: string;
}

interface BaseContent {
  id: number;
  content: string;
  userId: number;
  createdAt: string;
  user?: User;
}

// Comment-specific interfaces
interface CommentChapter {
  id: number;
  title: string;
  chapterNumber: number;
  novelId: number;
}

interface CommentNovelInfo {
  id: number;
  title: string;
}

interface CommentWithMetadata extends BaseContent {
  chapterId: number;
  parentId?: number;
  likes: number;
  chapter?: CommentChapter;
  novel?: CommentNovelInfo;
  replies?: CommentWithMetadata[];
}

// Review-specific interface
interface ReviewWithUser extends BaseContent {
  novelId: number;
  rating: number;
  novel?: {
    id: number;
    title: string;
  };
}

// Shared utility functions
const getTimeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return diffDays === 1 ? "yesterday" : `${diffDays} days ago`;
  if (diffHours > 0) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  if (diffMinutes > 0) return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  return "just now";
};

const getColorForUserId = (userId: number): string => {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500",
    "bg-pink-500", "bg-yellow-500", "bg-red-500",
    "bg-indigo-500", "bg-teal-500", "bg-orange-500"
  ];
  return colors[userId % colors.length];
};

const getInitials = (name: string): string => 
  !name ? "?" : name.charAt(0).toUpperCase();

// LoadingSkeleton component for reuse
const LoadingSkeleton = ({ itemCount = 3, withRating = false }) => (
  <div className="space-y-6">
    {[...Array(itemCount)].map((_, i) => (
      <div key={i} className="flex gap-4 pb-6 border-b border-gray-100">
        <Skeleton className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/4 bg-gray-200" />
          <Skeleton className="h-4 w-full bg-gray-200" />
          <Skeleton className="h-4 w-full bg-gray-200" />
          <Skeleton className="h-4 w-3/4 bg-gray-200" />
          {withRating && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Skeleton key={star} className="h-5 w-5" />
              ))}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

// Author Reviews Section Component
function AuthorReviewsSection() {
  const { user } = useAuth();
  const [filterByNovel, setFilterByNovel] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch author's novels
  const { data: authorNovels, isLoading: isLoadingNovels } = useQuery<Novel[]>({
    queryKey: [`/api/novels/author/${user?.id}`],
    enabled: !!user,
  });

  // Fetch reviews for the author's novels
  const { data: allReviews, isLoading: isLoadingReviews } = useQuery<ReviewWithUser[]>({
    queryKey: ["author-reviews", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const novelResponse = await fetch(`/api/novels/author/${user.id}`);
        if (!novelResponse.ok) throw new Error(`Failed to fetch novels: ${novelResponse.status}`);
        
        const novels = await novelResponse.json();
        if (!novels?.length) return [];
        
        const reviewPromises = novels.map(async (novel: Novel) => {
          const reviewResponse = await fetch(`/api/novels/${novel.id}/reviews`);
          if (!reviewResponse.ok) return [];
          
          const reviews = await reviewResponse.json();
          return reviews.map((review: ReviewWithUser) => ({
            ...review,
            novel: { id: novel.id, title: novel.title }
          }));
        });
        
        return (await Promise.all(reviewPromises)).flat();
      } catch (error) {
        console.error("Error fetching author reviews:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter and sort reviews
  const filteredReviews = allReviews 
    ? allReviews.filter(review => filterByNovel === "all" || review.novelId.toString() === filterByNovel)
    : [];
  
  const sortedReviews = [...filteredReviews].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Pagination
  const paginatedReviews = sortedReviews.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sortedReviews.length / pageSize);

  if (isLoadingNovels || isLoadingReviews) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Novel Reviews</h1>
        <LoadingSkeleton withRating={true} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Novel Reviews</h1>
      
      {/* Filter Control */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-900">Filter by novel:</label>
        <Select value={filterByNovel} onValueChange={setFilterByNovel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All novels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All novels</SelectItem>
            {authorNovels?.map(novel => (
              <SelectItem key={novel.id} value={novel.id.toString()}>{novel.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Reviews List */}
      {paginatedReviews?.length > 0 ? (
        <div className="space-y-6">
          {paginatedReviews.map((review) => {
            const username = review.user?.username || `User ${review.userId}`;
            const avatarColor = getColorForUserId(review.userId);
            
            return (
              <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${avatarColor} text-gray-900`}>
                      {getInitials(username)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-gray-900">{username}</span>
                        <span className="text-sm text-gray-500 ml-2">{getTimeAgo(review.createdAt)}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        on <Link to={`/novels/${encodeURIComponent(review.novel?.title || '')}`} className="text-primary hover:underline">
                          {review.novel?.title || "Unknown Novel"}
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i}
                          className={`h-5 w-5 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    
                    <p className="text-gray-700 my-3 whitespace-pre-line">{review.content}</p>
                    
                    <div className="flex justify-end">
                      <Link to={`/novels/${encodeURIComponent(review.novel?.title || '')}`}>
                        <Button variant="ghost" size="sm" className="flex items-center text-gray-500">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          View novel
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 bg-white">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-6">When readers review your novels, they'll appear here</p>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8 text-gray-900">
          <Button 
            variant="outline" size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Previous</Button>
          
          <div className="flex items-center mx-2">
            <span className="text-sm">Page {page} of {totalPages}</span>
          </div>
          
          <Button 
            variant="outline" size="sm" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next</Button>
        </div>
      )}
    </div>
  );
}

// Author Comments Section Component
function AuthorCommentsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<string>("recent");
  const [filterByNovel, setFilterByNovel] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [replyToComment, setReplyToComment] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<string>("");
  const pageSize = 10;

  // Fetch all novels by the author
  const { data: authorNovels, isLoading: isLoadingNovels } = useQuery<Novel[]>({
    queryKey: [`/api/novels/author/${user?.id}`],
    enabled: !!user,
  });

  // Fetch comments for the author
  const { data: allComments, isLoading: isLoadingComments } = useQuery<CommentWithMetadata[]>({
    queryKey: ["author-comments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await fetch(`/api/authors/${user.id}/comments`);
        if (!response.ok) throw new Error(`Failed to fetch comments: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching author comments:", error);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ content, chapterId, parentId }: { content: string; chapterId: number; parentId: number }) => {
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/comments`, { content, parentId });
      return await res.json();
    },
    onSuccess: (newReply) => {
      setReplyToComment(null);
      setReplyContent("");
      
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully."
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["author-comments", user?.id] });
      if (newReply?.chapterId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chapters/${newReply.chapterId}/comments`] });
      }
      const comment = allComments?.find(c => c.id === replyToComment);
      if (comment?.novel?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/novels/${comment.novel.id}/comments`] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post reply",
        variant: "destructive",
      });
    },
  });

  // Process comments to group replies with their parent comments
  const processComments = (comments: CommentWithMetadata[] | undefined): CommentWithMetadata[] => {
    try {
      if (!comments || !Array.isArray(comments)) return [];
      
      // Create a map to store all comments by ID for easy access
      const commentMap = new Map<number, CommentWithMetadata>();
      
      // First, put all comments in the map with empty replies array
      comments.forEach(comment => {
        if (comment && comment.id) {
          commentMap.set(comment.id, { ...comment, replies: [] });
        }
      });
      
      // Identify top-level comments and organize replies in a tree structure
      const topLevelComments: CommentWithMetadata[] = [];
      
      // Process each comment
      commentMap.forEach(comment => {
        // Skip invalid comments
        if (!comment || !comment.id) return;
        
        // If comment has a parent, add it to parent's replies
        if (comment.parentId) {
          const parent = commentMap.get(comment.parentId);
          if (parent && parent.replies) {
            parent.replies.push(comment);
          } else {
            // If parent not found (should not happen), treat as top-level
            topLevelComments.push(comment);
          }
        } else {
          // No parent, so it's top-level
          topLevelComments.push(comment);
        }
      });
      
      // Sort all replies by creation date (oldest first for replies)
      commentMap.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
        }
      });
      
      // Sort top-level comments by creation date (newest first)
      topLevelComments.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return topLevelComments;
    } catch (error) {
      console.error("Error processing comments:", error);
      return []; // Return empty array on error
    }
  };

  // Filter and sort comments
  const filteredComments = allComments 
    ? allComments.filter(c => filterByNovel === "all" || c.novel?.id?.toString() === filterByNovel)
    : [];
  
  const processedComments = processComments(filteredComments);
  
  const sortedComments = [...processedComments].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Sort by novel title and then chapter number
      const novelTitleA = a.novel?.title || "";
      const novelTitleB = b.novel?.title || "";
      const novelComparison = novelTitleA.localeCompare(novelTitleB);
      if (novelComparison !== 0) return novelComparison;
      
      const chapterNumA = a.chapter?.chapterNumber || 0;
      const chapterNumB = b.chapter?.chapterNumber || 0;
      return chapterNumA - chapterNumB;
    }
  });

  // Pagination
  const paginatedComments = sortedComments.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sortedComments.length / pageSize);

  // Handle reply submission
  const handleSubmitReply = (comment: CommentWithMetadata) => {
    if (!replyContent.trim()) {
      toast({
        title: "Error",
        description: "Reply cannot be empty",
        variant: "destructive",
      });
      return;
    }

    replyMutation.mutate({
      content: replyContent,
      chapterId: comment.chapterId,
      parentId: comment.id
    });
  };

  // Render a comment and its replies
  const renderComment = (comment: CommentWithMetadata, level = 0) => {
    const username = comment.user?.username || `User ${comment.userId}`;
    const avatarColor = getColorForUserId(comment.userId);
    
    // Calculate left margin based on nesting level (cap at 4 levels of indentation)
    const marginClass = level > 0 ? `ml-${Math.min(level * 4, 16)}` : '';
    
    return (
      <div key={comment.id} className={`${marginClass} border-b border-gray-100 pb-6 last:border-b-0 ${level > 0 ? 'mt-4' : ''}`}>
        <div className="flex gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={`${avatarColor} text-gray-900`}>
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-medium text-gray-900">{username}</span>
                <span className="text-sm text-gray-500 ml-2">{getTimeAgo(comment.createdAt)}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                on <Link to={`/novels/${encodeURIComponent(comment.novel?.title || '')}`} className="text-primary hover:underline">
                  {comment.novel?.title || "Unknown Novel"}
                </Link>
                <span className="mx-1">→</span>
                <span>Chapter {comment.chapter?.chapterNumber || "?"}</span>
              </div>
            </div>
            
            <p className="text-gray-700 my-3 whitespace-pre-line">{comment.content}</p>
            
            <div className="flex justify-between">
              <Button 
                variant="ghost" size="sm" className="flex items-center text-gray-500"
                onClick={() => setReplyToComment(replyToComment === comment.id ? null : comment.id)}
              >
                <Reply className="mr-1 h-4 w-4" />
                {replyToComment === comment.id ? "Cancel" : "Reply"}
              </Button>
              
              <Link to={`/chapters/${comment.chapter?.id}`}>
                <Button variant="ghost" size="sm" className="flex items-center text-gray-500">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View in chapter
                </Button>
              </Link>
            </div>
            
            {/* Reply Form */}
            {replyToComment === comment.id && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  className="min-h-[100px] mb-2 bg-white text-gray-900 border-gray-200"
                />
                <div className="flex justify-end">
                  <Button 
                    size="sm"
                    onClick={() => handleSubmitReply(comment)}
                    disabled={replyMutation.isPending}
                  >
                    {replyMutation.isPending ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Nested Replies - recursively render each reply */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map((reply) => renderComment(reply, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingNovels || isLoadingComments) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Novel Comments</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Novel Comments</h1>
      
      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-900">Filter by novel:</label>
          <Select value={filterByNovel} onValueChange={setFilterByNovel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All novels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All novels</SelectItem>
              {authorNovels?.map(novel => (
                <SelectItem key={novel.id} value={novel.id.toString()}>{novel.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-900">Sort by:</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Most recent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="novel">By novel & chapter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Comments List */}
      {paginatedComments?.length > 0 ? (
        <div className="space-y-6">
          {paginatedComments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
          <p className="text-gray-500 mb-6">When readers comment on your chapters, they'll appear here</p>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8 text-gray-900">
          <Button 
            variant="outline" size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Previous</Button>
          
          <div className="flex items-center mx-2">
            <span className="text-sm">Page {page} of {totalPages}</span>
          </div>
          
          <Button 
            variant="outline" size="sm" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next</Button>
        </div>
      )}
    </div>
  );
}

// Update NovelCard in author-dashboard.tsx - MODIFIED to add Delete button
const NovelCard = ({ novel, onEdit, onAddChapter, initialShowDrafts = false }: { 
  novel: Novel; 
  onEdit: () => void;
  onAddChapter: () => void;
  initialShowDrafts?: boolean;
}) => {
  const [showDrafts, setShowDrafts] = useState(initialShowDrafts);
  // Fetch chapters for this novel
  const { data: chapters, isLoading: isLoadingChapters } = useQuery<any[]>({
    queryKey: [`/api/novels/${novel.id}/chapters`],
    enabled: !!novel.id,
    staleTime: 1000 * 60 * 5,
  });
  // Count only published chapters
  const publishedChaptersCount = chapters ? chapters.filter((c: any) => c.status === "published").length : 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm transition">
        {/* Book cover */}
        {novel.coverImage ? (
          <img 
            src={novel.coverImage} 
            alt={`${novel.title} cover`} 
            className="w-24 h-36 object-cover rounded-md shadow-sm"
            loading="lazy"
            width="96"
            height="144"
          />
        ) : (
          <div className="w-24 h-36 bg-gray-200 flex items-center justify-center rounded-md shadow-sm">
            <Book className="text-gray-400" size={32} />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg">
                <Link to={`/novels/${encodeURIComponent(novel.title)}`} className="hover:text-primary transition">
                  {novel.title}
                </Link>
              </h3>
              {/* Removed genre tags and synopsis/description */}
              {/* Stats row below title */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-500 mb-2 mt-2">
                <div><span className="font-medium">Status:</span> <span className={novel.status === "published" ? "text-green-600" : "text-yellow-600"}>{novel.status.charAt(0).toUpperCase() + novel.status.slice(1)}</span></div>
                <div><span className="font-medium">Views:</span> {novel.viewCount}</div>
                <div><span className="font-medium">Chapters:</span> {isLoadingChapters ? "..." : publishedChaptersCount}</div>
                <div><span className="font-medium">Last Updated:</span> {new Date(novel.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Button variant="outline" size="sm" className="flex items-center" onClick={onEdit}>
              <Edit className="mr-1 h-4 w-4" /> Edit Novel
            </Button>
            <Button size="sm" className="flex items-center" onClick={onAddChapter}>
              <Plus className="mr-1 h-4 w-4" /> Add Chapter
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={() => setShowDrafts(!showDrafts)}
            >
              <FileText className="mr-1 h-4 w-4" /> 
              {showDrafts ? "Hide Drafts" : "View Drafts"}
            </Button>
            <DashboardDeleteButton 
              novelId={novel.id} 
              novelTitle={novel.title}
            />
          </div>
        </div>
      </div>
      
      {/* Drafts Panel - Shown when showDrafts is true */}
      {showDrafts && (
        <div className="ml-6 mr-2 max-h-[600px] md:max-h-[900px] overflow-y-auto">
          <DraftManager novelId={novel.id} />
        </div>
      )}
    </div>
  );
};

// Main Author Dashboard component
export default function AuthorDashboard() {
  const { user } = useAuth();
  const [locationPath, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("novels");
  
  const searchParams = locationPath.includes('?') ? locationPath.split('?')[1] : '';
  const queryParams = new URLSearchParams(searchParams);
  const showDraftsForNovelId = queryParams.get('showDraftsForNovelId');
  
  // Fetch author's novels
  const { data: novels, isLoading } = useQuery<Novel[]>({
    queryKey: [`/api/novels/author/${user?.id}`],
    enabled: !!user,
  });
  
  const tabs = [
    { id: "novels", label: "My Novels", icon: <Book className="mr-2 h-5 w-5" /> },
    { id: "comments", label: "Comments", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
    { id: "reviews", label: "Reviews", icon: <Star className="mr-2 h-5 w-5" /> },
  ];
  
  // Function to render content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case "novels":
        return (
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">My Novels</h1>
              <Link to="/author/novels/create">
                <Button className="flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Novel
                </Button>
              </Link>
            </div>
            
            {isLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-lg">
                    <Skeleton className="w-24 h-36 rounded-md" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <div className="pt-2 flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : novels && novels.length > 0 ? (
              <div className="space-y-6">
                {novels.map((novel) => (
                  <NovelCard 
                    key={novel.id} 
                    novel={novel} 
                    onEdit={() => navigate(`/author/novels/${novel.id}/edit`)}
                    onAddChapter={() => navigate(`/author/novels/${novel.id}/chapters/create`)}
                    initialShowDrafts={showDraftsForNovelId === novel.id.toString()}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Book className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No novels yet</h3>
                <p className="text-gray-500 mb-6">Start your writing journey by creating your first novel</p>
                <Link to="/author/novels/create">
                  <Button className="flex items-center mx-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Novel
                  </Button>
                </Link>
              </div>
            )}
          </div>
        );
        
      case "comments":
        return <AuthorCommentsSection />;
        
      case "reviews":
        return <AuthorReviewsSection />;
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="md:w-64 bg-white rounded-xl shadow-sm p-6 md:sticky md:top-8 md:self-start">
          <h2 className="text-xl font-bold mb-6">Author Dashboard</h2>
          
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center px-4 py-3 rounded-lg font-medium transition",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            
            <Link to="/author/novels/create">
              <button className="flex w-full items-center px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
                <BookPlus className="mr-2 h-5 w-5" />
                Create Novel
              </button>
            </Link>
          </nav>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}