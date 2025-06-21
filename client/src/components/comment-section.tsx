// Complete implementation of comment-section.tsx with delete functionality
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Comment } from "@shared/schema"; 
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Heart, Reply, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
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

// Define a custom interface for comments with user information and replies
interface CommentWithUser extends Comment {
  user?: {
    id: number;
    username: string;
  };
  replies?: CommentWithUser[];
  // Add novel and chapter properties as expected from the backend structure
  novel?: {
    id: number; // Assuming novel object has an id
    title: string;
  };
  chapter?: {
    id?: number; // Assuming chapter object might have an id, but novelId and chapterNumber are used for navigation
    novelId: number; // Include novelId for linking back to chapter
    chapterNumber: number; // Include chapterNumber for linking back to chapter
  };
}

interface CommentSectionProps {
  novelId: number;
  chapterNumber: number;
  novelAuthorId?: number; // Optional prop to identify if current user is the novel author
  isAuthorDashboard?: boolean; // New prop to indicate if in author dashboard
  chapterId?: number; // Add chapterId prop
}

// Define a comment schema
const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  replyToId: z.number().optional(),
});

type CommentFormValues = z.infer<typeof commentSchema>;

// Helper function to get initials
function getInitials(name: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

// Helper function to get a color based on user ID
function getColorForUserId(userId: number): string {
  const colors = [
    "bg-blue-500", 
    "bg-green-500", 
    "bg-purple-500",
    "bg-pink-500", 
    "bg-yellow-500", 
    "bg-red-500",
    "bg-indigo-500", 
    "bg-teal-500", 
    "bg-orange-500"
  ];
  
  return colors[userId % colors.length];
}

// Calculate time ago helper function
function getTimeAgo(dateStr: string | Date | undefined) {
  if (!dateStr) return "recently";
  
  try {
    const now = new Date();
    const commentDate = new Date(dateStr);
    const diffMs = now.getTime() - commentDate.getTime();
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
}

// Recursive comment component that can handle nested replies
function CommentItem({
  comment,
  onReply,
  onDelete,
  novelAuthorId,
  level = 0, // Track nesting level
  maxLevel = 5, // Limit nesting to prevent excessive depth
  isAuthorDashboard,
  chapterId,
}: {
  comment: CommentWithUser;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  novelAuthorId?: number;
  level?: number;
  maxLevel?: number;
  isAuthorDashboard?: boolean;
  chapterId?: number;
}) {
  const [showReplies, setShowReplies] = useState(false); // State to control visibility of nested replies
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  // Check if current user is the author of this comment or the novel author
  const canDelete = useMemo(() => {
    if (!currentUser) return false;
    
    // User can always delete their own comments
    if (currentUser.id === comment.userId) return true;
    
    // Novel author can delete any comment on their novel
    if (novelAuthorId && currentUser.id === novelAuthorId) return true;
    
    return false;
  }, [currentUser, comment, novelAuthorId]);
  
  // Check if the current user has liked this comment
  useQuery({
    queryKey: [`comment-${comment.id}-liked`, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      
      try {
        const res = await fetch(`/api/comments/${comment.id}/liked`);
        if (!res.ok) throw new Error("Failed to check like status");
        
        const data = await res.json();
        setIsLiked(data.liked);
        return data;
      } catch (error) {
        console.error("Error checking like status:", error);
        return null;
      }
    },
    enabled: !!currentUser,
  });
  
  // Handle like/unlike
  const handleLikeToggle = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to like comments",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLiking(true);
      
      const res = await fetch(`/api/comments/${comment.id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to process like");
      
      const data = await res.json();
      
      // Update UI optimistically
      setIsLiked(data.liked);
      setLikeCount(data.likes);
      
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to process like action",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };
  
  // Handle delete action
  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete(comment.id);
  };
  
  // Get the color based on userId for consistent colors per user
  const avatarColor = getColorForUserId(comment.userId || 0);
  
  // Calculate indentation based on nesting level
  const indentClass = level > 0 ? `ml-${Math.min(level * 6, 12)}` : '';
  
  // Determine if we should continue rendering nested replies or stop at max level
  const shouldRenderReplies = level < maxLevel;
  
  // Determine username to display
  const username = comment.user?.username || `User ${comment.userId || "Anonymous"}`;
  
  return (
    <div className={`border-b border-gray-100 pb-6 last:border-0 ${indentClass}`}>
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className={`${avatarColor} text-white`}>
            {getInitials(username)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex justify-between mb-2">
            <div>
              <span className="font-medium text-gray-900">
                {username}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {getTimeAgo(comment.createdAt)}
              </span>
            </div>
            
            {/* Link to novel and chapter - Only show in Author Dashboard */}
            {isAuthorDashboard && comment.novel?.id && comment.chapter?.chapterNumber && (
              <div className="text-sm text-gray-600">
                on <Link to={`/novels/${encodeURIComponent(comment.novel?.title || '')}`} className="text-primary hover:underline">
                  {comment.novel?.title || "Unknown Novel"}
                </Link>
                <span className="mx-1">→</span>
                <span>Chapter {comment.chapter?.chapterNumber || "?"}</span>
              </div>
            )}
          </div>
          
          <p className="text-gray-700 my-3 whitespace-pre-line">{comment.content}</p>
          
          {/* Actions: Reply, View in Chapter, Delete */}
          <div className="flex justify-between">
            {/* Reply Button */}
            <Button 
              variant="ghost" size="sm" className="flex items-center text-gray-500"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <Reply className="mr-1 h-4 w-4" />
              {showReplyForm ? "Cancel" : "Reply"}
            </Button>
            
            {/* Toggle Replies Button */}
            {comment.replies && comment.replies.length > 0 && (
              <Button 
                variant="ghost" size="sm" className="flex items-center text-gray-500"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? `Hide ${comment.replies.length} Replies` : `Show ${comment.replies.length} Replies`}
              </Button>
            )}
            
            {/* View in Chapter Button (Optional Link) */}
            {comment.chapter?.novelId && comment.chapter?.chapterNumber && (
              <Link to={`/novels/${encodeURIComponent(comment.novel?.title || '')}/chapters/${comment.chapter.chapterNumber}`}>
                <Button variant="ghost" size="sm" className="flex items-center text-gray-500">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View in chapter
                </Button>
              </Link>
            )}
            
            {/* Delete Button */}
            {canDelete && (
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center text-red-500">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this comment.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {/* Reply Form */}
          {showReplyForm && chapterId && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <CommentReplyForm commentId={comment.id} cancelReply={() => setShowReplyForm(false)} chapterId={chapterId} />
            </div>
          )}
          
          {/* Nested Replies - recursively render each reply (if level is within maxLevel)*/}
          {shouldRenderReplies && showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies
                .filter(reply => typeof reply.chapterId === 'number')
                .map((reply) => (
                 // Pass the correct props, including novelAuthorId and chapterId
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  onReply={onReply} // Pass the original onReply handler down
                  onDelete={onDelete} // Pass the original onDelete handler down
                  novelAuthorId={novelAuthorId}
                  level={level + 1}
                  maxLevel={maxLevel}
                  isAuthorDashboard={isAuthorDashboard}
                  chapterId={reply.chapterId} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reply Form Component
function CommentReplyForm({ commentId, cancelReply, chapterId }: { commentId: number, cancelReply: () => void, chapterId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      replyToId: commentId,
    },
  });
  
  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (data: CommentFormValues & { chapterId: number }) => {
      // Here, you might need to adjust the API endpoint or body based on how replies are handled
      // Assuming your backend expects parentId for replies
      const res = await apiRequest("POST", `/api/chapters/${data.chapterId}/comments`, { // Corrected endpoint
        content: data.content,
        parentId: data.replyToId, // Use replyToId as parentId
        // You might also need to pass the chapterId and novelId here
        // Based on the error in chapter-page.tsx, the CommentSection receives novelId and chapterNumber
        // We need to get the chapterId for the reply. This might require fetching the comment first
        // or passing chapterId down from CommentSection.
        // Let's assume for now we need to fetch the comment to get chapterId
        // A better approach would be to pass chapterId as a prop to CommentReplyForm
        // For now, let's proceed assuming we can get chapterId from commentId via backend if needed
        // Or let's update the CommentReplyForm props to include chapterId
      });
      
      return await res.json();
    },
    onSuccess: () => {
      form.reset();
      cancelReply();
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully.",
      });
      // Invalidate comments query for the specific chapter to refresh the list
      queryClient.invalidateQueries({ queryKey: [`chapter-${chapterId}-comments`] });
    },
    onError: (error) => {
      // Check if the error is due to the max reply depth limit
      const errorMessage = error instanceof Error ? error.message : "Failed to post reply";
      if (errorMessage.includes("Maximum reply depth of 5 reached for this comment chain.")) {
        toast({
          title: "Reply Depth Reached",
          description: "We've gone soo deep, we found bottom of the internet. Time to start fresh. PS: start a new reply",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });
  
  const handleSubmitReply = async (data: CommentFormValues) => {
    // Before sending, check if content is not just whitespace
    if (!data.content.trim()) {
      toast({
        title: "Error",
        description: "Reply cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    // Pass chapterId along with other data to the mutation
    replyMutation.mutate({ ...data, chapterId });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmitReply)} className="space-y-2">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea 
                  placeholder="Write a reply..." 
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={cancelReply}>Cancel</Button>
          <Button type="submit" size="sm" disabled={replyMutation.isPending}>
            {replyMutation.isPending ? "Posting..." : "Post Reply"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Main Comment Section Component
export default function CommentSection({ novelId, chapterNumber, novelAuthorId, isAuthorDashboard, chapterId }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Fetch comments for the specific chapter using novelId and chapterNumber
  const { data: comments, isLoading: isLoadingComments, error: commentsError, refetch: refetchComments } = useQuery<CommentWithUser[]>({
    queryKey: [`chapter-${chapterId}-comments`], // Use chapterId in query key
    queryFn: async () => {
      console.log("Fetching comments for chapter:", { novelId, chapterNumber, chapterId });
      if (!chapterId) {
        console.warn("chapterId not available, skipping comments fetch.");
        return [];
      }
      try {
        // Corrected fetch URL to use chapterId
        const res = await fetch(`/api/chapters/${chapterId}/comments`);
        if (!res.ok) throw new Error("Failed to fetch comments");
        
        const data = await res.json();
        // Assuming the backend returns comments that might have nested replies
        // The structure should match CommentWithUser
        return data;
      } catch (error) {
        console.error("Error fetching comments:", error);
        throw error; // Re-throw to let react-query handle it
      }
    },
    enabled: !!chapterId, // Only fetch if chapterId is available
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Mutation to add a new top-level comment
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      // Adjust the API endpoint and body to use chapterId
      if (!chapterId) throw new Error("Cannot post comment without chapterId");
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/comments`, { content });
      return await res.json();
    },
    onSuccess: () => {
      setShowCommentForm(false);
      form.reset();
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
      // Invalidate comments query to refresh the list for the specific chapter
      queryClient.invalidateQueries({ queryKey: [`chapter-${chapterId}-comments`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      // Adjust the API endpoint for deleting a comment using its ID
      const res = await apiRequest("DELETE", `/api/comments/${commentId}`);
      if (!res.ok) throw new Error("Failed to delete comment");
    },
    onSuccess: () => {
      toast({
        title: "Comment deleted",
        description: "The comment has been successfully deleted.",
      });
      // Invalidate comments query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`chapter-${chapterId}-comments`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment",
        variant: "destructive",
      });
    },
  });
  
  // Process comments to group replies with their parent comments
  // This function is crucial for displaying nested comments
  const processComments = useCallback((comments: CommentWithUser[] | undefined): CommentWithUser[] => {
    if (!comments || comments.length === 0) return [];

    const commentMap = new Map<number, CommentWithUser>();
    const topLevelComments: CommentWithUser[] = [];

    // Initialize map and identify top-level comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build the reply tree
    commentMap.forEach(comment => {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        // If comment has a parent in the map, add it as a reply
        const parent = commentMap.get(comment.parentId);
        parent?.replies?.push(comment);
      } else {
        // Otherwise, it's a top-level comment
        topLevelComments.push(comment);
      }
    });

    // Sort top-level comments by creation date (newest first)
    topLevelComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Optionally, sort replies by creation date (oldest first)
    commentMap.forEach(comment => {
      comment.replies?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return topLevelComments;
  }, []); // Depend on nothing as the logic is self-contained

  // Memoize the processed comments to avoid unnecessary re-renders
  const processedAndNestedComments = useMemo(() => processComments(comments), [comments, processComments]);

  // Comment form using react-hook-form
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      replyToId: undefined, // Default to no parent
    },
  });

  // Handle top-level comment submission
  const handleSubmitComment = async (data: CommentFormValues) => {
     // Before sending, check if content is not just whitespace
     if (!data.content.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    addCommentMutation.mutate(data.content);
  };
  
  // Handle reply click (opens reply form for a specific comment)
  const handleReply = (commentId: number) => {
    // This function might not be needed anymore as the reply form is now nested
    // within the CommentItem component and manages its own visibility.
    // Keeping it for now in case there's external reply triggering.
    console.log("Reply clicked for comment ID:", commentId);
  };
  
  // Handle delete comment action
  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate(commentId);
  };

  if (isLoadingComments) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-bold mb-6">Comments</h2>
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-40 w-full" />
        <div className="space-y-6 mt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (commentsError) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-sm p-8 text-center">
        <h2 className="text-2xl font-bold mb-6">Comments</h2>
        <p className="text-red-500">Failed to load comments.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm p-8">
      <h2 className="text-2xl font-bold mb-6">Comments</h2>
      
      {/* New Comment Form */}
      {user ? (
        <div className="mb-8">
          <Button 
            variant="outline" 
            className="mb-4 w-full"
            onClick={() => setShowCommentForm(!showCommentForm)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {showCommentForm ? "Cancel Comment" : "Add a Comment"}
          </Button>
          
          {showCommentForm && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitComment)} className="space-y-4">
                 <FormField
                   control={form.control}
                   name="content"
                   render={({ field }) => (
                     <FormItem>
                       <FormControl>
                         <Textarea 
                           placeholder="Write your comment..." 
                           className="min-h-[150px]"
                           {...field}
                         />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <div className="flex justify-end">
                   <Button type="submit" disabled={addCommentMutation.isPending}>
                     {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                   </Button>
                 </div>
              </form>
            </Form>
          )}
        </div>
      ) : (
        <div className="text-center py-6 mb-8 border-b border-gray-100">
          <p className="text-gray-600">Please log in to leave a comment.</p>
        </div>
      )}
      
      {/* Comments List */}
      {processedAndNestedComments && processedAndNestedComments.length > 0 ? (
        <div className="space-y-6">
          {processedAndNestedComments
            .filter(comment => comment.chapterId !== undefined)
            .map(comment => (
            // Render top-level comments using the recursive CommentItem
            <CommentItem 
              key={comment.id} // Use comment.id for key as it's unique for comments
              comment={comment} 
              onReply={handleReply} // This might not be used anymore, see handleReply function
              onDelete={handleDeleteComment} // Pass the delete handler
              novelAuthorId={novelAuthorId}
              isAuthorDashboard={isAuthorDashboard} // Pass the new prop down
              chapterId={comment.chapterId as number} 
            />
          ))}
        </div>
      ) : comments && comments.length === 0 && !isLoadingComments ? (
         <div className="text-center py-6">
           <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
           <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
           <p className="text-gray-500">Be the first to leave a comment!</p>
         </div>
      ) : null}  
    </div>
  );
}