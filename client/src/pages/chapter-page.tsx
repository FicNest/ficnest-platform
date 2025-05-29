// Enhanced chapter-page.tsx with typesafe copy protection
import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronDown, Bookmark } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CommentSection from "@/components/comment-section";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Chapter {
  id: number;
  novelId: number;
  title: string;
  content: string;
  chapterNumber: number;
  authorNote?: string;
  viewCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Novel {
  id: number;
  title: string;
  authorId: number;
}

interface Author {
  id: number;
  username: string;
}

export default function ChapterPage() {
  const [match, params] = useRoute("/chapters/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [novelProgress, setNovelProgress] = useState(0);
  const [isProcessingProgress, setIsProcessingProgress] = useState(false);
  
  // Add copy protection with simple effect
  useEffect(() => {
    // Function to disable context menu
    const disableContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu in inputs and textareas
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement).getAttribute('contenteditable') === 'true'
      ) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Function to disable selection
    const disableSelection = () => {
      // Add CSS to disable text selection
      const style = document.createElement('style');
      style.innerHTML = `
        .chapter-content, .reading-content {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        /* Allow text selection in form elements */
        input, textarea, [contenteditable="true"] {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        
        /* Add watermark to content */
        .reading-content::after {
          content: "${user?.username || 'FicNest'}";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 4rem;
          font-weight: bold;
          opacity: 0.05;
          pointer-events: none;
          z-index: 1;
          white-space: nowrap;
        }
      `;
      document.head.appendChild(style);
    };

    // Function to prevent keyboard shortcuts
    const disableCopyShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow shortcuts in inputs and textareas
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement).getAttribute('contenteditable') === 'true'
      ) {
        return true;
      }
      
      // Prevent Ctrl+C, Ctrl+A
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'a')) {
        e.preventDefault();
        // Show toast notification
        toast({
          title: "Copy Disabled",
          description: "Copying content is not allowed",
          variant: "destructive",
        });
        return false;
      }
    };

    // Function to prevent copy events
    const disableCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow copy in inputs and textareas
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement).getAttribute('contenteditable') === 'true'
      ) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', disableContextMenu);
    document.addEventListener('keydown', disableCopyShortcuts);
    document.addEventListener('copy', disableCopy);
    // Apply selection styles
    disableSelection();

    // Clean up
    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
      document.removeEventListener('keydown', disableCopyShortcuts);
      document.removeEventListener('copy', disableCopy);
    };
  }, [toast, user]);
  
  // Get chapterId from params
  const chapterId = match ? Number(params?.id) : 0;
  
  // Scroll to top whenever chapterId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chapterId]);
  
  // Fetch chapter data
  const { 
    data: chapter, 
    isLoading: isLoadingChapter, 
    error: chapterError 
  } = useQuery<Chapter>({
    queryKey: [`chapter-${chapterId}`], // Use stable query key
    queryFn: async () => {
      try {
        const res = await fetch(`/api/chapters/${chapterId}`);
        if (!res.ok) throw new Error("Failed to fetch chapter");
        return res.json();
      } catch (error) {
        console.error("Error fetching chapter:", error);
        throw error;
      }
    },
    enabled: !!chapterId,
    retry: 1, // Limit retries
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch novel data
  const { 
    data: novel, 
    isLoading: isLoadingNovel 
  } = useQuery<Novel>({
    queryKey: [`novel-${chapter?.novelId}`], // Use stable query key
    queryFn: async () => {
      try {
        const res = await fetch(`/api/novels/${chapter?.novelId}`);
        if (!res.ok) throw new Error("Failed to fetch novel");
        return res.json();
      } catch (error) {
        console.error("Error fetching novel:", error);
        throw error;
      }
    },
    enabled: !!chapter?.novelId,
    retry: 1, // Limit retries
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch author data
  const { 
    data: author,
    isLoading: isLoadingAuthor 
  } = useQuery<Author>({
    queryKey: [`author-${novel?.authorId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${novel?.authorId}`);
        if (!res.ok) throw new Error("Failed to fetch author");
        return res.json();
      } catch (error) {
        console.error("Error fetching author:", error);
        throw error;
      }
    },
    enabled: !!novel?.authorId,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch all chapters of the novel for navigation
  const { 
    data: chapters, 
    isLoading: isLoadingChapters 
  } = useQuery<Chapter[]>({
    queryKey: [`novel-chapters-${chapter?.novelId}`], // Use stable query key
    queryFn: async () => {
      try {
        const res = await fetch(`/api/novels/${chapter?.novelId}/chapters`);
        if (!res.ok) throw new Error("Failed to fetch chapters");
        return res.json();
      } catch (error) {
        console.error("Error fetching chapters:", error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!chapter?.novelId,
    retry: 1, // Limit retries
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Find previous and next chapters with memoization
  const { prevChapter, nextChapter } = useCallback(() => {
    if (!chapters || !chapter || !Array.isArray(chapters)) return { prevChapter: undefined, nextChapter: undefined };
    
    try {
      const currentIndex = chapters.findIndex(c => c.id === chapter.id);
      if (currentIndex === -1) return { prevChapter: undefined, nextChapter: undefined };
      
      const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : undefined;
      const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined;
      
      return { prevChapter, nextChapter };
    } catch (error) {
      console.error("Error finding prev/next chapters:", error);
      return { prevChapter: undefined, nextChapter: undefined };
    }
  }, [chapters, chapter])();
  
  // Calculate novel progress based on current chapter number and total chapters
  useEffect(() => {
    if (chapter && chapters && Array.isArray(chapters) && chapters.length > 0) {
      // Filter to only include published chapters
      const publishedChapters = chapters.filter(c => c.status === "published");
      
      if (publishedChapters.length > 0) {
        // Find the current chapter's index in the published chapters array
        const currentChapterIndex = publishedChapters.findIndex(c => c.id === chapter.id);
        
        if (currentChapterIndex !== -1) {
          // Calculate progress as (current chapter number) / (total published chapters) * 100
          // Add 1 to currentChapterIndex because array is 0-based but chapters are 1-based
          const progress = Math.round(((currentChapterIndex + 1) / publishedChapters.length) * 100);
          setNovelProgress(progress);
        }
      }
    }
  }, [chapter, chapters]);
  
  // Custom navigation function that navigates and ensures scroll to top
  const navigateToChapter = useCallback((targetChapterId: number) => {
    if (targetChapterId === chapterId) return; // Don't navigate to the same chapter
    
    // First scroll to top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto" // Using auto instead of smooth for instant navigation
    });
    
    // Then navigate to the new chapter
    navigate(`/chapters/${targetChapterId}`);
  }, [navigate, chapterId]);
  
  // Add keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed or if user is typing in an input/textarea
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if ((e.target as HTMLElement) instanceof HTMLInputElement || (e.target as HTMLElement) instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          // Navigate to previous chapter
          if (prevChapter) {
            e.preventDefault();
            navigateToChapter(prevChapter.id);
          }
          break;
        case 'ArrowRight':
          // Navigate to next chapter
          if (nextChapter) {
            e.preventDefault();
            navigateToChapter(nextChapter.id);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prevChapter, nextChapter, navigateToChapter]);
  
  // Save reading progress when chapter changes
  useEffect(() => {
    if (!chapter || !user || !novel || isProcessingProgress) return;
    
    const saveProgress = async () => {
      try {
        setIsProcessingProgress(true);
        await apiRequest("POST", "/api/reading-progress", {
          novelId: chapter.novelId,
          chapterId: chapter.id,
          progress: novelProgress, // Use novel-wide progress instead of scroll progress
        });
      } catch (error) {
        console.error("Failed to save reading progress:", error);
      } finally {
        setIsProcessingProgress(false);
      }
    };
    
    // Save progress once the novel progress is calculated
    if (novelProgress > 0) {
      // Debounce the progress updates to prevent too many requests
      const timeoutId = setTimeout(saveProgress, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [chapter, user, novel, novelProgress, isProcessingProgress]);
  
  // Also save progress when leaving the page
  useEffect(() => {
    if (!chapter || !user || !novel || novelProgress === 0) return;
    
    const saveProgressOnLeave = async () => {
      try {
        // Do not use isProcessingProgress state here to avoid complications
        await fetch("/api/reading-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            novelId: chapter.novelId,
            chapterId: chapter.id,
            progress: novelProgress, // Use novel-wide progress
          }),
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to save reading progress on leave:", error);
      }
    };
    
    // Handle page unload
    window.addEventListener("beforeunload", saveProgressOnLeave);
    
    // Handle component unmount
    return () => {
      window.removeEventListener("beforeunload", saveProgressOnLeave);
      saveProgressOnLeave();
    };
  }, [chapter, user, novel, novelProgress]);
  
  // Add draft chapter access control
  useEffect(() => {
    // Check if chapter is in draft mode and user is not the author
    if (chapter && chapter.status === "draft") {
      // First check if user is logged in
      if (!user) {
        toast({
          title: "Access denied",
          description: "This chapter is still in draft mode and not yet published.",
          variant: "destructive",
        });
        navigate(`/novels/${chapter.novelId}`);
        return;
      }
      
      // Then verify if the logged-in user is the author
      if (novel && user.id !== novel.authorId) {
        toast({
          title: "Access denied",
          description: "This chapter is still in draft mode and not yet published.",
          variant: "destructive",
        });
        navigate(`/novels/${novel.id}`);
      }
    }
  }, [chapter, novel, user, navigate, toast]);
  
  // Bookmark functionality
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!chapter?.novelId) {
        throw new Error("Novel ID is missing");
      }
      
      const res = await apiRequest("POST", "/api/bookmarks", {
        novelId: chapter.novelId,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Novel bookmarked",
        description: "You can find this novel in your bookmarks",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
  
  // Handle error state
  if (chapterError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Error loading chapter</h1>
            <p className="text-gray-600 mb-6">There was an error loading this chapter. Please try again later.</p>
            <Link to="/">
              <Button>Return to Homepage</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle loading state
  if (isLoadingChapter || isLoadingNovel || isLoadingAuthor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-6 w-40" />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
            <Skeleton className="h-8 w-3/4 mx-auto mb-6" />
            
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle missing data or unauthorized access to drafts
  if (!chapter || !novel || (chapter.status === "draft" && (!user || user.id !== novel.authorId))) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">This chapter is not available.</p>
            <Link to={novel ? `/novels/${novel.id}` : "/"}>
              <Button>Return to Novel Page</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Novel Title and Author */}
        <div className="mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              <Link to={`/novels/${novel.id}`} className="hover:text-primary">
                {novel.title}
              </Link>
            </h1>
            <p className="text-gray-600">
              by <Link to={`/authors/${novel.authorId}`} className="text-primary hover:underline">
                {author?.username || "Author"}
              </Link>
            </p>
          </div>
        </div>
        
        {/* Chapter Dropdown at the top */}
        <div className="flex justify-center mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 w-full max-w-xl">
                <span className="truncate">Chapter {chapter.chapterNumber}: {chapter.title}</span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64 max-h-80 overflow-y-auto">
              {isLoadingChapters ? (
                <div className="p-4 text-center">Loading chapters...</div>
              ) : chapters && chapters.length > 0 ? (
                chapters
                  .filter(c => c.status === "published" || (user && novel && user.id === novel.authorId))
                  .map((c) => (
                    <DropdownMenuItem key={c.id} asChild>
                      <button
                        className={`w-full text-left ${c.id === chapter.id ? 'bg-gray-100' : ''}`}
                        onClick={() => navigateToChapter(c.id)}
                      >
                        Chapter {c.chapterNumber}: {c.title}
                      </button>
                    </DropdownMenuItem>
                  ))
              ) : (
                <div className="p-4 text-center">No chapters available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Chapter Content - Now with anti-copy protection built in through CSS */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Chapter {chapter.chapterNumber}: {chapter.title}
          </h2>
          
          <div className="reading-content chapter-content text-gray-800 space-y-4 relative">
            {chapter.content.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          
          {chapter.authorNote && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Author's Note:</h3>
                <p className="text-gray-700">{chapter.authorNote}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Chapter Navigation Bottom with keyboard navigation hints */}
        <div className="flex justify-between items-center mb-8">
          <Button 
            variant="outline" 
            disabled={!prevChapter} 
            className="flex items-center"
            onClick={() => prevChapter && navigateToChapter(prevChapter.id)}
            title="Previous Chapter (Left Arrow Key)"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous Chapter
          </Button>
          
          <div className="text-xs text-gray-500 hidden sm:block">
            Use ← and → arrow keys to navigate
          </div>
          
          <Button 
            variant="outline" 
            disabled={!nextChapter} 
            className="flex items-center"
            onClick={() => nextChapter && navigateToChapter(nextChapter.id)}
            title="Next Chapter (Right Arrow Key)"
          >
            Next Chapter
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        {/* Comments Section */}
        {chapter && (
          <CommentSection chapterId={chapter.id} novelAuthorId={novel.authorId} />
        )}
      </div>
    </div>
  );
}