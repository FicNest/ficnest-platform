import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash, FileText, Book } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Chapter } from "@shared/schema";

interface DraftManagerProps {
  novelId: number;
}

export default function DraftManager({ novelId }: DraftManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch ALL chapters for the novel, including drafts and published
  const { data: allChapters, isLoading } = useQuery<Chapter[]>({
    queryKey: [`novel-chapters-${novelId}`], // Use the key for all chapters
    queryFn: async () => {
      // Use the existing endpoint that returns all chapters for the author
      const res = await apiRequest("GET", `/api/novels/${novelId}/chapters`);
      return res.json();
    },
  });
  
  // Filter for drafts from the fetched chapters
  const drafts = allChapters?.filter(chapter => chapter.status === "draft");
  
  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      await apiRequest("DELETE", `/api/chapters/${draftId}`);
    },
    onSuccess: () => {
      // Invalidate the all chapters query after deleting a draft
      queryClient.invalidateQueries({ queryKey: [`novel-chapters-${novelId}`] });
      toast({
        title: "Draft deleted",
        description: "The draft has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete draft",
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteDraft = (draftId: number) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      deleteDraftMutation.mutate(draftId);
    }
  };
  
  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      await apiRequest("PUT", `/api/chapters/${draftId}/publish`);
    },
    onSuccess: () => {
      // Invalidate both the all chapters list and the main chapters list
      queryClient.invalidateQueries({ queryKey: [`novel-chapters-${novelId}`] });
      queryClient.invalidateQueries({ queryKey: [`novel-chapters-${novelId}`] }); // Invalidate the same key again to be sure?
      toast({
        title: "Draft published",
        description: "The draft has been successfully published.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to publish draft",
        variant: "destructive",
      });
    },
  });

  const handlePublishDraft = (draftId: number) => {
    if (confirm("Are you sure you want to publish this draft?")) {
      publishDraftMutation.mutate(draftId);
    }
  };
  
  return (
    <div className="h-[600px] md:h-[900px] lg:h-[70vh] overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : drafts && drafts.length > 0 ? (
            <div className="flex flex-col space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 rounded-md p-3 w-full"
                >
                  <div className="flex-1 mb-2 sm:mb-0">
                    <div className="font-medium">
                      {`Chapter ${draft.chapterNumber}: ${draft.title || "Untitled Draft"}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last updated: {new Date(draft.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 flex-none w-full sm:w-auto justify-center sm:justify-end mt-2 sm:mt-0">
                    <Link to={`/author/novels/${novelId}/chapters/edit/${draft.chapterNumber}`} className="w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => handlePublishDraft(draft.id)}
                      disabled={publishDraftMutation.isPending}
                    >
                      <Book className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 w-full sm:w-auto"
                      onClick={() => handleDeleteDraft(draft.id)}
                      disabled={deleteDraftMutation.isPending}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts yet</h3>
              <p className="text-gray-500">
                Start writing a new chapter and it will be auto-saved as a draft
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}