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
import { MessageSquare, Heart, Reply, Trash2 } from "lucide-react";
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
}

interface CommentSectionProps {
  chapterId: number;
  novelAuthorId?: number; // Optional prop to identify if current user is the novel author
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
}: {
  comment: CommentWithUser;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  novelAuthorId?: number;
  level?: number;
  maxLevel?: number;
}) {
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
          </div>
          
          <p className="text-gray-700 whitespace-pre-line">
            {comment.content}
          </p>
          
          <div className="flex items-center mt-3 text-sm">
            <button 
              className={`flex items-center ${isLiked ? 'text-primary' : 'text-gray-500 hover:text-primary'} transition mr-4`}
              onClick={handleLikeToggle}
              disabled={isLiking}
            >
              <Heart className={`mr-1 h-4 w-4 ${isLiked ? 'fill-primary' : ''}`} />
              <span>{likeCount}</span>
            </button>
            
            {currentUser && (
              <button 
                onClick={() => {
                  setShowReplyForm(!showReplyForm);
                  if (!showReplyForm) {
                    onReply(comment.id);
                  }
                }}
                className="text-gray-500 hover:text-primary transition flex items-center mr-4"
              >
                <Reply className="mr-1 h-4 w-4" />
                {showReplyForm ? "Cancel" : "Reply"}
              </button>
            )}
            
            {canDelete && (
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <button 
                    className="text-gray-500 hover:text-red-500 transition flex items-center"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your comment
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
          
          {/* Show reply form when showReplyForm is true */}
          {showReplyForm && (
            <div className="mt-4 bg-gray-50 p-3 rounded-lg">
              <CommentReplyForm commentId={comment.id} cancelReply={() => setShowReplyForm(false)} />
            </div>
          )}
          
          {/* Nested Replies with recursion */}
          {shouldRenderReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-gray-100 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  onReply={onReply}
                  onDelete={onDelete}
                  novelAuthorId={novelAuthorId}
                  level={level + 1}
                  maxLevel={maxLevel}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component for reply form to reduce complexity
function CommentReplyForm({ commentId, cancelReply }: { commentId: number, cancelReply: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chapterId, setChapterId] = useState<number | null>(null);
  
  // Get the chapter ID from the URL instead of making an API call
  useEffect(() => {
    // Extract chapter ID from the URL (assumes format: /chapters/:id)
    const pathParts = window.location.pathname.split('/');
    const chapIdIndex = pathParts.indexOf('chapters') + 1;
    
    if (chapIdIndex > 0 && chapIdIndex < pathParts.length) {
      const chapId = parseInt(pathParts[chapIdIndex]);
      if (!isNaN(chapId)) {
        setChapterId(chapId);
      }
    }
  }, []);
  
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
      replyToId: commentId
    },
  });
  
  const handleSubmitReply = async (data: CommentFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a comment.",
        variant: "destructive",
      });
      return;
    }
    
    if (!chapterId) {
      toast({
        title: "Error",
        description: "Could not determine which chapter this comment belongs to.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Post the reply with the chapter ID from the URL
      const replyData = {
        content: data.content,
        chapterId,
        parentId: commentId,
      };
      
      // Use apiRequest helper for consistent error handling
      await apiRequest("POST", `/api/chapters/${chapterId}/comments`, replyData);
      
      // Reset form and close
      form.reset();
      cancelReply();
      
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully.",
      });
      
      // Use a proper refetch instead of full page reload
      // This will trigger the query cache to update
      queryClient.invalidateQueries({ queryKey: [`comments-for-chapter-${chapterId}`] });
      
    } catch (error) {
      console.error("Error posting reply:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                  placeholder="Write your reply..."
                  className="resize-none bg-white"
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={cancelReply}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Reply"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function CommentSection({ chapterId, novelAuthorId }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replyToId, setReplyToId] = useState<number | null>(null);
  
  // Fetch comments
  const { data: commentsData, isLoading, refetch } = useQuery<CommentWithUser[]>({
    queryKey: [`comments-for-chapter-${chapterId}`],
    queryFn: async () => {
      try {
        // Fetch the comments, the backend already includes user data with ?includeUsers=true
        const res = await fetch(`/api/chapters/${chapterId}/comments?includeUsers=true`);

        // Check for error status
        if (!res.ok) {
          console.error(`Error fetching comments: ${res.status} ${res.statusText}`);
          throw new Error(`Failed to fetch comments: ${res.status}`);
        }

        // Try to parse the response as JSON
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          console.error("Error parsing comment data:", parseError);

          // Log the response text for debugging
          const responseText = await res.text();
          console.error("Response text:", responseText.substring(0, 500) + "...");

          throw new Error("Invalid response format from server");
        }

        console.log("Raw comment data from backend (should include user info):", data);

        // Validate data is an array and ensure it has user info (as per backend)
        if (!Array.isArray(data)) {
          console.error("Comments data is not an array:", data);
          return [];
        }

        // The backend should provide user data directly, so no need for separate fetches or local storage caching here.
        // Ensure each comment object has the 'user' property as expected from the backend.
        const commentsWithUser: CommentWithUser[] = data.map(comment => ({
            ...comment,
            user: comment.user || { id: comment.userId || 0, username: `User ${comment.userId || "Anonymous"}` } // Use backend provided user or fallback
        }));

        console.log("Processed comments data for rendering:", commentsWithUser);
        return commentsWithUser; // Use the data directly from the backend response

      } catch (error) {
        console.error("Error fetching comments:", error);
        return []; // Return empty array on error
      }
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1, // Don't retry too many times
  });
  
  // Add a delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Comment deleted",
        description: "The comment has been successfully deleted",
      });
      
      // Refresh comments
      refetch();
      
      // Also refresh author dashboard comments if on author dashboard
      if (user?.isAuthor) {
        queryClient.invalidateQueries({ queryKey: ["author-comments", user.id] });
      }
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
  function processComments(comments: CommentWithUser[] | undefined): CommentWithUser[] {
    try {
      if (!comments || !Array.isArray(comments)) return [];
      
      // Create a map to store all comments by ID for easy access
      const commentMap = new Map<number, CommentWithUser>();
      
      // First, put all comments in the map
      comments.forEach(comment => {
        if (comment && comment.id) {
          commentMap.set(comment.id, { ...comment, replies: [] });
        }
      });
      
      // Identify top-level comments and organize replies
      const topLevelComments: CommentWithUser[] = [];
      
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
      
      // Sort all replies by creation date (newest first for top-level, but oldest first for replies)
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
  }
  
  // Safely process comments
  const processedComments = processComments(commentsData);
  
  // Comment form for top-level comments
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: "",
    },
  });
  
  // Handle form submission
  const handleSubmitComment = async (data: CommentFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a comment.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const commentData = {
        content: data.content,
        chapterId,
        parentId: replyToId ?? undefined,
      };
      
      const res = await apiRequest("POST", `/api/chapters/${chapterId}/comments`, commentData);
      
      // Reset form and state
      form.reset();
      setReplyToId(null);
      
      // Refresh comments
      await refetch();
      
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      });
    }
  };
  
  // Handle reply
  const handleReply = (commentId: number) => {
    setReplyToId(commentId);
    // Scroll to comment form for top-level replies
    if (replyToId !== commentId) {
      setTimeout(() => {
        const replyElement = document.getElementById(`comment-${commentId}`);
        if (replyElement) {
          replyElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };
  
  // Handle delete
  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate(commentId);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <h3 className="text-xl font-bold mb-6">Comments</h3>
      
      {/* Comment Form */}
      {user ? (
        <div className="mb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitComment)} className="space-y-3">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        id="comment-input"
                        placeholder="Leave a comment..."
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit">
                  Post Comment
                </Button>
              </div>
            </form>
          </Form>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 mb-3">You need to be logged in to comment</p>
          <Link href="/auth">
            <Button>Log In</Button>
          </Link>
        </div>
      )}
      
      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex gap-4 pb-6 border-b border-gray-100">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : processedComments.length > 0 ? (
        <div className="space-y-6">
          {processedComments.map((comment) => (
            <div id={`comment-${comment.id}`} key={comment.id}>
              <CommentItem 
                comment={comment} 
                onReply={handleReply}
                onDelete={handleDeleteComment}
                novelAuthorId={novelAuthorId}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h4 className="text-lg font-medium text-gray-900">No comments yet</h4>
          <p className="text-gray-500 mt-1">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}