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
  const [submitType, setSubmitType] = useState<'draft' | 'publish'>("draft");

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
      
      const res = await apiRequest("PUT", `/api/novels/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      if (submitType === "draft") {
        toast({
          title: "Changes saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        toast({
          title: "Novel updated",
          description: "Your novel has been updated successfully.",
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/novels/author"] });
      navigate(`/novels/${encodeURIComponent(form.getValues("title"))}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update novel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NovelFormValues) => {
    if (id) {
      updateNovelMutation.mutate(data);
    }
  };

  // Delete chapter mutation
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

  // Handle cover image upload with automatic cropping
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File too large",
        description: "Cover image must be less than 2MB",
        variant: "destructive",
      });
      e.target.value = ""; 
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions for homepage cover (adjust these values as needed)
        const targetWidth = 300;
        const targetHeight = 450;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Calculate scaling and positioning for centered crop
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;

        // Draw and crop the image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Convert to base64
        const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCoverPreview(croppedImageUrl);
        form.setValue("coverImage", croppedImageUrl);
      };
      img.src = event.target?.result as string;
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
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter novel title" {...field} />
                      </FormControl>
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
                        <Input placeholder="Enter genres (comma-separated)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Separate multiple genres with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="draft" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Draft
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="published" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Published
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverUpload}
                              className="max-w-xs"
                            />
                          </div>
                          {coverPreview && (
                            <div className="mt-4">
                              <img
                                src={coverPreview}
                                alt="Cover preview"
                                className="w-32 h-48 object-cover rounded-lg shadow-md"
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload a cover image for your novel (max 2MB). Image will be automatically cropped to fit the homepage.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter novel description"
                          className="h-[420px] min-h-[200px] resize-vertical"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => novel && navigate(`/novels/${encodeURIComponent(novel.title)}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateNovelMutation.isPending}
                onClick={() => setSubmitType('draft')}
              >
                {updateNovelMutation.isPending && submitType === 'draft' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save as Draft"
                )}
              </Button>
              <Button
                type="submit"
                disabled={updateNovelMutation.isPending}
                onClick={() => setSubmitType('publish')}
              >
                {updateNovelMutation.isPending && submitType === 'publish' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* Chapters Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Chapters</h2>
            <Button
              onClick={() => navigate(`/author/novels/${id}/chapters/create`)}
              className="flex items-center gap-2"
            >
              <Book className="h-4 w-4" />
              Add Chapter
            </Button>
          </div>

          {isLoadingChapters ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : publishedChapters.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No chapters published yet. Add your first chapter!
            </p>
          ) : (
            <div className="space-y-4">
              {publishedChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-card rounded-lg border"
                >
                  <div className="w-full sm:w-auto mb-2 sm:mb-0">
                    <h3 className="font-semibold">Chapter {chapter.chapterNumber}: {chapter.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(chapter.publishedAt || chapter.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/author/novels/${id}/chapters/${chapter.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteChapter(chapter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}