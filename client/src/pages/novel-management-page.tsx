// pages/novel-management-page.tsx
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Novel } from "@shared/schema";
import { Book, Plus, ArrowLeft } from "lucide-react";
import DraftManager from "@/components/DraftManager";

export default function NovelManagementPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const novelId = parseInt(id);
  const [activeTab, setActiveTab] = useState<string>("published");
  
  // Fetch novel data
  const { data: novel, isLoading, error } = useQuery<Novel>({
    queryKey: [`/api/novels/${novelId}`],
  });
  
  // Redirect if not author
  if (novel && user && novel.authorId !== user.id) {
    navigate("/author/dashboard");
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
          <Skeleton className="h-8 w-72 mb-4" />
          <Skeleton className="h-6 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }
  
  if (error || !novel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Novel not found</h1>
          <p className="text-gray-600 mb-6">The novel you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/author/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-2"
              onClick={() => navigate("/author/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Manage: {novel.title}</h1>
          </div>
          <div className="flex gap-3">
            <Link to={`/author/novels/${novelId}/edit`}>
              <Button variant="outline">Edit Novel</Button>
            </Link>
            <Link to={`/author/novels/${novelId}/chapters/create`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Chapter
              </Button>
            </Link>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="published">Published Chapters</TabsTrigger>
            <TabsTrigger value="drafts">Draft Chapters</TabsTrigger>
          </TabsList>
          
          <TabsContent value="published">
            <Card>
              <CardHeader>
                <CardTitle>Published Chapters</CardTitle>
              </CardHeader>
            </Card>
          </TabsContent>
          
          <TabsContent value="drafts">
            <DraftManager novelId={novelId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}