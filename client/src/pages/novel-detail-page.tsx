import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Novel, Chapter, Review, Bookmark, insertReviewSchema } from "@shared/schema";
import { Star, Eye, Bookmark as BookmarkIcon, Book, Trash2, Edit } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReadingProgress } from "../../../shared/schema";

type NovelWithReviews = Novel & {
  reviews: (Review & { user: { username: string } })[];
};

// Review item component with delete functionality
function ReviewItem({ 
  review, 
  onDelete,
  novelAuthorId 
}: { 
  review: Review & { user: { username: string } }; 
  onDelete: (reviewId: number) => void;
  novelAuthorId: number;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user: currentUser } = useAuth();
  
  // Check if current user is authorized to delete this review
  const canDelete = useMemo(() => {
    if (!currentUser) return false;
    
    // User can delete their own reviews
    if (currentUser.id === review.userId) return true;
    
    // Novel author can delete any review on their novel
    if (currentUser.id === novelAuthorId) return true;
    
    return false;
  }, [currentUser, review, novelAuthorId]);
  
  // Handle delete action
  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete(review.id);
  };
  
  return (
    <div className="border-b border-gray-100 pb-6 last:border-0">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="font-medium text-gray-600">
              {review.user?.username ? review.user.username.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div>
            <div className="font-medium">{review.user?.username || `User ${review.userId}`}</div>
            <div className="text-sm text-gray-500">
              {new Date(review.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                }`}
              />
            ))}
          </div>
          
          {canDelete && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <button 
                  className="ml-2 text-gray-400 hover:text-red-500"
                  aria-label="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Review</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this review
                    and remove it from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <p className="text-gray-700 whitespace-pre-line">{review.content}</p>
    </div>
  );
}

// Chapter item with delete button component
function ChapterItem({
  chapter,
  isAuthor,
  onDelete,
  novelTitle,
}: {
  chapter: Chapter;
  isAuthor: boolean;
  onDelete: (chapterId: number) => void;
  novelTitle: string;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete(chapter.id);
  };

  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition gap-3 md:gap-0">
      <div>
        <Link to={`/novels/${encodeURIComponent(novelTitle)}/chapters/${chapter.chapterNumber}`} className="font-medium hover:text-primary transition">
          <span>Chapter {chapter.chapterNumber}:</span> <span>{chapter.title}</span>
        </Link>
        <div className="text-sm text-gray-500 mt-1">
          <span>{new Date(chapter.publishedAt || chapter.createdAt).toLocaleDateString()}</span> · 
          <span>{Math.ceil(chapter.content.length / 1000)} min read</span>
        </div>
      </div>
      <div className="flex items-center gap-4 md:justify-end">
        <div className="flex items-center text-gray-500 text-sm">
          <Eye className="mr-1 h-4 w-4" />
          <span>{chapter.viewCount || 0}</span>
        </div>
        
        {isAuthor && (
          <>
            <Link to={`/author/novels/${chapter.novelId}/chapters/edit/${chapter.chapterNumber}?returnTo=${encodeURIComponent(window.location.pathname)}`}>
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Chapter</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this chapter? This action cannot be undone and the chapter will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

export default function NovelDetailPage() {
  const [match, params] = useRoute("/novels/:novelName");
  const { user } = useAuth();
  const { toast } = useToast();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // State for current page
  const chaptersPerPage = 50; // Chapters per page
  
  // Get the novel name from params
  const novelName = match ? params?.novelName : '';
  
  // Fetch novel details by name
  const { data: novel, isLoading: isLoadingNovel } = useQuery<NovelWithReviews>({
    queryKey: [`/api/novels/name/${novelName}`],
    queryFn: async () => {
      const res = await fetch(`/api/novels/name/${novelName}`);
      if (!res.ok) throw new Error("Failed to fetch novel");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch author information
  interface Author {
  id: number;
  username: string;
}
  const { data: author } = useQuery<Author>({
    queryKey: [`/api/users/${novel?.authorId}`],
    enabled: !!novel?.authorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch chapters separately
  const { data: chapters, isLoading: isLoadingChapters } = useQuery<Chapter[]>({
    queryKey: [`/api/novels/${novel?.id}/chapters`],
    enabled: !!novel?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Check if user has bookmarked this novel
  const { data: bookmarkStatus } = useQuery<Bookmark | null>({
    queryKey: [`/api/bookmarks/${novel?.id}`],
    enabled: !!user,
  });
  const { data: readingHistory } = useQuery<ReadingProgress | null>({
    queryKey: [`/api/novels/${novel?.id}/reading-history`],
    enabled: !!user && !!novel?.id,
  });
  
  // Toggle bookmark
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (bookmarkStatus) {
        await apiRequest("DELETE", `/api/bookmarks/${novel?.id}`);
        return null;
      } else {
        const res = await apiRequest("POST", "/api/bookmarks", { novelId: novel?.id });
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookmarks/${novel?.id}`] });
      toast({
        title: bookmarkStatus ? "Bookmark removed" : "Novel bookmarked",
        description: bookmarkStatus 
          ? "This novel has been removed from your bookmarks" 
          : "This novel has been added to your bookmarks",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get user's review if exists
  const { data: userReview } = useQuery<Review>({
    queryKey: [`/api/novels/${novel?.id}/reviews/user`],
    enabled: !!user,
  });
  
  // Review submission
  const reviewSchema = insertReviewSchema.pick({
    content: true,
    rating: true,
  });
  
  type ReviewFormValues = z.infer<typeof reviewSchema>;
  
  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      content: userReview?.content || "",
      rating: userReview?.rating || 5,
    },
  });
  
  const reviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const res = await apiRequest("POST", `/api/novels/${novel?.id}/reviews`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novel?.id}`] });
      setIsReviewDialogOpen(false);
      toast({
        title: userReview ? "Review updated" : "Review submitted",
        description: "Thank you for sharing your thoughts!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      return await apiRequest("DELETE", `/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novel?.id}`] });
      toast({
        title: "Review deleted",
        description: "The review has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete review",
        variant: "destructive",
      });
    },
  });
  
  const onSubmitReview = (data: ReviewFormValues) => {
    reviewMutation.mutate(data);
  };

  // Handle review deletion
  const handleDeleteReview = (reviewId: number) => {
    deleteReviewMutation.mutate(reviewId);
  };
  
  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      await apiRequest("DELETE", `/api/chapters/${chapterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novel?.id}/chapters`] });
      toast({
        title: "Chapter deleted",
        description: "The chapter has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete chapter",
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteChapter = (chapterId: number) => {
    deleteChapterMutation.mutate(chapterId);
  };
  
  // Check if the current user is the author of the novel
  const isAuthor = useMemo(() => {
    return user && novel && user.id === novel.authorId;
  }, [user, novel]);
  
  // Filter and sort chapters to display published chapters in order
  const publishedChapters = useMemo(() => {
    if (!chapters) return [];
    return chapters
      .filter(chapter => chapter.status === "published")
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [chapters]);
  
  // Pagination logic
  const indexOfLastChapter = currentPage * chaptersPerPage;
  const indexOfFirstChapter = indexOfLastChapter - chaptersPerPage;
  const currentChapters = publishedChapters.slice(indexOfFirstChapter, indexOfLastChapter);
  const totalPages = Math.ceil(publishedChapters.length / chaptersPerPage);

  const isLoading = isLoadingNovel || isLoadingChapters;
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <Skeleton className="w-48 md:w-56 h-72 rounded-lg" />
              
              <div className="flex-1 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-32 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!novel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Novel not found</h1>
          <p className="text-gray-600 mb-6">The novel you're looking for doesn't exist or has been removed.</p>
          <Link to="/">
            <Button>Return to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Calculate average rating
  const averageRating = novel.reviews && novel.reviews.length > 0
    ? novel.reviews.reduce((sum, review) => sum + review.rating, 0) / novel.reviews.length 
    : 0;
  
  // Find first chapter for the Start Reading button
  const firstChapter = chapters && chapters.length > 0 ? chapters[0] : null;
  const lastReadChapter = readingHistory ? chapters?.find(c => c.id === readingHistory.chapterId) : null;
  const startChapter = lastReadChapter || firstChapter;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Book cover */}
            {novel.coverImage ? (
              <img 
                src={novel.coverImage}
                alt={`${novel.title} cover`} 
                className="w-48 md:w-56 h-auto object-cover rounded-lg shadow-md"
                loading="lazy"
                width="224"
                height="336"
              />
            ) : (
              <div className="w-48 md:w-56 h-auto aspect-[2/3] bg-gray-200 rounded-lg shadow-md flex items-center justify-center">
                <Book className="text-gray-400" size={48} />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{novel.title}</h1>
              <p className="text-gray-600 mb-4">
                by <Link to={`/authors/${encodeURIComponent(author?.username || '')}`} className="text-primary hover:underline">
                  {author?.username || "Unknown Author"}
                </Link>
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {novel.genres && novel.genres.map((genre, index) => (
                  <Link key={index} to={`/genre/${genre.toLowerCase()}`} className="bg-primary-light/20 text-primary-dark text-sm py-1 px-3 rounded-full">
                    {genre}
                  </Link>
                ))}
              </div>
              
              <div className="flex items-center gap-2 mb-6 text-gray-600">
                <div className="flex items-center">
                  <Eye className="mr-1 h-4 w-4" />
                  <span className="text-base">{novel.viewCount ? novel.viewCount.toLocaleString() : 0}</span> Reads
                </div>
                <div className="flex items-center">
                  <BookmarkIcon className="mr-1 h-4 w-4" />
                  <span className="text-base">{novel.bookmarkCount ? novel.bookmarkCount.toLocaleString() : 0}</span> Bookmarks
                </div>
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 text-yellow-500" />
                  <span className="inline-flex items-baseline gap-1 text-base">
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-500 text-xs">
                      ({novel.reviews && novel.reviews.length ? novel.reviews.length : 0} {novel.reviews && novel.reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Synopsis</h3>
                <div className="h-40 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-line">{novel.description}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {startChapter && (
                  <Link to={`/novels/${encodeURIComponent(novel.title)}/chapters/${startChapter.chapterNumber}`}>
                    <Button>
                      {readingHistory ? "Continue Reading" : "Start Reading"}
                    </Button>
                  </Link>
                )}
                
                {user && (
                  <Button
                    variant={bookmarkStatus ? "secondary" : "outline"}
                    onClick={() => bookmarkMutation.mutate()}
                    disabled={bookmarkMutation.isPending}
                  >
                    <BookmarkIcon className="mr-2 h-5 w-5" />
                    {bookmarkStatus ? "Bookmarked" : "Bookmark"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Chapters List */}
        <div className="border-t border-gray-100 p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6">Chapters</h2>
          
          {!chapters || chapters.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No chapters available yet.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] md:max-h-[900px] overflow-y-auto pr-1">
              {currentChapters.map((chapter) => (
                <ChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  isAuthor={!!isAuthor}
                  onDelete={handleDeleteChapter}
                  novelTitle={novel.title}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous Page
              </Button>
              <div className="flex items-center mx-2">
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next Page
              </Button>
            </div>
          )}
        </div>
        
        {/* Reviews Section */}
        <div className="border-t border-gray-100 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Reviews</h2>
            {user && (
              <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    {userReview ? "Edit Your Review" : "Write a Review"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{userReview ? "Edit Your Review" : "Write a Review"}</DialogTitle>
                    <DialogDescription>
                      Share your thoughts about "{novel.title}"
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...reviewForm}>
                    <form onSubmit={reviewForm.handleSubmit(onSubmitReview)} className="space-y-4">
                      <FormField
                        control={reviewForm.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rating</FormLabel>
                            <FormControl>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => field.onChange(rating)}
                                    className="focus:outline-none"
                                  >
                                    <Star
                                      className={`h-6 w-6 ${
                                        rating <= field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={reviewForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Review</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Write your thoughts about this novel..." 
                                className="min-h-[150px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={reviewMutation.isPending}
                        >
                          {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {/* Review summary with rating stars */}
          {novel.reviews && novel.reviews.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-6 text-center sm:text-left">
              <div className="flex justify-center sm:justify-start">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${
                      i < Math.round(averageRating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="inline-flex items-baseline gap-1">
                <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">
                  ({novel.reviews.length} {novel.reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </span>
            </div>
          )}
          
          {/* Reviews list */}
          {!novel.reviews || novel.reviews.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No reviews yet. Be the first to review this novel!
            </div>
          ) : (
            <div className="space-y-6">
              {novel.reviews.map((review) => (
                <ReviewItem 
                  key={review.id} 
                  review={review} 
                  onDelete={handleDeleteReview}
                  novelAuthorId={novel.authorId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}