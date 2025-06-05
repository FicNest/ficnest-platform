// DashboardDeleteButton.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DashboardDeleteButtonProps {
  novelId: number;
  novelTitle: string;
}

export function DashboardDeleteButton({ novelId, novelTitle }: DashboardDeleteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Delete novel mutation
  const deleteNovelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/novels/${novelId}`);
    },
    onSuccess: () => {
      // Invalidate the novels query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/novels/author`] });
      
      toast({
        title: "Novel deleted",
        description: "Your novel has been successfully deleted",
      });
      
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete novel",
        variant: "destructive",
      });
    },
  });
  
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="flex items-center text-red-500 hover:text-white hover:bg-red-500"
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Delete
      </Button>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Novel: {novelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting this novel will permanently remove it and all its chapters, comments, and related data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteNovelMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Novel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}