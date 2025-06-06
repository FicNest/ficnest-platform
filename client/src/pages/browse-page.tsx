import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Search } from "lucide-react";
import NovelCard from "@/components/novel-card";
import { Novel } from "@shared/schema";

// Define interface for Novel data (assuming a structure)
/*
interface Novel {
  id: number;
  title: string;
  description: string;
  coverImage?: string;
  authorId: number;
  authorName?: string;
  rating?: number;
}
*/

export default function BrowsePage() {
  // const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: Implement fetching all novels
  const { data: novelsData, isLoading, isError, error } = useQuery<Novel[]>({
    queryKey: ["allNovels"],
    queryFn: async () => {
      // Replace with your actual API call to fetch all novels
      const res = await fetch("/api/novels"); // Assuming an endpoint like /api/novels exists
      if (!res.ok) {
        throw new Error(`Failed to fetch novels: ${res.status}`);
      }
      return res.json();
    },
    enabled: mounted, // Only fetch when the component is mounted
    staleTime: 60000, // Cache data for 1 minute
  });

  // TODO: Implement filtering based on searchQuery
  // const filteredNovels = novelsData || [];

  if (!mounted || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading novels...</div>;
  }

  if (isError) {
    return <div className="container mx-auto px-4 py-8 text-red-600">Error loading novels: {error instanceof Error ? error.message : String(error)}</div>;
  }

  const novelsToDisplay = novelsData || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl text-gray-900">Browse Novels</CardTitle>
            {/* Removed Search Input */}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* TODO: Render the list of filteredNovels here */}
          {novelsToDisplay.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* Map over filteredNovels and render a Card or similar component for each novel */}
              {novelsToDisplay.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-700">No novels found</h3>
              <p className="text-gray-500">Try adjusting your search or check back later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 