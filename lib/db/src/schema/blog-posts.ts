import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
export const posts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  authorId: uuid("author_id").references(() => usersTable.id),
  published: boolean("published").notNull().default(false),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  removedBy: uuid("removed_by").references(() => usersTable.id),
  commentsLocked: boolean("comments_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  cover: text("cover").notNull().default("lac"),
  tags: text("tags").array().notNull().default([]),
});

export const blogComments = pgTable("blog_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => blogComments.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  removedBy: uuid("removed_by").references(() => usersTable.id),
});
