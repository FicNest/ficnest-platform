import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertNovelSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Book, Upload, Save } from "lucide-react";

// Extend the schema with our new genres field
const extendedNovelSchema = insertNovelSchema
  .omit({ authorId: true, genres: true }) // Remove the original genres field
  .extend({
    coverImageData: z.string().optional(),
    // Add a simple string field for genres input
    genres: z.string().optional(), 
  });

type NovelFormValues = z.infer<typeof extendedNovelSchema>;

export default function CreateNovelPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Form definition
  const form = useForm<NovelFormValues>({
    resolver: zodResolver(extendedNovelSchema),
    defaultValues: {
      title: "",
      description: "",
      genres: "", // Initialize as empty string
      status: "draft",
      contentRating: "everyone",
    },
  });
  
  // Create novel mutation
  const createNovelMutation = useMutation({
    mutationFn: async (data: NovelFormValues) => {
      // Process genres from comma-separated string to array
      const genresArray = data.genres 
        ? data.genres.split(',').map(genre => genre.trim()).filter(genre => genre !== '')
        : [];
      
      const novelData = {
        ...data,
        authorId: user!.id,
        coverImage: data.coverImageData || undefined,
        genres: genresArray, // Convert to array for API
      };
      
      // Remove the coverImageData field as it's not part of the schema
      delete (novelData as any).coverImageData;
      
      const res = await apiRequest("POST", "/api/novels", novelData);
      return await res.json();
    },
    onSuccess: (novel) => {
      toast({
        title: "Novel created",
        description: "Your novel has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/novels/author/${user?.id}`] });
      navigate(`/novels/${novel.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: NovelFormValues) => {
    createNovelMutation.mutate(data);
  };
  
  // Handle cover image upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cover image must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCoverPreview(dataUrl);
      form.setValue("coverImageData", dataUrl);
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Create New Novel</h1>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Novel Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novel Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your novel's title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Novel Cover */}
            <FormField
              control={form.control}
              name="coverImageData"
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
                      <FormDescription>
                        Recommended size: 600x900 pixels. Max 2MB.
                      </FormDescription>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Genre Input - replaced checkbox grid with text input */}
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
            
            {/* Novel Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Synopsis</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a compelling description of your novel" 
                      className="min-h-[200px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Content Rating */}
            <FormField
              control={form.control}
              name="contentRating"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Content Rating</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="everyone" id="everyone" />
                        </FormControl>
                        <FormLabel className="font-normal" htmlFor="everyone">Everyone</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="teen" id="teen" />
                        </FormControl>
                        <FormLabel className="font-normal" htmlFor="teen">Teen (13+)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="mature" id="mature" />
                        </FormControl>
                        <FormLabel className="font-normal" htmlFor="mature">Mature (18+)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Form Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.setValue("status", "draft");
                  form.handleSubmit(onSubmit)();
                }}
                disabled={createNovelMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                type="submit"
                onClick={() => form.setValue("status", "published")}
                disabled={createNovelMutation.isPending}
              >
                {createNovelMutation.isPending ? "Creating..." : "Publish Novel"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}