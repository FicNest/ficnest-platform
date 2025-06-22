// pages/edit-chapter-page.tsx
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertChapterSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Novel, Chapter } from "@shared/schema";
import { Bold, Italic, Underline, Heading, Quote, AlignJustify, Save } from "lucide-react";

const chapterSchema = insertChapterSchema
  .omit({ novelId: true });

type ChapterFormValues = z.infer<typeof chapterSchema>;

export default function EditChapterPage() {
  const [match, params] = useRoute("/author/novels/:novelId/chapters/edit/:chapterId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  if (!match) return null;
  
  const novelId = Number(params?.novelId);
  const chapterId = Number(params?.chapterId);
  
  // Fetch novel data
  const { data: novel } = useQuery<Novel>({
    queryKey: [`/api/novels/${novelId}`],
  });
  
  // Fetch chapter data
  const { data: chapter, isLoading: isLoadingChapter } = useQuery<Chapter>({
    queryKey: [`/api/novels/${novelId}/chapters/${chapterId}`],
    enabled: !!chapterId && !!novelId,
  });
  
  // Form definition
  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: "",
      content: "",
      chapterNumber: 1,
      authorNote: "",
      status: "draft",
    },
  });
  
  // Update form values when chapter data is loaded
  useEffect(() => {
    if (chapter) {
      form.reset({
        title: chapter.title,
        content: chapter.content,
        chapterNumber: chapter.chapterNumber,
        authorNote: chapter.authorNote || "",
        status: chapter.status,
      });
      
      // Set the initial status value
      setStatus(chapter.status);
    }
  }, [chapter, form]);
  
  // Track status separately since it might be changed by the submit buttons
  const [status, setStatus] = useState<string>("draft");
  
  // Auto-save functionality
  useEffect(() => {
    const intervalId = setInterval(() => {
      const values = form.getValues();
      if (values.title || values.content) {
        localStorage.setItem(`chapter-edit-${novelId}-${values.chapterNumber}`, JSON.stringify(values));
        setLastSaved(new Date());
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [form, novelId]);
  
  // Update chapter mutation
  const updateChapterMutation = useMutation({
    mutationFn: async (data: ChapterFormValues & { status: string }) => {
      const chapterData = {
        ...data,
        novelId,
      };
      
      const res = await apiRequest("PUT", `/api/novels/${novelId}/chapters/${data.chapterNumber}`, chapterData);
      return await res.json();
    },
    onSuccess: (chapter) => {
      // Clear saved draft
      localStorage.removeItem(`chapter-edit-${novelId}-${chapter.chapterNumber}`);
      
      toast({
        title: chapter.status === "published" ? "Chapter published" : "Draft saved",
        description: chapter.status === "published" 
          ? "Your chapter has been published successfully." 
          : "Your chapter has been saved as a draft.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novelId}/chapters/${chapter.chapterNumber}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/novels/${novelId}/chapters`] });
      queryClient.invalidateQueries({ queryKey: [`novel-${novelId}-drafts`] });
      
      if (chapter.status === "published") {
        navigate(`/author/dashboard`);
      } else {
        navigate(`/author/dashboard`);
      }
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
  const onSubmit = (data: ChapterFormValues, submitStatus: string = "draft") => {
    updateChapterMutation.mutate({ ...data, status: submitStatus });
  };
  
  // Text formatting helpers (same as in CreateChapterPage)
  const formatText = (formatter: string) => {
    const textarea = document.getElementById("chapter-content") as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let formattedText = selectedText;
    
    switch (formatter) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
      case "heading":
        formattedText = `## ${selectedText}`;
        break;
      case "quote":
        formattedText = `> ${selectedText}`;
        break;
      case "paragraph":
        formattedText = `\n\n${selectedText}`;
        break;
    }
    
    const newValue = beforeText + formattedText + afterText;
    form.setValue("content", newValue);
    
    // Set focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        beforeText.length + formattedText.length,
        beforeText.length + formattedText.length
      );
    }, 0);
  };
  
  if (isLoadingChapter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-2">Loading Chapter...</h1>
        </div>
      </div>
    );
  }
  
  if (!chapter || !novel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Chapter not found</h1>
          <p className="text-gray-600 mb-6">The chapter you're trying to edit doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/author/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-2">Edit Chapter</h1>
        <p className="text-gray-600 mb-6">
          Novel: <span className="font-medium">{novel.title}</span> | 
          Status: <span className={`font-medium ${status === "published" ? "text-green-600" : "text-yellow-600"}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data, "published"))} className="space-y-6">
            {/* Chapter Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter chapter title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Chapter Number */}
            <FormField
              control={form.control}
              name="chapterNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter Number</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter chapter number"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Chapter Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter Content</FormLabel>
                  <div className="border border-gray-300 rounded-lg mb-2">
                    {/* Simple formatting toolbar */}
                    <div className="flex items-center gap-1 p-2 border-b border-gray-300">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("bold")}
                        title="Bold"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("italic")}
                        title="Italic"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("underline")}
                        title="Underline"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                      <span className="border-r border-gray-300 h-6 mx-1"></span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("heading")}
                        title="Heading"
                      >
                        <Heading className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("quote")}
                        title="Quote"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <span className="border-r border-gray-300 h-6 mx-1"></span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => formatText("paragraph")}
                        title="Paragraph"
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <FormControl>
                      <Textarea
                        id="chapter-content"
                        placeholder="Write your chapter content here..."
                        className="min-h-[400px] border-0 rounded-b-lg resize-y"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  {lastSaved && (
                    <p className="text-xs text-gray-500">
                      Auto-saved {lastSaved.toLocaleTimeString()}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Author's Note */}
            <FormField
              control={form.control}
              name="authorNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author's Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a note to your readers" 
                      className="resize-y"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Form Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              {status === "published" ? (
                <Button
                  type="submit"
                  disabled={updateChapterMutation.isPending}
                >
                  {updateChapterMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              ) : status === "draft" ? (
                <>
                  <Button
                    type="submit"
                    disabled={updateChapterMutation.isPending}
                  >
                    {updateChapterMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onSubmit(form.getValues(), "published")}
                    disabled={updateChapterMutation.isPending}
                  >
                    Publish Chapter
                  </Button>
                </>
              ) : null}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}