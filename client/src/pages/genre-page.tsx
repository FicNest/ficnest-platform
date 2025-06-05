import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import NovelCard from "@/components/novel-card";
import { Novel } from "@shared/schema";

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const decodedGenre = decodeURIComponent(genre); // Decode the URL-encoded genre
  
  // Fetch novels by genre
  const { data: novels, isLoading, error } = useQuery<Novel[]>({
    queryKey: [`genres/${genre}`, page],
    queryFn: async () => {
      try {
        const offset = (page - 1) * pageSize;
        const response = await fetch(`/api/novels/genre/${genre}?limit=${pageSize}&offset=${offset}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Make sure we return an array even if the response is malformed
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Error fetching novels in genre ${genre}:`, error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Calculate pagination
  const totalResults = novels?.length || 0;
  const hasMorePages = novels?.length === pageSize; // If we got a full page, there might be more
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 capitalize">{decodedGenre} Novels</h1>
        
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
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : "An error occurred while loading novels."}
          </p>
          <Link to="/">
            <Button>Return to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 capitalize">{decodedGenre} Novels</h1>
      
      {novels && novels.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-6">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex justify-center mt-8 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center">Page {page}</span>
            <Button 
              variant="outline" 
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMorePages}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-xl font-bold mb-4">No novels found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any novels in the "{decodedGenre}" genre.
          </p>
          <Link to="/browse">
            <Button>Browse All Novels</Button>
          </Link>
        </div>
      )}
    </div>
  );
}