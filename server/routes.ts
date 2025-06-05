import { handleAuthCallback } from "./api-routes/auth-callback.js";
import { getRecentReadingProgress, getLatestReadingProgress } from "./api-routes/reading-progress.js";
import { getLatestChapters } from "./api-routes/latest-chapters.js";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth } from "./auth.js";
import { z } from "zod";
import { 
  insertNovelSchema, 
  insertChapterSchema, 
  insertBookmarkSchema,
  insertReadingProgressSchema,
  insertCommentSchema,
  insertReviewSchema,
  // Import types
  type Novel,
  type Comment,
  type Review,
  novels,
} from "../shared/schema.js";
import { db, pool } from "./db.js";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { comparePasswords, hashPassword } from "./utils/passwordUtils.js";
// Define your user interface extension
interface UserData {
  id: number;
  isAuthor: boolean;
  email?: string;
  username?: string;
  [key: string]: any;
}

// Interface for Comment with user information
interface CommentWithUser extends Comment {
  user: {
    id: number;
    username: string;
  };
}

// Interface for Comment with additional metadata for the dashboard
interface CommentWithMetadata extends Comment {
  user?: {
    id: number;
    username: string;
  };
  chapter?: {
    id: number;
    title: string;
    chapterNumber: number;
    novelId: number;
  };
  novel?: {
    id: number;
    title: string;
  };
  replies?: CommentWithMetadata[];
}

// Interface for Review with user information
interface ReviewWithUser extends Review {
  user: {
    id: number;
    username: string;
  };
}

// Interface for Novel with reviews
interface NovelWithReviews extends Novel {
  reviews: ReviewWithUser[];
}

// Use declaration merging to add types to Express namespace
declare global {
  namespace Express {
    // Extend the User interface that Passport uses
    interface User extends UserData {}
  }
}

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Author role middleware
function isAuthor(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isAuthor) {
    return next();
  }
  res.status(403).json({ message: "Author privileges required" });
}

/**
 * Utility function to convert object keys from snake_case to camelCase
 * Will recursively process nested objects and arrays
 */
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  if (typeof obj === 'object') {
    const camelCaseObj: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
      camelCaseObj[camelKey] = toCamelCase(value);
    }
    
    return camelCaseObj;
  }
  
  return obj;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // === Novel Routes ===
  
  // Get all novels (paginated)
  app.get("/api/reading-progress/recent", isAuthenticated, getRecentReadingProgress);
  app.get("/api/reading-progress/latest", isAuthenticated, getLatestReadingProgress);
  app.post("/api/auth/callback", handleAuthCallback);
  app.get("/api/chapters/latest", getLatestChapters);

  // Password reset endpoint
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`Password reset requested for email: ${email}`);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email.trim());
      if (!user) {
        // For security reasons, don't reveal if the email exists or not
        return res.status(200).json({ 
          message: "If an account with that email exists, the password has been reset to password@123. Please check your account and update your password from the profile page." 
        });
      }
      
      console.log(`Found user ${user.id} for password reset`);
      
      // Hash the temporary password
      const temporaryPassword = "password@123";
      const hashedPassword = await hashPassword(temporaryPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(user.id, { 
        password: hashedPassword 
      });
      
      if (updatedUser) {
        console.log(`Password reset successful for user ${user.id}`);
        res.status(200).json({ 
          message: "Your password has been reset to password@123. Please log in and change your password from the profile page for security." 
        });
      } else {
        console.error(`Failed to update password for user ${user.id}`);
        res.status(500).json({ message: "Failed to reset password. Please try again." });
      }
      
    } catch (error) {
      console.error("Error in password reset:", error);
      res.status(500).json({ message: "An error occurred while resetting your password. Please try again." });
    }
  });
  
  app.get("/api/novels", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const offset = Number(req.query.offset) || 0;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as string;
      
      const novels = await storage.getNovels(limit, offset, sortBy, sortOrder);
      res.json(novels);
    } catch (error) {
      res.status(500).json({ message: "Error fetching novels" });
    }
  });

  // Get latest novels
  app.get("/api/novels/latest", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 6;
      
      const novels = await storage.getLatestNovels(limit);
      console.log('Latest novels:', novels.map(n => n && n.id));
      res.json(novels);
    } catch (error) {
      res.status(500).json({ message: "Error fetching latest novels" });
    }
  });

  // Get novels by genre
  app.get("/api/novels/genre/:genre", async (req, res) => {
    try {
      const genre = req.params.genre;
      const limit = Number(req.query.limit) || 10;
      const offset = Number(req.query.offset) || 0;
      
      const novels = await storage.getNovelsByGenre(genre, limit, offset);
      res.json(novels);
    } catch (error) {
      res.status(500).json({ message: "Error fetching novels by genre" });
    }
  });

  // Get novels by author
  app.get("/api/novels/author/:authorId", async (req, res) => {
    try {
      const authorId = Number(req.params.authorId);
      
      const novels = await storage.getNovelsByAuthor(authorId);
      res.json(novels);
    } catch (error) {
      res.status(500).json({ message: "Error fetching novels by author" });
    }
  });

  // Get single novel
  app.get("/api/novels/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // Check if novel exists
      const novel = await storage.getNovel(id);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      
      // Increment view count
      await storage.incrementNovelViews(id);
      
      // Get reviews with user information
      const reviews = await storage.getReviewsByNovel(id);
      
      // Add user information to each review
      const reviewsWithUsers = await Promise.all(
        reviews.map(async (review) => {
          try {
            const user = await storage.getUser(review.userId);
            return {
              ...review,
              user: user ? {
                id: user.id,
                username: user.username
              } : {
                id: review.userId,
                username: `User ${review.userId}`
              }
            };
          } catch (error) {
            console.error(`Error fetching user for review ${review.id}:`, error);
            return {
              ...review,
              user: {
                id: review.userId,
                username: `User ${review.userId}`
              }
            };
          }
        })
      );
      
      // Add reviews to novel
      const novelWithReviews = {
        ...novel,
        reviews: reviewsWithUsers
      };
      
      // Return novel with reviews
      res.json(novelWithReviews);
    } catch (error) {
      console.error("Error fetching novel:", error);
      res.status(500).json({ message: "Error fetching novel" });
    }
  });

  // Create novel (author only)
  app.post("/api/novels", isAuthor, async (req: Request, res: Response) => {
    try {
      const validatedData = insertNovelSchema.parse({
        ...req.body,
        authorId: req.user?.id,
      });
      
      const novel = await storage.createNovel(validatedData);
      res.status(201).json(novel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating novel" });
    }
  });

  // Update novel (author only)
  app.put("/api/novels/:id", isAuthor, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      // Check if novel exists and belongs to the author
      const existingNovel = await storage.getNovel(id);
      if (!existingNovel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      
      if (existingNovel.authorId !== req.user?.id) {
        return res.status(403).json({ message: "You can only update your own novels" });
      }
      
      // Validate partial data
      const validatedData = insertNovelSchema.partial().parse(req.body);
      
      const novel = await storage.updateNovel(id, validatedData);
      res.json(novel);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating novel" });
    }
  });

  // Delete novel (author only)
  app.delete("/api/novels/:id", isAuthor, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      // Check if novel exists and belongs to the author
      const existingNovel = await storage.getNovel(id);
      if (!existingNovel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      
      if (existingNovel.authorId !== req.user?.id) {
        return res.status(403).json({ message: "You can only delete your own novels" });
      }
      
      const success = await storage.deleteNovel(id);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Error deleting novel" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting novel" });
    }
  });

  // Get chapters by novel ID
  app.get("/api/novels/:novelId/chapters", async (req, res) => {
    try {
      const novelId = Number(req.params.novelId);
      if (isNaN(novelId)) {
        return res.status(400).json({ message: "Invalid novel ID" });
      }
      
      const allChapters = await storage.getChaptersByNovel(novelId);
      
      // Get the novel to check if current user is the author
      const novel = await storage.getNovel(novelId);
      const isAuthor = req.isAuthenticated() && req.user?.id === novel?.authorId;
      
      // For non-authors, filter out draft chapters
      const chapters = isAuthor
        ? allChapters
        : allChapters.filter(chapter => chapter.status === "published");
      
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Error fetching chapters" });
    }
  });

  // Get a specific chapter by novelId and chapterNumber
  app.get("/api/novels/:novelId/chapters/:chapterNumber", async (req, res) => {
    try {
      const novelId = Number(req.params.novelId);
      const chapterNumber = Number(req.params.chapterNumber);

      if (isNaN(novelId) || novelId <= 0 || isNaN(chapterNumber) || chapterNumber <= 0) {
        return res.status(400).json({ message: "Invalid novel ID or chapter number" });
      }

      const chapter = await storage.getChapter(novelId, chapterNumber);

      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Fetch the novel to check the author
      const novel = await storage.getNovel(novelId);
      
      // Check if chapter is published or if user is the author of the novel
      const isAuthor = req.user && novel && req.user.id === novel.authorId;
      const isPublished = chapter.status === 'published';

      if (!isPublished && !isAuthor) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Increment view count only for published chapters when accessed by non-author
      if (isPublished && !isAuthor) {
        await storage.incrementChapterViews(novelId, chapterNumber);
      }
      
      res.json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      res.status(500).json({ message: "Error fetching chapter" });
    }
  });

  // Create chapter (author only)
  app.post("/api/novels/:novelId/chapters", isAuthor, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      // Validate input data based on the schema
      const validatedData = insertChapterSchema.parse({
        ...req.body,
        novelId, // novelId is expected by insertChapterSchema
        authorId: req.user?.id, // Add authorId here as it is part of the schema definition now
      });

      const chapter = await storage.createChapter(validatedData);

      res.status(201).json(chapter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Error creating chapter" });
    }
  });

  // === Bookmark Routes ===
  
  // Get user's bookmarks
  app.get("/api/bookmarks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookmarks = await storage.getBookmarksByUser(req.user?.id || 0);
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching bookmarks" });
    }
  });

  // Check if a novel is bookmarked
  app.get("/api/bookmarks/:novelId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      const bookmark = await storage.getBookmark(req.user?.id || 0, novelId);
      res.json(bookmark || null);
    } catch (error) {
      res.status(500).json({ message: "Error checking bookmark status" });
    }
  });

  // Add bookmark
  app.post("/api/bookmarks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertBookmarkSchema.parse({
        ...req.body,
        userId: req.user?.id,
      });
      
      // Check if already bookmarked
      const existingBookmark = await storage.getBookmark(req.user?.id || 0, validatedData.novelId);
      if (existingBookmark) {
        return res.status(400).json({ message: "Novel already bookmarked" });
      }
      
      const bookmark = await storage.createBookmark(validatedData);
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating bookmark" });
    }
  });

  // Remove bookmark
  app.delete("/api/bookmarks/:novelId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      
      const success = await storage.deleteBookmark(req.user?.id || 0, novelId);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(404).json({ message: "Bookmark not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting bookmark" });
    }
  });

  // === Reading Progress Routes ===
  
  // Get user's reading progress for a novel
  app.get("/api/reading-progress/:novelId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      
      const progress = await storage.getReadingProgress(req.user?.id || 0, novelId);
      if (!progress) {
        return res.status(404).json({ message: "No reading progress found" });
      }
      
      // Convert snake_case to camelCase
      res.json(toCamelCase(progress));
    } catch (error) {
      res.status(500).json({ message: "Error fetching reading progress" });
    }
  });

  // Get user's latest reading progress
  app.get("/api/reading-progress/latest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get recent reading progress and return the most recent one
      const recentlyRead = await storage.getRecentlyRead(req.user.id, 1);
      
      if (recentlyRead && recentlyRead.length > 0) {
        try {
          // Fetch associated novel and chapter data for the reading progress
          const novel = await storage.getNovel(recentlyRead[0].novelId);
          // Use getChapterById which takes chapterId
          const chapter = await storage.getChapterById(recentlyRead[0].chapterId);
          
          if (novel && chapter) {
            return res.json(toCamelCase({
              ...recentlyRead[0],
              novel,
              chapter
            }));
          }
        } catch (innerError) {
          console.error("Error fetching novel or chapter:", innerError);
        }
      }
      
      // If we got here, we didn't find valid reading progress
      return res.json(null);
    } catch (error) {
      console.error("Error fetching latest reading progress:", error);
      return res.status(200).json(null); // Return null with 200 status instead of error
    }
  });

  // Get user's recently read novels with enhanced error handling
  app.get("/api/reading-progress/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Received request to /api/reading-progress/recent");
      
      if (!req.user?.id) {
        console.log("Unauthorized request to reading-progress/recent (no user.id)");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Make sure the user ID is a valid number
      const userId = Number(req.user.id);
      if (isNaN(userId) || userId <= 0) {
        console.error("Invalid user ID:", req.user.id);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Parse limit with a fallback value
      let limit = 10; // Default limit
      if (req.query.limit) {
        const parsedLimit = parseInt(String(req.query.limit), 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        } else {
          console.warn(`Invalid limit parameter: ${req.query.limit}, using default (10)`);
        }
      }
      
      console.log(`Fetching reading history for user ${userId} with limit ${limit}`);
      
      // Get reading progress with robust error handling
      let recentlyRead = [];
      try {
        recentlyRead = await storage.getRecentlyRead(userId, limit);
        console.log(`Found ${recentlyRead?.length || 0} reading progress items`);
      } catch (error: any) { // Use 'any' type to avoid TypeScript errors
        console.error("Error fetching reading progress:", error);
        return res.status(500).json({ 
          message: "Error fetching reading progress", 
          error: error?.message || "Unknown error"
        });
      }
      
      res.json(recentlyRead || []);
    } catch (error: any) { // Use 'any' type to avoid TypeScript errors
      console.error("Error in /api/reading-progress/recent endpoint:", error);
      res.status(500).json({ 
        message: "Server error", 
        error: error?.message || "Unknown error"
      });
    }
  });

  // Update reading progress
  app.post("/api/reading-progress", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertReadingProgressSchema.parse({
        ...req.body,
        userId: req.user?.id,
      });
      
      const progress = await storage.createOrUpdateReadingProgress(validatedData);
      
      // Convert snake_case to camelCase before returning
      res.status(201).json(toCamelCase(progress));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating reading progress" });
    }
  });

  // === Comment Routes ===
  
  // Get comments for an author
  app.get("/api/authors/:authorId/comments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authorId = Number(req.params.authorId);
      
      // Check if the authenticated user is the author
      if (req.user?.id !== authorId) {
        return res.status(403).json({ message: "You can only view comments for your own novels" });
      }
      
      // Get limit from query params or use default
      const limit = Number(req.query.limit) || 50;
      
      // Get all comments for the author's novels
      const comments = await storage.getCommentsByAuthor(authorId, limit);
      
      // Make sure each comment has proper user data
      const enhancedComments = await Promise.all(
        comments.map(async (comment: any) => {
          // If the comment already has valid user info, use it
          if (comment.user && comment.user.username) {
            return comment;
          }
          
          // Otherwise, try to fetch user info
          try {
            const user = await storage.getUser(comment.userId);
            return {
              ...comment,
              user: user ? {
                id: user.id,
                username: user.username
              } : {
                id: comment.userId,
                username: `User ${comment.userId}`
              }
            };
          } catch (error) {
            console.error(`Error fetching user data for comment ${comment.id}:`, error);
            return {
              ...comment,
              user: {
                id: comment.userId,
                username: `User ${comment.userId}`
              }
            };
          }
        })
      );
      
      res.json(enhancedComments);
    } catch (error) {
      console.error("Error fetching author comments:", error);
      res.status(500).json({ message: "Error fetching comments" });
    }
  });
  
  // Get comments for a chapter
  app.get("/api/chapters/:chapterId/comments", async (req, res) => {
    try {
      const chapterId = Number(req.params.chapterId);
      
      // Get raw comments from storage
      const rawComments = await storage.getCommentsByChapter(chapterId);
      
      // Process comments to include user information
      const commentsWithUsers = await Promise.all(
        rawComments.map(async (comment: Comment) => {
          if (!comment.userId) {
            return {
              ...comment,
              user: { id: 0, username: "Anonymous" }
            };
          }
          
          try {
            // Get user data
            const user = await storage.getUser(comment.userId);
            
            return {
              ...comment,
              user: user ? {
                id: user.id,
                username: user.username
              } : { 
                id: comment.userId, 
                username: `User ${comment.userId}` 
              }
            };
          } catch (userError) {
            console.error(`Error fetching user ${comment.userId}:`, userError);
            return {
              ...comment,
              user: { 
                id: comment.userId, 
                username: `User ${comment.userId}` 
              }
            };
          }
        })
      );
      
      res.json(commentsWithUsers);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Error fetching comments" });
    }
  });

  // Add comment
  app.post("/api/chapters/:chapterId/comments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const chapterId = Number(req.params.chapterId);
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        userId: req.user?.id,
        chapterId,
      });
      
      // Check if this is a reply and enforce the maximum reply chain depth
      if (validatedData.parentId) {
        const parentCommentDepth = await storage.getCommentDepth(validatedData.parentId);
        const MAX_DEPTH = 6; // Maximum depth of the reply chain (original comment + 5 replies)
        if (parentCommentDepth >= MAX_DEPTH) {
          return res.status(400).json({ message: `Maximum reply depth of ${MAX_DEPTH - 1} reached for this comment chain.` });
        }
      }

      const comment = await storage.createComment(validatedData);
      
      // Add user data to the response
      const user = await storage.getUser(req.user?.id || 0);
      const commentWithUser: CommentWithUser = {
        ...comment,
        user: {
          id: user?.id || req.user?.id || 0,
          username: user?.username || `User ${req.user?.id}`
        }
      };
      
      res.status(201).json(commentWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Error creating comment" });
    }
  });

  // Delete comment
  app.delete("/api/comments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      // Check if comment exists
      const comment = await storage.getComment(id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Get the chapter using getChapterById
      const chapter = await storage.getChapterById(comment.chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      // Get the novel to check if current user is the author
      const novel = await storage.getNovel(chapter.novelId);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      
      // Current user can delete comment if they:
      // 1. Are the comment author, or
      // 2. Are the novel author
      if (comment.userId !== req.user?.id && novel.authorId !== req.user?.id) {
        return res.status(403).json({ 
          message: "You can only delete your own comments or comments on your novels" 
        });
      }
      
      const success = await storage.deleteComment(id);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Error deleting comment" });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Error deleting comment" });
    }
  });

  // Like/unlike a comment
  app.post("/api/comments/:id/like", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const commentId = Number(req.params.id);
      const userId = req.user?.id;
      
      console.log(`Attempting to toggle like for comment ${commentId} by user ${userId}`);
      
      if (!userId) {
        console.log("Authentication failed - no user ID");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check if comment exists
      const comment = await storage.getComment(commentId);
      if (!comment) {
        console.log(`Comment ${commentId} not found`);
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Check if user already liked this comment
      console.log(`Checking if user ${userId} already liked comment ${commentId}`);
      const hasLiked = await storage.hasUserLikedComment(userId, commentId);
      console.log(`User has liked: ${hasLiked}`);
      
      if (hasLiked) {
        // User already liked, so unlike
        console.log(`Deleting like for comment ${commentId} by user ${userId}`);
        const result = await storage.deleteCommentLike(userId, commentId);
        console.log(`Delete result: ${result}`);
        res.status(200).json({ 
          liked: false, 
          message: "Comment unliked successfully",
          likes: Math.max(0, (comment.likes || 1) - 1) // Ensure we don't go below 0
        });
      } else {
        // User hasn't liked, so add like
        console.log(`Creating like for comment ${commentId} by user ${userId}`);
        const result = await storage.createCommentLike({ userId, commentId });
        console.log(`Created like with ID: ${result.id}`);
        res.status(200).json({ 
          liked: true, 
          message: "Comment liked successfully",
          likes: (comment.likes || 0) + 1
        });
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
      res.status(500).json({ message: "Error processing like" });
    }
  });
  
  // Check if user has liked a comment
  app.get("/api/comments/:id/liked", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const commentId = Number(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const hasLiked = await storage.hasUserLikedComment(userId, commentId);
      res.json({ liked: hasLiked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ message: "Error checking like status" });
    }
  });

  // === Review Routes ===
  
  // Get reviews for a novel
  app.get("/api/novels/:novelId/reviews", async (req, res) => {
    try {
      const novelId = Number(req.params.novelId);
      
      const reviews = await storage.getReviewsByNovel(novelId);
      
      // Add user information to each review
      const reviewsWithUsers = await Promise.all(
        reviews.map(async (review: Review) => {
          try {
            const user = await storage.getUser(review.userId);
            return {
              ...review,
              user: user ? {
                id: user.id,
                username: user.username
              } : {
                id: review.userId,
                username: `User ${review.userId}`
              }
            };
          } catch (error) {
            console.error(`Error fetching user for review ${review.id}:`, error);
            return {
              ...review,
              user: {
                id: review.userId,
                username: `User ${review.userId}`
              }
            };
          }
        })
      );
      
      res.json(reviewsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });

  // Get user's review for a novel
  app.get("/api/novels/:novelId/reviews/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      const review = await storage.getReviewByUserAndNovel(req.user?.id || 0, novelId);
      res.json(review || null);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user review" });
    }
  });

  // Add or update review
  app.post("/api/novels/:novelId/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const novelId = Number(req.params.novelId);
      
      const validatedData = insertReviewSchema.parse({
        ...req.body,
        userId: req.user?.id,
        novelId,
      });
      
      // Check if user already reviewed this novel
      const existingReview = await storage.getReviewByUserAndNovel(req.user?.id || 0, novelId);
      
      if (existingReview) {
        // Update existing review
        const review = await storage.updateReview(existingReview.id, validatedData);
        // Add user data to response
        const user = await storage.getUser(req.user?.id || 0);
        return res.json({
          ...review,
          user: {
            id: user?.id || req.user?.id || 0,
            username: user?.username || `User ${req.user?.id}`
          }
        });
      }
      
      // Create new review
      const review = await storage.createReview(validatedData);
      // Add user data to response
      const user = await storage.getUser(req.user?.id || 0);
      const reviewWithUser: ReviewWithUser = {
        ...review,
        user: {
          id: user?.id || req.user?.id || 0,
          username: user?.username || `User ${req.user?.id}`
        }
      };
      
      res.status(201).json(reviewWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error saving review" });
    }
  });

  // Delete review
  app.delete("/api/reviews/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      // Check if review exists
      const review = await storage.getReview(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Get the novel to check if current user is the author
      const novel = await storage.getNovel(review.novelId);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      
      // Current user can delete review if they:
      // 1. Are the review author, or
      // 2. Are the novel author
      if (review.userId !== req.user?.id && novel.authorId !== req.user?.id) {
        return res.status(403).json({ 
          message: "You can only delete your own reviews or reviews on your novels" 
        });
      }
      
      const success = await storage.deleteReview(id);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Error deleting review" });
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Error deleting review" });
    }
  });

  // Get user information by ID - useful for comment display
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without sensitive data
      const { password, email, ...safeUserData } = user;
      res.json(safeUserData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Update username (authenticated users only)
  app.put("/api/users/me/username", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { username } = req.body;

      if (!userId || !username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const updatedUser = await storage.updateUser(userId, { username });

      if (updatedUser) {
        // Return user without sensitive data
        const { password, email, ...safeUserData } = updatedUser;
        res.json(safeUserData);
      } else {
        res.status(500).json({ message: "Error updating username" });
      }
    } catch (error) {
      console.error("Error updating username:", error);
      res.status(500).json({ message: "Error updating username" });
    }
  });

  // Update password (authenticated users only)
  app.put("/api/users/me/password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
         return res.status(400).json({ message: "Invalid request data. New password must be at least 8 characters." });
      }

      // Get the user to verify the current password
      const user = await storage.getUser(userId);
      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      // Compare current password
      const isMatch = await comparePasswords(currentPassword, user.password);
      if (!isMatch) {
         return res.status(401).json({ message: "Incorrect current password" });
      }

      // Hash the new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update the password in the database
      const updatedUser = await storage.updateUser(userId, { password: hashedNewPassword });

      if (updatedUser) {
         res.json({ message: "Password updated successfully" });
      } else {
         res.status(500).json({ message: "Error updating password" });
      }

    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Error updating password" });
    }
  });

  app.get("/api/novels/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const searchType = (req.query.type as string) || 'all'; // Add search type parameter
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 12;
      const offset = (page - 1) * limit;
      
      // Sanitize the search query to prevent SQL injection
      const sanitizedQuery = query.trim().replace(/[%_]/g, '\\$&');
      
      // First get all novels
      const allNovels = await db.select().from(novels).where(sql`
        novels.title ILIKE ${`%${sanitizedQuery}%`} OR
        novels.status = 'published'
      `);
      
      // Filter novels based on search type
      const filteredNovels = [];
      
      for (const novel of allNovels) {
        let shouldInclude = false;
        
        switch (searchType) {
          case 'tags':
            // Check if any genre matches the query
            shouldInclude = novel.genres.some(genre => 
              genre.toLowerCase().includes(query.toLowerCase())
            );
            break;
            
          case 'author':
            // Check if author name matches
            try {
              if (novel.authorId) {
                const author = await storage.getUser(novel.authorId);
                if (author && author.username) {
                  shouldInclude = author.username.toLowerCase().includes(query.toLowerCase());
                }
              }
            } catch (error) {
              console.error(`Error fetching author for novel ${novel.id}:`, error);
            }
            break;
            
          case 'title':
            // Check if title matches
            shouldInclude = novel.title.toLowerCase().includes(query.toLowerCase());
            break;
            
          default: // 'all'
            // Check both title and author
            const titleMatches = novel.title.toLowerCase().includes(query.toLowerCase());
            let authorMatches = false;
            try {
              if (novel.authorId) {
                const author = await storage.getUser(novel.authorId);
                if (author && author.username) {
                  authorMatches = author.username.toLowerCase().includes(query.toLowerCase());
                }
              }
            } catch (error) {
              console.error(`Error fetching author for novel ${novel.id}:`, error);
            }
            shouldInclude = titleMatches || authorMatches;
        }
        
        if (shouldInclude) {
          filteredNovels.push(novel);
        }
      }
      
      // Calculate pagination
      const totalCount = filteredNovels.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedNovels = filteredNovels.slice(offset, offset + limit);
      
      // Return results with pagination info
      res.json({
        novels: paginatedNovels,
        page,
        limit,
        totalCount,
        totalPages,
        searchType // Include search type in response
      });
    } catch (error) {
      console.error("Error searching novels:", error);
      res.status(500).json({ message: "Error searching novels" });
    }
  });

  // Delete chapter by chapterId (author only)
  app.delete("/api/chapters/:chapterId", isAuthor, async (req: Request, res: Response) => {
    try {
      const chapterId = Number(req.params.chapterId);
      console.log('Attempting to delete chapter with id:', chapterId);
      if (isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid chapter ID" });
      }
      // Fetch the chapter to get novelId and chapterNumber
      const chapter = await storage.getChapterById(chapterId);
      console.log('Fetched chapter:', chapter);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      // Fetch the novel to check the author
      const novel = await storage.getNovel(chapter.novelId);
      console.log('Fetched novel:', novel);
      if (!novel) {
        return res.status(404).json({ message: "Novel not found" });
      }
      console.log('Current user:', req.user?.id, 'Novel author:', novel.authorId);
      if (novel.authorId !== req.user?.id) {
        return res.status(403).json({ message: "You can only delete your own chapters" });
      }
      const success = await storage.deleteChapterById(chapterId);
      console.log('Delete success:', success);
      if (success) {
        res.sendStatus(204);
      } else {
        res.status(500).json({ message: "Error deleting chapter" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error deleting chapter" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}