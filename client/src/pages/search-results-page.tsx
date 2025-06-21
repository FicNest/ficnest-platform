import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import NovelCard from "@/components/novel-card";
import { Novel } from "@shared/schema";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
}

// Define an extended Novel type that includes authorName
interface NovelWithAuthor extends Novel {
  authorName?: string;
}

export default function SearchResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredNovels, setFilteredNovels] = useState<NovelWithAuthor[]>([]);
  const [authorMap, setAuthorMap] = useState<Record<number, string>>({});
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);
  const [key, setKey] = useState(Date.now());
  
  const pageSize = 12;
  
  // Extract search query from URL with key to force re-evaluation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    
    if (query) {
      setSearchQuery(query);
      setCurrentPage(1); // Reset to first page on new search
      setKey(Date.now()); // Update key to force re-fetch
    }
  }, [window.location.search, location]);
  
  // Re-fetch data when search query or key changes
  const { 
    data: novels, 
    isLoading: isLoadingNovels, 
    refetch,
    error
  } = useQuery<Novel[]>({
    queryKey: [`/api/novels`, searchQuery, key], // Include key in the queryKey
    queryFn: async () => {
      try {
        console.log(`Fetching novels for query: "${searchQuery}" (key: ${key})`);
        // Use the existing novels endpoint that returns all novels
        const response = await fetch(`/api/novels?limit=100&offset=0`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Fetched ${data.length} novels`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching novels:", error);
        throw error;
      }
    },
    enabled: !!searchQuery,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Ensure refetch when component mounts
  });
  
  // Fetch author data for all novels
  useEffect(() => {
    const fetchAuthors = async () => {
      if (!novels || novels.length === 0) return;
      
      setIsLoadingAuthors(true);
      console.log(`Fetching author data for ${novels.length} novels`);
      
      // Create an array of author IDs (use Array.from to avoid Set iteration error)
      const authorIds = Array.from(new Set(novels.map(novel => novel.authorId)));
      const authorDataMap: Record<number, string> = {};
      
      try {
        // Fetch authors in parallel
        await Promise.all(authorIds.map(async (authorId) => {
          try {
            const response = await fetch(`/api/users/${authorId}`);
            if (response.ok) {
              const authorData: User = await response.json();
              authorDataMap[authorId] = authorData.username || `Author ${authorId}`;
            } else {
              authorDataMap[authorId] = `Author ${authorId}`;
            }
          } catch (error) {
            console.error(`Error fetching author ${authorId}:`, error);
            authorDataMap[authorId] = `Author ${authorId}`;
          }
        }));
        
        setAuthorMap(authorDataMap);
        console.log(`Fetched data for ${Object.keys(authorDataMap).length} authors`);
      } catch (error) {
        console.error("Error fetching author data:", error);
      } finally {
        setIsLoadingAuthors(false);
      }
    };
    
    fetchAuthors();
  }, [novels]);
  
  // Manually refetch when key or search query changes
  useEffect(() => {
    if (searchQuery) {
      console.log(`Triggering refetch for: "${searchQuery}"`);
      refetch();
    }
  }, [searchQuery, key, refetch]);

  // Filter novels based on search query - including author names and tags
  useEffect(() => {
    if (novels && searchQuery) {
      console.log(`Filtering ${novels.length} novels for query: "${searchQuery}"`);
      
      // Enhance novels with author names
      const novelsWithAuthor: NovelWithAuthor[] = novels.map(novel => ({
        ...novel,
        authorName: authorMap[novel.authorId] || `Author ${novel.authorId}`
      }));
      
      // Search in title, author name, and tags
      const queryLower = searchQuery.toLowerCase();
      const filtered = novelsWithAuthor.filter(novel => {
        const titleMatch = novel.title.toLowerCase().includes(queryLower);
        const authorMatch = (novel.authorName || '').toLowerCase().includes(queryLower);
        const tagsMatch = novel.genres.some(genre => 
          genre.toLowerCase().includes(queryLower)
        );
        return titleMatch || authorMatch || tagsMatch;
      });
      
      console.log(`Found ${filtered.length} matches`);
      setFilteredNovels(filtered);
    } else {
      setFilteredNovels([]);
    }
  }, [novels, searchQuery, authorMap]);

  // Calculate pagination
  const totalResults = filteredNovels.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedNovels = filteredNovels.slice(
    (currentPage - 1) * pageSize, 
    currentPage * pageSize
  );
  
  // Show loading state while loading novels or authors
  const isLoading = isLoadingNovels || isLoadingAuthors;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search Results</h1>
      
      {/* Search Results Info */}
      {!isLoading && searchQuery && (
        <p className="mb-6 text-gray-600">
          Found {totalResults} {totalResults === 1 ? "result" : "results"} for "{searchQuery}"
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <Skeleton className="w-full h-56" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md mb-6">
          <h3 className="font-medium">Error loading search results</h3>
          <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={() => {
              setKey(Date.now()); // Force refresh with new key
              refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
      
      {/* Search Results */}
      {!isLoading && (
        <>
          {paginatedNovels.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-6">
                {paginatedNovels.map(novel => (
                  <NovelCard 
                    key={novel.id} 
                    novel={novel} 
                  />
                ))}
              </div>
            </>
          ) : (
            !isLoading && searchQuery && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-4">No results found</h3>
                <p className="text-gray-500">
                  We couldn't find any novels matching "{searchQuery}".
                  <br />
                  Try different keywords or check for typos.
                </p>
              </div>
            )
          )}
        </>
      )}
      
      {/* Pagination */}
      {!isLoading && filteredNovels.length > 0 && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center">
              <span className="mx-4">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}