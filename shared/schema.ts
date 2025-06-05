import { pgTable, text, serial, integer, timestamp, boolean, foreignKey, unique, pgPolicy, index, varchar, json, uuid, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { type InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Users table - INCLUDING the last_login_at field to prevent data loss
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isAuthor: boolean("is_author").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { mode: 'string' }), // Add this field to prevent data loss
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  unique("users_email_unique").on(table.email),
]);

// Session table - Add this to prevent deletion
export const session = pgTable("session", {
  sid: varchar("sid").notNull().primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { mode: 'date' }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  isAuthor: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InferSelectModel<typeof users>;

// Extend the user schema for registration
export const registerUserSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().optional(),
  })
  .refine((data: z.infer<typeof insertUserSchema> & { confirmPassword?: string }) => 
    !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// Auth Mapping table to link Supabase Auth users to local users
export const authMapping = pgTable("auth_mapping", {
  supabaseUid: uuid("supabase_uid").notNull().unique(),
  localUserId: integer("local_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertAuthMappingSchema = createInsertSchema(authMapping).pick({
  supabaseUid: true,
  localUserId: true,
});

export type InsertAuthMapping = z.infer<typeof insertAuthMappingSchema>;
export type AuthMapping = InferSelectModel<typeof authMapping>;

// Novels table
export const novels = pgTable("novels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image"),
  authorId: integer("author_id").notNull().references(() => users.id),
  genres: text("genres").array().notNull(),
  status: text("status").notNull().default("draft"), // draft, published
  contentRating: text("content_rating").notNull().default("everyone"), // everyone, teen, mature
  viewCount: integer("view_count").notNull().default(0),
  bookmarkCount: integer("bookmark_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.authorId],
    foreignColumns: [users.id],
    name: "novels_author_id_users_id_fk"
  }),
]);

export const insertNovelSchema = createInsertSchema(novels).pick({
  title: true,
  description: true,
  coverImage: true,
  authorId: true,
  genres: true,
  status: true,
  contentRating: true,
});

export type InsertNovel = z.infer<typeof insertNovelSchema>;
export type Novel = InferSelectModel<typeof novels>;

// Chapters table
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorNote: text("author_note"),
  viewCount: integer("view_count").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft, published
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("chapters_novel_id_chapter_number_unique").on(table.novelId, table.chapterNumber),
  foreignKey({
    columns: [table.novelId],
    foreignColumns: [novels.id],
    name: "chapters_novel_id_novels_id_fk"
  }),
]);

export const insertChapterSchema = createInsertSchema(chapters).pick({
  novelId: true,
  title: true,
  content: true,
  chapterNumber: true,
  authorNote: true,
  status: true,
});

export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = InferSelectModel<typeof chapters>;

// Bookmarks table
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.novelId],
    foreignColumns: [novels.id],
    name: "bookmarks_novel_id_novels_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "bookmarks_user_id_users_id_fk"
  }),
]);

export const insertBookmarkSchema = createInsertSchema(bookmarks).pick({
  userId: true,
  novelId: true,
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = InferSelectModel<typeof bookmarks>;

// Reading Progress table
export const readingProgress = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id),
  progress: integer("progress").notNull().default(0), // Percentage read of the chapter
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.novelId],
    foreignColumns: [novels.id],
    name: "reading_progress_novel_id_novels_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "reading_progress_user_id_users_id_fk"
  }),
]);

export const insertReadingProgressSchema = createInsertSchema(readingProgress).pick({
  userId: true,
  novelId: true,
  chapterId: true,
  progress: true,
});

export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
// Modified ReadingProgress type with string lastReadAt
export type ReadingProgress = Omit<InferSelectModel<typeof readingProgress>, 'lastReadAt'> & {
  lastReadAt: string;
};

// Comments table - with explicit type declaration for self-reference
// Declare the table with a type annotation
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id),
  content: text("content").notNull(),
  likes: integer("likes").notNull().default(0),
  // Use a type assertion for the self-reference
  parentId: integer("parent_id").references((): any => comments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "comments_parent_id_comments_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "comments_user_id_users_id_fk"
  }),
]);

// Add a new CommentWithUser type
export interface CommentWithUser extends Comment {
  user: {
    id: number;
    username: string;
  };
  replies?: CommentWithUser[];
}

export const insertCommentSchema = createInsertSchema(comments).pick({
  userId: true,
  chapterId: true,
  content: true,
  parentId: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = InferSelectModel<typeof comments>;

// Reviews table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  novelId: integer("novel_id").notNull().references(() => novels.id),
  content: text("content").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.novelId],
    foreignColumns: [novels.id],
    name: "reviews_novel_id_novels_id_fk"
  }),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "reviews_user_id_users_id_fk"
  }),
]);

export const insertReviewSchema = createInsertSchema(reviews).pick({
  userId: true,
  novelId: true,
  content: true,
  rating: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = InferSelectModel<typeof reviews>;

export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  commentId: integer("comment_id").notNull().references(() => comments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentLikeSchema = createInsertSchema(commentLikes).pick({
  userId: true,
  commentId: true,
});

export type InsertCommentLike = z.infer<typeof insertCommentLikeSchema>;
export type CommentLike = InferSelectModel<typeof commentLikes>;

// Export schema for use in database operations
export const schema = {
  users,
  novels,
  chapters,
  bookmarks,
  readingProgress,
  comments,
  commentLikes,
  reviews,
  authMapping,
  session // Include session table
};