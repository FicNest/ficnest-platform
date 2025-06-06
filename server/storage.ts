import { 
  users, type User, type InsertUser, 
  novels, type Novel, type InsertNovel,
  chapters, type Chapter, type InsertChapter,
  bookmarks, type Bookmark, type InsertBookmark,
  readingProgress, type ReadingProgress, type InsertReadingProgress,
  comments, type Comment, type InsertComment,
  reviews, type Review, type InsertReview,
  commentLikes, type CommentLike, type InsertCommentLike,
  authMapping, type AuthMapping, type InsertAuthMapping
} from "../shared/schema.js";
import { db, pool } from "./db.js";
import { eq, and, desc, isNull, isNotNull, inArray, sql, asc, avg } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Define comment with additional metadata for the dashboard
export interface CommentWithMetadata extends Comment {
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
}

export interface IStorage {
  //Latest chapters
  getLatestChapters(limit: number): Promise<Chapter[]>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Novel operations
  getNovel(id: number): Promise<Novel | undefined>;
  getNovels(limit: number, offset: number, sortBy?: string, sortOrder?: string): Promise<Novel[]>;
  getNovelsByAuthor(authorId: number): Promise<Novel[]>;
  getNovelsByGenre(genre: string, limit: number, offset: number): Promise<Novel[]>;
  getLatestNovels(limit: number): Promise<Novel[]>;
  createNovel(novel: InsertNovel): Promise<Novel>;
  updateNovel(id: number, novel: Partial<InsertNovel>): Promise<Novel | undefined>;
  deleteNovel(id: number): Promise<boolean>;
  incrementNovelViews(id: number): Promise<void>;
  
  // Chapter operations
  getChapter(novelId: number, chapterNumber: number): Promise<Chapter | undefined>;
  getChaptersByNovel(novelId: number): Promise<Chapter[]>;
  getChapterById(chapterId: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(novelId: number, chapterNumber: number, updateChapter: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(novelId: number, chapterNumber: number): Promise<boolean>;
  incrementChapterViews(novelId: number, chapterNumber: number): Promise<void>;
  deleteChapterById(chapterId: number): Promise<boolean>;
  
  // Bookmark operations
  getBookmark(userId: number, novelId: number): Promise<Bookmark | undefined>;
  getBookmarksByUser(userId: number): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(userId: number, novelId: number): Promise<boolean>;
  
  // Reading Progress operations
  getReadingProgress(userId: number, novelId: number): Promise<ReadingProgress | undefined>;
  getRecentlyRead(userId: number, limit: number): Promise<ReadingProgress[]>;
  createOrUpdateReadingProgress(progress: InsertReadingProgress): Promise<ReadingProgress>;
  
  // Comment operations
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByChapter(chapterId: number): Promise<Comment[]>;
  getCommentsByAuthor(authorId: number, limit?: number): Promise<CommentWithMetadata[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Comment Like operations
  getCommentLike(userId: number, commentId: number): Promise<CommentLike | undefined>;
  getCommentLikesByUser(userId: number): Promise<CommentLike[]>;
  createCommentLike(data: InsertCommentLike): Promise<CommentLike>;
  deleteCommentLike(userId: number, commentId: number): Promise<boolean>;
  hasUserLikedComment(userId: number, commentId: number): Promise<boolean>;
  
  // Auth Mapping operations
  findAuthMappingBySupabaseUid(supabaseUid: string): Promise<AuthMapping | undefined>;
  createAuthMapping(authMapping: InsertAuthMapping): Promise<AuthMapping>;
  
  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByNovel(novelId: number): Promise<Review[]>;
  getReviewByUserAndNovel(userId: number, novelId: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;

  // Get novel by name
  getNovelByName(name: string): Promise<Novel | null>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(updateUser)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      return undefined;
    }
  }

  // Novel operations
  async getNovel(id: number): Promise<Novel | undefined> {
    try {
      const [novel] = await db.select().from(novels).where(eq(novels.id, id));
      return novel;
    } catch (error) {
      console.error(`Error getting novel ${id}:`, error);
      return undefined;
    }
  }

  async getNovels(limit: number, offset: number, sortBy?: string, sortOrder?: string): Promise<Novel[]> {
    try {
      let query = db
        .select({
          id: novels.id,
          title: novels.title,
          description: novels.description,
          coverImage: novels.coverImage,
          authorId: novels.authorId,
          genres: novels.genres,
          status: novels.status,
          contentRating: novels.contentRating,
          viewCount: novels.viewCount,
          bookmarkCount: novels.bookmarkCount,
          createdAt: novels.createdAt,
          updatedAt: novels.updatedAt,
          // Calculate average rating and count reviews
          averageRating: sql<number | null>`avg(${reviews.rating})`.as('averageRating'),
          reviewCount: sql<number>`count(${reviews.rating})`.as('reviewCount')
        })
        .from(novels)
        .leftJoin(reviews, eq(novels.id, reviews.novelId))
        .where(eq(novels.status, "published"))
        .groupBy(novels.id);

      // Determine the column and order for sorting
      let orderByClause;
      const order = sortOrder === 'asc' ? asc : desc;
      const orderSql = sortOrder === 'asc' ? sql`ASC` : sql`DESC`;

      switch (sortBy) {
        case 'viewCount':
          orderByClause = order(novels.viewCount);
          break;
        case 'bookmarkCount':
          orderByClause = order(novels.bookmarkCount);
          break;
        case 'rating':
          // Sort primarily by the number of reviews (descending), then by average rating, then createdAt
          const reviewCountOrder = desc(sql`count(${reviews.rating})`);
          // Keep average rating as a secondary sort and for potential display
          const ratingOrder = desc(sql`avg(${reviews.rating})`);
          orderByClause = [reviewCountOrder, ratingOrder, desc(novels.createdAt)];
          break;
        default:
          // Default sort by creation date
          orderByClause = desc(novels.createdAt);
      }

      // Apply ordering, limit, and offset
      // Need to cast query to 'any' for the complex orderBy clause
      const novelsResult = await (query as any).orderBy(...(Array.isArray(orderByClause) ? orderByClause : [orderByClause])).limit(limit).offset(offset);

      console.log(`Fetched ${novelsResult.length} published novels with pagination, sorted by ${sortBy || 'createdAt'} ${sortOrder || 'desc'}`);
      console.log('Server-side getNovels result (first 10):', novelsResult.slice(0, 10)); // Log first 10 novels for brevity

      return novelsResult as Novel[]; // Cast back to Novel[] for consistency

    } catch (error) {
      console.error("Error in getNovels:", error);
      return []; // Return empty array on error
    }
  }

  async getNovelsByAuthor(authorId: number): Promise<Novel[]> {
    return db.select().from(novels).where(eq(novels.authorId, authorId));
  }

  async getNovelsByGenre(
    genre: string,
    limit: number,
    offset: number
  ): Promise<Novel[]> {
    try {
      // Filter by status and genre directly in the database query
      const genreLower = genre.toLowerCase();

      const novelsByGenre = (await db
        .select()
        .from(novels)
        .where(
          and(
            eq(novels.status, "published"),
            // Using sql template for case-insensitive check within the array
            sql`${genreLower} = ANY(lower(novels.genres)::text[])` // Cast genres to text array for lower()
          )
        )
        .limit(limit) // Apply limit in the query
        .offset(offset)) as Novel[]; // <-- Explicit type assertion here

      console.log(`Fetched ${novelsByGenre.length} novels for genre: ${genre}`);

      return novelsByGenre;

    } catch (error) {
      console.error(`Error in getNovelsByGenre for genre ${genre}:`, error);
      // Return empty array on error
      return [];
    }
  }

  async getLatestNovels(limit: number): Promise<Novel[]> {
    return db
      .select()
      .from(novels)
      .where(eq(novels.status, "published"))
      .orderBy(desc(novels.createdAt))
      .limit(limit);
  }

  async createNovel(insertNovel: InsertNovel): Promise<Novel> {
    const [novel] = await db.insert(novels).values(insertNovel).returning();
    return novel;
  }

  async updateNovel(id: number, updateNovel: Partial<InsertNovel>): Promise<Novel | undefined> {
    const [novel] = await db
      .update(novels)
      .set({ ...updateNovel, updatedAt: new Date() })
      .where(eq(novels.id, id))
      .returning();
    return novel;
  }

  async deleteNovel(id: number): Promise<boolean> {
    const result = await db.delete(novels).where(eq(novels.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementNovelViews(id: number): Promise<void> {
    // First get the current view count
    const novel = await this.getNovel(id);
    if (novel) {
      // Then increment it
      await db
        .update(novels)
        .set({ viewCount: novel.viewCount + 1 })
        .where(eq(novels.id, id));
    }
  }

  // Chapter operations
  async getChapter(novelId: number, chapterNumber: number): Promise<Chapter | undefined> {
    const [chapter] = await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.novelId, novelId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      );
    return chapter;
  }

  async getChaptersByNovel(novelId: number): Promise<Chapter[]> {
    return db
      .select()
      .from(chapters)
      .where(eq(chapters.novelId, novelId))
      .orderBy(chapters.chapterNumber);
  }

  async getChapterById(chapterId: number): Promise<Chapter | undefined> {
    try {
      const [chapter] = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, chapterId));
      return chapter;
    } catch (error) {
      console.error(`Error getting chapter by ID ${chapterId}:`, error);
      return undefined;
    }
  }

  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const [chapter] = await db.insert(chapters).values(insertChapter).returning();
    return chapter;
  }

  async updateChapter(novelId: number, chapterNumber: number, updateChapter: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const [chapter] = await db
      .update(chapters)
      .set({ ...updateChapter, updatedAt: new Date() })
      .where(
        and(
          eq(chapters.novelId, novelId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      )
      .returning();
    return chapter;
  }

  async deleteChapter(novelId: number, chapterNumber: number): Promise<boolean> {
    const result = await db
      .delete(chapters)
      .where(
        and(
          eq(chapters.novelId, novelId),
          eq(chapters.chapterNumber, chapterNumber)
        )
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementChapterViews(novelId: number, chapterNumber: number): Promise<void> {
    // First get the current view count
    const chapter = await this.getChapter(novelId, chapterNumber);
    if (chapter) {
      // Then increment it
      await db
        .update(chapters)
        .set({ viewCount: chapter.viewCount + 1 })
        .where(
          and(
            eq(chapters.novelId, novelId),
            eq(chapters.chapterNumber, chapterNumber)
          )
        );
    }
  }

  async deleteChapterById(chapterId: number): Promise<boolean> {
    const result = await db
      .delete(chapters)
      .where(eq(chapters.id, chapterId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Bookmark operations
  async getBookmark(userId: number, novelId: number): Promise<Bookmark | undefined> {
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.novelId, novelId)
        )
      );
    return bookmark;
  }

  async getBookmarksByUser(userId: number): Promise<Bookmark[]> {
    return db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values(insertBookmark).returning();
    // Increment bookmark count in novel
    const novel = await this.getNovel(insertBookmark.novelId);
    if (novel) {
      await db
        .update(novels)
        .set({ bookmarkCount: novel.bookmarkCount + 1 })
        .where(eq(novels.id, insertBookmark.novelId));
    }
    return bookmark;
  }

  async deleteBookmark(userId: number, novelId: number): Promise<boolean> {
    const result = await db
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.novelId, novelId)
        )
      );
    
    if (result.rowCount && result.rowCount > 0) {
      // Decrement bookmark count in novel
      const novel = await this.getNovel(novelId);
      if (novel && novel.bookmarkCount > 0) {
        await db
          .update(novels)
          .set({ bookmarkCount: novel.bookmarkCount - 1 })
          .where(eq(novels.id, novelId));
      }
      return true;
    }
    return false;
  }

  // Reading Progress operations with fixed TypeScript errors
  async getReadingProgress(userId: number, novelId: number): Promise<ReadingProgress | undefined> {
    try {
      const [result] = await db
        .select()
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.userId, userId),
            eq(readingProgress.novelId, novelId)
          )
        )
        .orderBy(desc(readingProgress.lastReadAt));
      
      if (!result) return undefined;
      
      // Convert Date to string if needed before returning
      return {
        ...result,
        lastReadAt: result.lastReadAt instanceof Date 
          ? result.lastReadAt.toISOString() 
          : String(result.lastReadAt)
      };
    } catch (error) {
      console.error(`Error getting reading progress for user ${userId}, novel ${novelId}:`, error);
      return undefined;
    }
  }

  async getRecentlyRead(userId: number, limit: number): Promise<ReadingProgress[]> {
    try {
      console.log(`Getting recently read items for user ${userId} with limit ${limit}`);
      
      // Ensure userId and limit are valid numbers
      if (typeof userId !== 'number' || isNaN(userId) || userId <= 0) {
        console.error("Invalid userId provided:", userId);
        return [];
      }
      
      if (typeof limit !== 'number' || isNaN(limit) || limit <= 0) {
        // Default to a reasonable limit if invalid
        limit = 10;
        console.warn("Invalid limit, using default of 10");
      }
      
      // Use explicit casting to ensure correct types for the database
      const safeUserId = parseInt(String(userId), 10);
      
      // First get all reading progress items for this user
      const results = await db
        .select()
        .from(readingProgress)
        .where(eq(readingProgress.userId, safeUserId))
        .orderBy(desc(readingProgress.lastReadAt));
      
      console.log(`Found ${results?.length || 0} total reading progress items for user`);
      
      // Create a map to store only the most recent progress for each novel
      const novelMap = new Map<number, any>();
      
      // Keep only the most recent progress for each novel
      results.forEach(progress => {
        if (!novelMap.has(progress.novelId)) {
          novelMap.set(progress.novelId, progress);
        }
      });
      
      // Convert the map values to an array
      const uniqueResults = Array.from(novelMap.values());
      
      // Sort by lastReadAt date (newest first)
      uniqueResults.sort((a, b) => {
        const dateA = new Date(a.lastReadAt).getTime();
        const dateB = new Date(b.lastReadAt).getTime();
        return dateB - dateA;
      });
      
      // Apply limit
      const limitedResults = uniqueResults.slice(0, limit);
      
      console.log(`Returning ${limitedResults.length} unique novel progress items`);
      
      // Process results and properly handle date types
      return limitedResults.map(item => ({
        ...item,
        // Convert Date objects to ISO strings to ensure type consistency
        lastReadAt: item.lastReadAt instanceof Date 
          ? item.lastReadAt.toISOString() 
          : String(item.lastReadAt)
      }));
    } catch (error: any) {
      console.error("Error in getRecentlyRead:", error);
      // Provide detailed error information for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      return []; // Return empty array on error
    }
  }

  async createOrUpdateReadingProgress(insertProgress: InsertReadingProgress): Promise<ReadingProgress> {
    try {
      console.log(`Creating/updating reading progress for user ${insertProgress.userId}, novel ${insertProgress.novelId}, chapter ${insertProgress.chapterId}`);
      
      // Store the progress as provided (chapter-based progress)
      const currentTime = new Date();
      
      // First check if there's an existing progress record for this user and novel
      const [existingProgressForNovel] = await db
        .select()
        .from(readingProgress)
        .where(
          and(
            eq(readingProgress.userId, insertProgress.userId),
            eq(readingProgress.novelId, insertProgress.novelId)
          )
        )
        .orderBy(desc(readingProgress.lastReadAt));
        
      // If the user already had progress for this novel
      if (existingProgressForNovel) {
        // Update the existing record
        console.log(`Updating existing progress record (ID: ${existingProgressForNovel.id})`);
        
        const [progress] = await db
          .update(readingProgress)
          .set({
            chapterId: insertProgress.chapterId, // Update to new chapter
            progress: insertProgress.progress,  // Use the provided novel-wide progress
            lastReadAt: currentTime,
          })
          .where(eq(readingProgress.id, existingProgressForNovel.id))
          .returning();
        
        return {
          ...progress,
          lastReadAt: progress.lastReadAt instanceof Date 
            ? progress.lastReadAt.toISOString() 
            : String(progress.lastReadAt)
        };
      } else {
        // No existing progress for this novel, create a new record
        console.log(`Creating first progress record for novel ${insertProgress.novelId}`);
        
        const [progress] = await db
          .insert(readingProgress)
          .values({
            ...insertProgress,
            lastReadAt: currentTime,
          })
          .returning();
        
        return {
          ...progress,
          lastReadAt: progress.lastReadAt instanceof Date 
            ? progress.lastReadAt.toISOString() 
            : String(progress.lastReadAt)
        };
      }
    } catch (error) {
      console.error("Error in createOrUpdateReadingProgress:", error);
      throw error;
    }
  }

  // Comment operations
  async getComment(id: number): Promise<Comment | undefined> {
    try {
      const [comment] = await db.select().from(comments).where(eq(comments.id, id)) as Comment[];
      return comment;
    } catch (error) {
      console.error("Error getting comment:", error);
      return undefined;
    }
  }

  async getCommentsByChapter(chapterId: number): Promise<Comment[]> {
    try {
      // Get all comments for this chapter
      const allComments = await db
        .select()
        .from(comments)
        .where(eq(comments.chapterId, chapterId))
        .orderBy(desc(comments.createdAt)) as Comment[];
      
      return allComments;
    } catch (error) {
      console.error("Error getting comments by chapter:", error);
      return [];
    }
  }

  // Get comments for an author
  async getCommentsByAuthor(authorId: number, limit: number = 20): Promise<CommentWithMetadata[]> {
    try {
      console.log(`Getting comments for author ${authorId}`);
      
      // Get all novels by the author
      const authorNovels = await this.getNovelsByAuthor(authorId);
      if (!authorNovels || authorNovels.length === 0) {
        console.log("No novels found for author");
        return [];
      }
      
      console.log(`Found ${authorNovels.length} novels for author`);
      
      // Get all chapters for these novels
      const allChapters: Chapter[] = [];
      for (const novel of authorNovels) {
        try {
          const chapters = await this.getChaptersByNovel(novel.id);
          if (chapters && chapters.length > 0) {
            allChapters.push(...chapters);
          }
        } catch (error) {
          console.error(`Error getting chapters for novel ${novel.id}:`, error);
        }
      }
      
      if (allChapters.length === 0) {
        console.log("No chapters found for author's novels");
        return [];
      }
      
      console.log(`Found ${allChapters.length} chapters for author's novels`);
      
      // Get comments for all chapters
      const allComments: CommentWithMetadata[] = [];
      
      // Since we can't process everything at once, process in batches
      for (const chapter of allChapters) {
        try {
          const chapterComments = await this.getCommentsByChapter(chapter.id);
          
          if (chapterComments && chapterComments.length > 0) {
            console.log(`Found ${chapterComments.length} comments for chapter ${chapter.id}`);
            
            // Find the novel this chapter belongs to
            const novel = authorNovels.find(n => n.id === chapter.novelId);
            
            // Add chapter and novel info to each comment
            for (const comment of chapterComments) {
              try {
                // Get user info for this comment
                const user = await this.getUser(comment.userId);
                
                allComments.push({
                  ...comment,
                  user: user ? {
                    id: user.id,
                    username: user.username
                  } : undefined,
                  chapter: {
                    id: chapter.id,
                    title: chapter.title,
                    chapterNumber: chapter.chapterNumber,
                    novelId: chapter.novelId
                  },
                  novel: novel ? {
                    id: novel.id,
                    title: novel.title
                  } : undefined
                });
              } catch (userError) {
                console.error(`Error getting user for comment ${comment.id}:`, userError);
              }
            }
          }
        } catch (chapterError) {
          console.error(`Error getting comments for chapter ${chapter.id}:`, chapterError);
        }
      }
      
      console.log(`Found ${allComments.length} total comments for author`);
      
      // Sort by created date (newest first)
      allComments.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      // Return only the most recent comments
      return allComments.slice(0, limit);
    } catch (error) {
      console.error("Error in getCommentsByAuthor:", error);
      return [];
    }
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    try {
      const result = await db.insert(comments).values(insertComment).returning();
      if (Array.isArray(result) && result.length > 0) {
        return result[0] as Comment;
      }
      throw new Error("Failed to create comment");
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  }

  async deleteComment(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete comment with ID: ${id}`);
      // Find and delete any replies to this comment
      console.log(`Searching for replies to comment ${id}`);
      const replies = await db.select().from(comments).where(eq(comments.parentId, id));
      console.log(`Found ${replies.length} replies for comment ${id}`);
      for (const reply of replies) {
        console.log(`Recursively deleting reply with ID: ${reply.id} for parent ${id}`);
        await this.deleteComment(reply.id); // Recursively delete replies
        console.log(`Finished recursive deletion for reply ${reply.id}`);
      }

      // Delete any likes associated with this comment
      console.log(`Deleting likes for comment with ID: ${id}`);
      await db.delete(commentLikes).where(eq(commentLikes.commentId, id));
      console.log(`Finished deleting likes for comment ${id}`);

      // Now delete the comment itself
      console.log(`Deleting comment with ID: ${id} from the database`);
      const result = await db.delete(comments).where(eq(comments.id, id));
      console.log(`Database delete operation result for comment ${id}:`, result);
      const success = result.rowCount !== null && result.rowCount > 0;
      console.log(`Deletion of comment ${id} successful: ${success}`);
      return success;
    } catch (error) {
      console.error(`Error deleting comment with ID ${id}:`, error);
      // Re-throw the error to be caught by the route handler
      throw error; 
    }
  }

  // Add a new method to count replies for a given parent comment ID
  async countRepliesByParentId(parentId: number): Promise<number> {
    try {
      const result = await db
        .select({
          count: sql<string>`count(*)`,
        })
        .from(comments)
        .where(eq(comments.parentId, parentId));

      // The result will be an array with one object containing the count
      return parseInt(result[0].count, 10) || 0;
    } catch (error) {
      console.error(`Error counting replies for parent comment ${parentId}:`, error);
      // Return 0 or re-throw error depending on desired behavior on failure
      throw error; 
    }
  }

  // Add a new method to recursively get the depth of a comment
  async getCommentDepth(commentId: number): Promise<number> {
    try {
      let depth = 0;
      let currentCommentId: number | null = commentId;

      // Traverse up the parent chain to find the depth
      while (currentCommentId !== null && currentCommentId !== undefined) {
        const comment = await this.getComment(currentCommentId);
        if (comment) {
          depth++;
          currentCommentId = comment.parentId || null; // Move to the parent
        } else {
          // Should not happen if commentId is valid, but handle defensively
          currentCommentId = null;
        }
      }
      return depth;
    } catch (error) {
      console.error(`Error getting depth for comment ${commentId}:`, error);
      throw error; // Re-throw the error
    }
  }

  // Comment Like operations
  async getCommentLike(userId: number, commentId: number): Promise<CommentLike | undefined> {
    try {
      const [like] = await db
        .select()
        .from(commentLikes)
        .where(
          and(
            eq(commentLikes.userId, userId),
            eq(commentLikes.commentId, commentId)
          )
        );
      return like;
    } catch (error) {
      console.error("Error fetching comment like:", error);
      return undefined;
    }
  }

  async getCommentLikesByUser(userId: number): Promise<CommentLike[]> {
    try {
      return await db
        .select()
        .from(commentLikes)
        .where(eq(commentLikes.userId, userId));
    } catch (error) {
      console.error("Error fetching user comment likes:", error);
      return [];
    }
  }

  async createCommentLike(data: InsertCommentLike): Promise<CommentLike> {
    try {
      // First, check if like already exists
      const existingLike = await this.getCommentLike(data.userId, data.commentId);
      if (existingLike) {
        return existingLike; // Like already exists
      }

      // Create the like
      const [like] = await db
        .insert(commentLikes)
        .values(data)
        .returning();
      
      // Increment the likes count in the comment
      const comment = await this.getComment(data.commentId);
      if (comment) {
        await db
          .update(comments)
          .set({ likes: comment.likes + 1 })
          .where(eq(comments.id, data.commentId));
      }
      
      return like;
    } catch (error) {
      console.error("Error creating comment like:", error);
      throw error;
    }
  }

  async deleteCommentLike(userId: number, commentId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(commentLikes)
        .where(
          and(
            eq(commentLikes.userId, userId),
            eq(commentLikes.commentId, commentId)
          )
        );
      
      if (result.rowCount && result.rowCount > 0) {
        // Decrement the likes count in the comment
        const comment = await this.getComment(commentId);
        if (comment && comment.likes > 0) {
          await db
            .update(comments)
            .set({ likes: comment.likes - 1 })
            .where(eq(comments.id, commentId));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error deleting comment like:", error);
      return false;
    }
  }

  async hasUserLikedComment(userId: number, commentId: number): Promise<boolean> {
    try {
      const like = await this.getCommentLike(userId, commentId);
      return !!like;
    } catch (error) {
      console.error("Error checking if user liked comment:", error);
      return false;
    }
  }

  // Auth Mapping operations
  async findAuthMappingBySupabaseUid(supabaseUid: string): Promise<AuthMapping | undefined> {
    try {
      console.log('Attempting to find auth mapping for Supabase UID:', supabaseUid);
      const [mapping] = await db.select().from(authMapping).where(eq(authMapping.supabaseUid, supabaseUid));
      console.log('Result of finding auth mapping:', mapping);
      return mapping;
    } catch (error) {
      // ...
    }
  }

  async createAuthMapping(insertAuthMapping: InsertAuthMapping): Promise<AuthMapping> {
    const [mapping] = await db
      .insert(authMapping)
      .values(insertAuthMapping)
      .returning();
    return mapping;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    try {
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
      return review;
    } catch (error) {
      console.error(`Error getting review ${id}:`, error);
      return undefined;
    }
  }

  async getReviewsByNovel(novelId: number): Promise<Review[]> {
    try {
      // Get all reviews for the novel
      const allReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.novelId, novelId))
        .orderBy(desc(reviews.createdAt));
      
      console.log(`Found ${allReviews.length} reviews for novel ${novelId}`);
      
      // Make sure we return an array
      return Array.isArray(allReviews) ? allReviews : [];
    } catch (error) {
      console.error(`Error fetching reviews for novel ${novelId}:`, error);
      // Return empty array on error to prevent crashes
      return [];
    }
  }

  async getReviewByUserAndNovel(userId: number, novelId: number): Promise<Review | undefined> {
    try {
      const [review] = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, userId),
            eq(reviews.novelId, novelId)
          )
        );
      return review;
    } catch (error) {
      console.error(`Error fetching review by user ${userId} for novel ${novelId}:`, error);
      return undefined;
    }
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async updateReview(id: number, updateReview: Partial<InsertReview>): Promise<Review | undefined> {
    const [review] = await db
      .update(reviews)
      .set(updateReview)
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getLatestChapters(limit: number): Promise<Chapter[]> {
    try {
      console.log(`Getting latest ${limit} published chapters`);
      
      // Get published chapters ordered by update date (newest first)
      const latestChapters = await db
        .select()
        .from(chapters)
        .where(eq(chapters.status, "published"))
        .orderBy(desc(chapters.updatedAt))
        .limit(limit);
      
      console.log(`Found ${latestChapters.length} latest chapters`);
      return latestChapters;
    } catch (error) {
      console.error("Error fetching latest chapters:", error);
      return [];
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Get novel by name
  async getNovelByName(name: string): Promise<Novel | null> {
    try {
      const result = await db.select().from(novels).where(eq(novels.title, name)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting novel by name:", error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();