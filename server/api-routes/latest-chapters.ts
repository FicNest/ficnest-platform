// server/api-routes/latest-chapters.ts
import { Request, Response } from "express";
import { storage } from "../storage.js";

// Handler for /api/chapters/latest
export async function getLatestChapters(req: Request, res: Response) {
  try {
    console.log("Handling /api/chapters/latest request");
    
    const limit = Number(req.query.limit) || 10;
    
    console.log(`Fetching latest chapters for top ${limit} updated novels`);
    
    // Get latest chapters data, which is pre-sorted by novel update time
    const latestChaptersData = await storage.getLatestChapters(limit);

    const orderedGroupedChapters: any[] = [];
    const novelIdSet = new Set<number>();

    for (const item of latestChaptersData) {
      if (!novelIdSet.has(item.novelId)) {
        // Find all chapters for the current novel
        const novelChapters = latestChaptersData
          .filter(c => c.novelId === item.novelId)
          .map(c => ({
            id: c.chapterId,
            title: c.chapterTitle,
            chapterNumber: c.chapterNumber,
            updatedAt: c.chapterUpdatedAt,
            createdAt: c.chapterCreatedAt,
          }))
          // Sort chapters by chapter number (descending) to get latest first
          .sort((a, b) => b.chapterNumber - a.chapterNumber);
        
        orderedGroupedChapters.push({
          novel: {
            id: item.novelId,
            title: item.novelTitle,
            coverImage: item.novelCoverImage,
          },
          chapters: novelChapters,
          authorUsername: item.authorUsername,
        });
        
        novelIdSet.add(item.novelId);
      }
    }
    
    console.log(`Returning ${orderedGroupedChapters.length} latest novels with chapters`);
    res.json(orderedGroupedChapters);
  } catch (error) {
    console.error("Error in getLatestChapters:", error);
    res.status(500).json({ message: "Server error", error: String(error) });
  }
}