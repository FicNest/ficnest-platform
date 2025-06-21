import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NovelCard from "@/components/novel-card";
import { Novel } from "@shared/schema";
import { UserCircle, BookOpen, Clock } from "lucide-react";

interface Author {
  id: number;
  username: string;
  isAuthor: boolean;
}

export default function AuthorProfilePage() {
  const { username } = useParams<{ username: string }>();
  
  // Fetch author data
  const { data: author, isLoading: isLoadingAuthor, error: authorError } = useQuery<Author>({
    queryKey: [`/api/users/by-username/${username}`],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch author's novels
  const { data: novels, isLoading: isLoadingNovels, error: novelsError } = useQuery<Novel[]>({
    queryKey: [`/api/novels/author/${author?.id}`],
    enabled: !!author?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Calculate stats
  const totalNovels = novels?.length || 0;
  
  // Handle loading state
  if (isLoadingAuthor || isLoadingNovels) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
            {[...Array(3)].map((_, i) => (
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
      </div>
    );
  }
  
  // Handle error state
  if (authorError || novelsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading author profile</h1>
          <p className="text-gray-600 mb-6">
            {authorError instanceof Error 
              ? authorError.message 
              : novelsError instanceof Error 
                ? novelsError.message 
                : "An unknown error occurred"}
          </p>
          <Link href="/">
            <button className="bg-primary text-white px-4 py-2 rounded-md">
              Return to Homepage
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Handle not found state
  if (!author) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Author not found</h1>
          <p className="text-gray-600 mb-6">The author you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <button className="bg-primary text-white px-4 py-2 rounded-md">
              Return to Homepage
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Author Profile Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-primary text-white text-2xl">
                {author.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold mb-2">{author.username}</h1>
              <p className="text-gray-600 mb-4">
                {author.isAuthor ? "Author" : "Reader"}
              </p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-gray-500" />
                  <span>{totalNovels} {totalNovels === 1 ? 'Novel' : 'Novels'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Author's Novels */}
        <h2 className="text-2xl font-bold mb-6">Novels by {author.username}</h2>
        
        {novels && novels.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {novels.map(novel => (
              <NovelCard 
                key={novel.id} 
                novel={{
                  ...novel,
                  authorName: author.username
                }} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No novels yet</h3>
            <p className="text-gray-500">
              {author.username} hasn't published any novels yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}