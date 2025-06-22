// server/api-routes/latest-chapters.ts
import { Request, Response } from "express";
import { storage } from "../storage.js";

// Handler for /api/chapters/latest
export async function getLatestChapters(req: Request, res: Response) {
  try {
    console.log("Handling /api/chapters/latest request");
    
    const limit = Number(req.query.limit) || 10;
    
    console.log(`Fetching latest chapters with limit ${limit}`);
    
    // Get latest chapters data
    const latestChapters = await storage.getLatestChapters(limit);
    
    // Enhance with novel and author information
    const enhancedChapters = [];
    
    for (const chapter of latestChapters) {
      try {
        // Get novel data
        const novel = await storage.getNovel(chapter.novelId);
        
        // Skip if novel doesn't exist
        if (!novel) {
          console.log(`Novel ${chapter.novelId} not found for chapter ${chapter.id}`);
          continue;
        }
        
        // Get author username if we have novel
        let username = "Unknown Author";
        if (novel?.authorId) {
          const author = await storage.getUser(novel.authorId);
          if (author) {
            username = author.username;
          }
        }
        
        // Add novel with username to the chapter
        enhancedChapters.push({
          id: chapter.id,
          novelId: chapter.novelId,
          title: chapter.title,
          content: chapter.content,
          chapterNumber: chapter.chapterNumber,
          authorNote: chapter.authorNote,
          viewCount: chapter.viewCount,
          status: chapter.status,
          createdAt: typeof chapter.createdAt === 'string' ? chapter.createdAt : chapter.createdAt.toISOString(),
          updatedAt: typeof chapter.updatedAt === 'string' ? chapter.updatedAt : chapter.updatedAt.toISOString(),
          novel: {
            id: novel.id,
            title: novel.title,
            authorId: novel.authorId,
            coverImage: novel.coverImage
          },
          username: username
        });
      } catch (error) {
        console.error(`Error enhancing chapter ${chapter.id}:`, error);
      }
    }
    
    console.log(`Returning ${enhancedChapters.length} latest chapters`);
    res.json(enhancedChapters);
  } catch (error) {
    console.error("Error in getLatestChapters:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
}