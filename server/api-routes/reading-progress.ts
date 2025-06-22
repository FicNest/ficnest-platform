import { Request, Response } from "express";
import { storage } from "../storage.js";

// Handler for /api/reading-progress/recent
export async function getRecentReadingProgress(req: Request, res: Response) {
  try {
    console.log("Handling /api/reading-progress/recent request");
    
    if (!req.user?.id) {
      console.log("User not authenticated");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 50;
    
    console.log(`Fetching reading progress for user ${userId} with limit ${limit}`);
    
    // Get reading progress data
    const recentlyRead = await storage.getRecentlyRead(userId, limit);
    
    // Enhance with novel and chapter information
    const enhancedReadingProgress = [];
    
    for (const progress of recentlyRead) {
      try {
        // Get novel data
        const novel = await storage.getNovel(progress.novelId);
        
        // Get chapter data
        const chapter = await storage.getChapterById(progress.chapterId);
        
        // Get author name if we have novel
        let authorName = "Unknown Author";
        if (novel?.authorId) {
          const author = await storage.getUser(novel.authorId);
          if (author) {
            authorName = author.username;
          }
        }
        
        enhancedReadingProgress.push({
          ...progress,
          novel: novel ? {
            ...novel,
            authorName
          } : null,
          chapter: chapter || null
        });
      } catch (error) {
        console.error("Error enhancing reading progress:", error);
        // Still include the original progress item even if enhancement fails
        enhancedReadingProgress.push(progress);
      }
    }
    
    console.log(`Returning ${enhancedReadingProgress.length} reading progress items`);
    res.json(enhancedReadingProgress);
  } catch (error) {
    console.error("Error in getRecentReadingProgress:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
}

// Handler for /api/reading-progress/latest
export async function getLatestReadingProgress(req: Request, res: Response) {
  try {
    console.log("Handling /api/reading-progress/latest request");
    
    if (!req.user?.id) {
      console.log("User not authenticated");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    
    console.log(`Fetching latest reading progress for user ${userId}`);
    
    // Get most recent reading progress item
    const recentlyRead = await storage.getRecentlyRead(userId, 1);
    
    if (!recentlyRead || recentlyRead.length === 0) {
      console.log("No reading progress found");
      return res.json(null);
    }
    
    const latestProgress = recentlyRead[0];
    
    try {
      // Get novel data
      const novel = await storage.getNovel(latestProgress.novelId);
      
      // Get chapter data
      const chapter = await storage.getChapterById(latestProgress.chapterId);
      
      // Get all chapters for this novel (to count published ones)
      const allChapters = await storage.getChaptersByNovel(latestProgress.novelId);
      const publishedChapters = allChapters.filter(c => c.status === "published");
      // Sort by chapterNumber ascending
      publishedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
      // Find the index of the current chapter among published chapters
      let progressPercent = 0;
      if (chapter && publishedChapters.length > 0) {
        const idx = publishedChapters.findIndex(c => c.id === chapter.id);
        if (idx !== -1) {
          // Progress is (index + 1) / total published chapters * 100
          progressPercent = Math.round(((idx + 1) / publishedChapters.length) * 100);
        }
      }
      
      // Get author name if we have novel
      let authorName = "Unknown Author";
      if (novel?.authorId) {
        const author = await storage.getUser(novel.authorId);
        if (author) {
          authorName = author.username;
        }
      }
      
      const enhancedProgress = {
        ...latestProgress,
        progress: progressPercent, // override with correct percentage
        novel: novel ? {
          ...novel,
          authorName
        } : null,
        chapter: chapter || null
      };
      
      console.log("Returning enhanced latest reading progress with correct percentage");
      return res.json(enhancedProgress);
    } catch (error) {
      console.error("Error enhancing latest reading progress:", error);
      // Return unenhanced progress if enhancement fails
      console.log("Returning unenhanced latest reading progress");
      return res.json(latestProgress);
    }
  } catch (error) {
    console.error("Error in getLatestReadingProgress:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
}