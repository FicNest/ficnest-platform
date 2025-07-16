// Enhanced chapter-page.tsx with typesafe copy protection
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Chapter, Novel, User } from "@shared/schema";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the URL route pattern to match both novelName and chapterNumber
const chapterRoute = "/novels/:novelName/chapters/:chapterNumber";

export default function ChapterPage() {
  const [match, params] = useRoute(chapterRoute);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [novelProgress, setNovelProgress] = useState(0);
  const [isProcessingProgress, setIsProcessingProgress] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Georgia, serif");
  const [showFontPanel, setShowFontPanel] = useState(false);
  const fontPanelRef = useRef<HTMLDivElement>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const bannerAdRef = useRef<HTMLDivElement>(null);
  
  // Font options with their display names and CSS values
  const fontOptions = [
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Times New Roman", value: "'Times New Roman', serif" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Helvetica", value: "Helvetica, sans-serif" },
    { name: "Courier New", value: "'Courier New', monospace" },
    { name: "Garamond", value: "Garamond, serif" },
    { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { name: "Palatino", value: "Palatino, serif" },
    { name: "Bookman", value: "Bookman, serif" }
  ];
  
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
        /*
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
        */
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
  
  // Get the novel name and chapter number from params
  const novelName = match ? params?.novelName : '';
  const chapterNumber = match ? Number(params?.chapterNumber) : 0;
  
  // Fetch novel data by name
  const { 
    data: novel, 
    isLoading: isLoadingNovel 
  } = useQuery<Novel>({
    queryKey: [`novel-name-${novelName}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/novels/name/${novelName}`);
        if (!res.ok) throw new Error("Failed to fetch novel");
        return res.json();
      } catch (error) {
        console.error("Error fetching novel:", error);
        throw error;
      }
    },
    enabled: !!novelName,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch chapter data
  const { 
    data: chapter, 
    isLoading: isLoadingChapter, 
    error: chapterError 
  } = useQuery<Chapter>({
    queryKey: [`novel-${novel?.id}-chapter-${chapterNumber}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/novels/${novel?.id}/chapters/${chapterNumber}`);
        if (!res.ok) throw new Error("Failed to fetch chapter");
        return res.json();
      } catch (error) {
        console.error("Error fetching chapter:", error);
        throw error;
      }
    },
    enabled: !!novel?.id && !!chapterNumber,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
  
  // Fetch author data
  const { 
    data: author,
    isLoading: isLoadingAuthor 
  } = useQuery<User>({
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
    queryKey: [`novel-chapters-${novel?.id}`], // Use stable query key
    queryFn: async () => {
      try {
        const res = await fetch(`/api/novels/${novel?.id}/chapters`);
        if (!res.ok) throw new Error("Failed to fetch chapters");
        return res.json();
      } catch (error) {
        console.error("Error fetching chapters:", error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!novel?.id,
    retry: 1, // Limit retries
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Log fetched data
  console.log("ChapterPage - Fetched Data:", { chapter, chapters });
  
  // Find previous and next chapters with memoization
  const { prevChapter, nextChapter } = useCallback(() => {
    // Log data within useCallback
    const novelId = novel?.id;
    console.log("useCallback - Data:", { 
      chapters, 
      chapter, 
      novelId, 
      chapterNumber 
    });

    if (!chapters || !chapter || !Array.isArray(chapters)) {
      console.log("useCallback - Missing data, returning undefined");
      return { prevChapter: undefined, nextChapter: undefined };
    }
    
    try {
      // Find the index based on chapterNumber, as ID is no longer reliable for order after migration
      const currentIndex = chapters.findIndex(c => c.novelId === novel?.id && c.chapterNumber === chapterNumber);
      console.log("useCallback - currentIndex:", currentIndex);

      if (currentIndex === -1) {
        console.log("useCallback - Current chapter not found in chapters list");
        return { prevChapter: undefined, nextChapter: undefined };
      }
      
      const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : undefined;
      const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined;
      
      console.log("useCallback - prevChapter:", prevChapter);
      console.log("useCallback - nextChapter:", nextChapter);

      return { prevChapter, nextChapter };
    } catch (error) {
      console.error("useCallback - Error finding prev/next chapters:", error);
      return { prevChapter: undefined, nextChapter: undefined };
    }
  }, [chapters, chapter, novel?.id, chapterNumber])();
  
  // Calculate novel progress based on current chapter number and total chapters
  useEffect(() => {
    if (chapter && chapters && Array.isArray(chapters) && chapters.length > 0) {
      // Filter to only include published chapters
      const publishedChapters = chapters.filter(c => c.status === "published");
      
      if (publishedChapters.length > 0) {
        // Find the current chapter's index in the published chapters array
        const currentChapterIndex = publishedChapters.findIndex(c => c.novelId === novel?.id && c.chapterNumber === chapterNumber);
        
        if (currentChapterIndex !== -1) {
          // Calculate progress as (current chapter number) / (total published chapters) * 100
          // Add 1 to currentChapterIndex because array is 0-based but chapters are 1-based
          const progress = Math.round((chapter.chapterNumber / publishedChapters.length) * 100);
          setNovelProgress(progress);
        }
      }
    }
  }, [chapter, chapters, novel?.id, chapterNumber]);
  
  // Function to navigate to a specific chapter using its novel name and chapterNumber
  const navigateToChapter = useCallback((targetChapterNumber: number) => {
    if (novel) {
      navigate(`/novels/${novelName}/chapters/${targetChapterNumber}`);
    }
  }, [navigate, novelName, novel]);
  
  // Keyboard navigation for chapters
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't navigate if typing in an input field
      }
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      
      switch (event.key) {
        case "ArrowRight": // Next chapter
          if (nextChapter) {
            navigateToChapter(nextChapter.chapterNumber);
          }
          break;
        case "ArrowLeft": // Previous chapter
          if (prevChapter) {
            navigateToChapter(prevChapter.chapterNumber);
          }
          break;
      }
    };
    
    document.addEventListener("keydown", handleKeyPress);
    
    // Clean up event listener
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [prevChapter, nextChapter, navigateToChapter]);
  
  // Save reading progress when chapter changes
  useEffect(() => {
    if (!chapter || !user || !novel || isProcessingProgress) return;
    
    const saveProgress = async () => {
      try {
        setIsProcessingProgress(true);
        await apiRequest("POST", "/api/reading-progress", {
          novelId: novel.id,
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
            novelId: novel.id,
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
        // Add a check for novel before navigating
        if (novel) {
          navigate(`/novels/${novel.id}`);
        }
        return;
      }
      
      // Then verify if the logged-in user is the author
      if (novel && user.id !== novel.authorId) {
        toast({
          title: "Access denied",
          description: "This chapter is still in draft mode and not yet published.",
          variant: "destructive",
        });
        // Add a check for novel before navigating
        if (novel) {
          navigate(`/novels/${novel.id}`);
        }
      }
    }
  }, [chapter, novel, user, navigate, toast]);
  
  // Bookmark functionality
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!novel?.id) {
        throw new Error("Novel ID is missing");
      }
      
      const res = await apiRequest("POST", "/api/bookmarks", {
        novelId: novel.id,
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
  
  // Function to reset the auto-hide timer
  const resetAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    if (showFontPanel) {
      autoHideTimerRef.current = setTimeout(() => {
        setShowFontPanel(false);
      }, 2000);
    }
  };

  // Handle click on reading content
  const handleReadingContentClick = (e: React.MouseEvent) => {
    // Don't show panel if clicking on navigation buttons or other interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, select, [role="slider"], [role="option"]')) {
      return;
    }
    setShowFontPanel(prev => !prev);
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the panel or its controls
      if (fontPanelRef.current && 
          (fontPanelRef.current.contains(e.target as Node) || 
           (e.target as HTMLElement).closest('[role="slider"], [role="option"]'))) {
        return;
      }
      setShowFontPanel(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Set up auto-hide timer
  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [showFontPanel]);
  
  // Prevent panel from closing when interacting with controls
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetAutoHideTimer();
  };
  
  // Handle font size change
  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
    resetAutoHideTimer();
  };

  // Handle font family change
  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    resetAutoHideTimer();
  };

  // Inject Vignette Banner Ad script
  useEffect(() => {
    if (bannerAdRef.current) bannerAdRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.innerHTML = `
      (function(d,z,s,c){
        s.src='//oamoameevee.net/400/9574214';
        s.onerror=s.onload=E;
        function E(){c&&c();c=null}
        try{(document.body||document.documentElement).appendChild(s)}catch(e){E()}
      })('oamoameevee.net',9574214,document.createElement('script'),_fhgynucm)
    `;
    script.async = true;
    if (bannerAdRef.current) bannerAdRef.current.appendChild(script);
  }, []);
  
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
            <Link to={novel ? `/novels/${encodeURIComponent(novel.title)}` : "/"}>
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
              <Link to={`/novels/${encodeURIComponent(novel.title)}`} className="hover:text-primary">
                {novel.title}
              </Link>
            </h1>
            <p className="text-gray-600">
              by <Link to={`/authors/${encodeURIComponent(author?.username || '')}`} className="text-primary hover:underline">
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
                        onClick={() => navigateToChapter(c.chapterNumber)}
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
        <div className="rounded-xl shadow-sm p-6 sm:p-8 mb-8 bg-white text-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Chapter {chapter.chapterNumber}: {chapter.title}
          </h2>
          
          <div 
            className="reading-content chapter-content space-y-4 relative"
            onClick={handleReadingContentClick}
          >
            {chapter.content.split("\n\n").map((paragraph, index) => (
              <p 
                key={index} 
                className="mb-4 text-lg leading-relaxed reading-content text-gray-800"
                style={{ 
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
          {/* Vignette Banner Ad at the end of chapter content */}
          <div ref={bannerAdRef} style={{ margin: "32px 0", textAlign: "center" }} />
          {chapter.authorNote && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Author's Note:</h3>
                <p className="text-gray-700">{chapter.authorNote}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          {/* Previous Chapter Button */}
          <Link 
            to={prevChapter ? `/novels/${novelName}/chapters/${prevChapter.chapterNumber}` : ''}
            onClick={(e) => {!prevChapter && e.preventDefault();}}
          >
            <Button variant="outline" size="default" disabled={!prevChapter}>
              <ChevronLeft className="mr-2 h-6 w-6" />
              Previous Chapter
            </Button>
          </Link>

          
          {/* Next Chapter Button */}
          <Link 
            to={nextChapter ? `/novels/${novelName}/chapters/${nextChapter.chapterNumber}` : ''}
            onClick={(e) => {!nextChapter && e.preventDefault();}}
          >
            <Button variant="outline" size="default" disabled={!nextChapter}>
              Next Chapter
              <ChevronRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Font Adjustment Panel */}
      <div 
        ref={fontPanelRef}
        onClick={handlePanelClick}
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 transition-transform duration-300 ease-in-out ${
          showFontPanel ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container mx-auto max-w-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Font Size</h3>
              <span className="text-sm text-gray-500">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              min={12}
              max={24}
              step={1}
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
            
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Font Style</h3>
              <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      <CommentSection novelId={novel.id} chapterNumber={chapterNumber} novelAuthorId={novel.authorId} isAuthorDashboard={false} chapterId={chapter.id} />
    </div>
  );
}