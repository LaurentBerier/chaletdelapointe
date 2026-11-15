import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
export const posts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  authorId: uuid("author_id").references(() => usersTable.id),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  cover: text("cover").notNull().default("lac"),
  tags: text("tags").array().notNull().default([]),
});
