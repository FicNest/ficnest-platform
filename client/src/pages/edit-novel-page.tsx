import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Trash2, Book, Upload } from "lucide-react";
import { Novel, Chapter } from "@shared/schema";
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
import { Skeleton } from "@/components/ui/skeleton";

// Create a modified schema for the form with more validation
const extendedNovelSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
  genres: z.string().min(1, "Please enter at least one genre"),
  coverImage: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

type NovelFormValues = z.infer<typeof extendedNovelSchema>;

export default function EditNovelPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Fetch the novel data
  const { data: novel, isLoading, error } = useQuery<Novel, Error>({
    queryKey: [`/api/novels/${id}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch chapters for this novel
  const { data: chapters, isLoading: isLoadingChapters } = useQuery<Chapter[]>({
    queryKey: [`/api/novels/${id}/chapters`],
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const form = useForm<NovelFormValues>({
    resolver: zodResolver(extendedNovelSchema),
    defaultValues: {
      title: "",
      description: "",
      genres: "",
      coverImage: "",
      status: "draft",
    },
  });

  // Update form with the novel data when it's loaded
  useEffect(() => {
    if (novel) {
      form.reset({
        title: novel.title,
        description: novel.description,
        // Convert the genres array back to a comma-separated string
        genres: novel.genres ? novel.genres.join(', ') : '',
        coverImage: novel.coverImage || "", // Initialize coverImage field
        status: novel.status as "draft" | "published",
      });
      setCoverPreview(novel.coverImage || null); // Set initial preview
    }
  }, [novel, form]);

  // Check if the novel belongs to the current user
  useEffect(() => {
    if (novel && user && novel.authorId !== user.id) {
      toast({
        title: "Unauthorized",
        description: "You can only edit your own novels.",
        variant: "destructive",
      });
      navigate("/author/dashboard");
    }
  }, [novel, user, navigate, toast]);

  const updateNovelMutation = useMutation({
    mutationFn: async (data: NovelFormValues) => {
      // Process genres from comma-separated string to array
      const genresArray = data.genres 
        ? data.genres.split(',').map(genre => genre.trim()).filter(genre => genre !== '')
        : [];
        
      // Create the object to send to the API
      const updateData = {
        ...data,
        genres: genresArray,
      };
      
      // Remove fields not in the schema
      
      const res = await apiRequest("PUT", `/api/novels/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Novel updated",
        description: "Your novel has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/novels/author"] });
      navigate(`/novels/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update novel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NovelFormValues, status: string = "draft") => {
    // Override status if a different save button was clicked
    const submissionData = {
      ...data,
      status: status as "draft" | "published",
    };
    
    updateNovelMutation.mutate(submissionData);
  };

  // Delete chapter mutation (Duplicated from novel-detail-page.tsx)
  const deleteChapterMutation = useMutation({
    mutationFn: async (chapterId: number) => {
      await apiRequest("DELETE", `/api/chapters/${chapterId}`);
    },
    onSuccess: () => {
      // Invalidate the chapters list to refetch and update the UI
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${id}/chapters`] });
      toast({
        title: "Chapter deleted",
        description: "The chapter has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete chapter",
        variant: "destructive",
      });
    },
  });

  const handleDeleteChapter = (chapterId: number) => {
    if (confirm("Are you sure you want to delete this chapter? This action cannot be undone.")) {
      deleteChapterMutation.mutate(chapterId);
    }
  };

  // Handle cover image upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File too large",
        description: "Cover image must be less than 2MB",
        variant: "destructive",
      });
      // Clear the file input value so the same file can be selected again
      e.target.value = ""; 
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCoverPreview(dataUrl);
      form.setValue("coverImage", dataUrl); // Set the base64 string to the coverImage field
    };
    reader.readAsDataURL(file);
  };

  // Filter and sort chapters to display published chapters in order
  const publishedChapters = useMemo(() => {
    if (!chapters) return [];
    return chapters
      .filter(chapter => chapter.status === "published")
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [chapters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
        <p className="text-gray-600">{error.message}</p>
        <Button onClick={() => navigate("/author/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Edit Novel</h1>

        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter novel title" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a catchy title for your novel
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write a compelling description..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tell readers what your story is about
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genres</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter genres separated by commas (e.g. Fantasy, Romance, Mystery)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Add multiple genres by separating them with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
                      {!coverPreview ? (
                        <Book size={32} />
                      ) : (
                        <img 
                          src={coverPreview} 
                          alt="Cover preview" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("cover-upload")?.click()}
                        className="mb-2"
                      >
                        <Upload className="mr-2 h-4 w-4" /> Upload Cover
                      </Button>
                      <input 
                        type="file" 
                        id="cover-upload" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleCoverUpload}
                      />
                      {coverPreview && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setCoverPreview(null);
                            form.setValue("coverImage", "");
                            const fileInput = document.getElementById("cover-upload") as HTMLInputElement;
                            if (fileInput) fileInput.value = "";
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          Remove Cover
                        </Button>
                      )}
                      <FormDescription>
                        Recommended size: 600x900 pixels. Max 2MB.
                      </FormDescription>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Chapter Management Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h2 className="text-2xl font-bold mb-4">Chapters</h2>

              {isLoadingChapters ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : publishedChapters && publishedChapters.length > 0 ? (
                <div className="space-y-3">
                  {publishedChapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex-grow mr-4">
                        <div className="font-medium">
                          Chapter {chapter.chapterNumber}: {chapter.title || "Untitled"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Published: {new Date(chapter.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500"
                            title="Delete Chapter"
                            disabled={deleteChapterMutation.isPending}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Chapter Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "Chapter {chapter.chapterNumber}: {chapter.title || 'Untitled'}"? This action cannot be undone and will permanently remove the chapter for all readers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteChapter(chapter.id)} className="bg-red-500 hover:bg-red-600">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (publishedChapters && publishedChapters.length === 0) ? (
                <div className="text-center py-6">
                  <Book className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No published chapters yet</h3>
                  <p className="text-gray-500">
                    Create and publish chapters from the novel details page.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.handleSubmit((data) => onSubmit(data, "draft"))()}
                disabled={updateNovelMutation.isPending}
              >
                {updateNovelMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save as Draft
              </Button>
              <Button
                type="button"
                onClick={() => form.handleSubmit((data) => onSubmit(data, "published"))()}
                disabled={updateNovelMutation.isPending}
              >
                {updateNovelMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Publish Novel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}