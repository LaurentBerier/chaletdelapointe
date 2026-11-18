import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  primaryKey,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
type CommunitySection = { id: string; title: string; body: string };
export const communityDocuments = pgTable("community_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  introduction: text("introduction").notNull().default(""),
  sections: jsonb("sections").$type<CommunitySection[]>().notNull().default([]),
  status: text("status").notNull().default("discussion"),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const communityVersions = pgTable(
  "community_versions",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => communityDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    introduction: text("introduction").notNull(),
    sections: jsonb("sections").$type<CommunitySection[]>().notNull(),
    status: text("status").notNull(),
    editedBy: uuid("edited_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.version] })],
);
export const communityMessages = pgTable("community_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => communityDocuments.id),
  parentId: uuid("parent_id").references(
    (): AnyPgColumn => communityMessages.id,
  ),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  topicTitle: text("topic_title"),
  sectionKey: text("section_key"),
  sectionSnapshot: jsonb("section_snapshot").$type<CommunitySection>(),
  documentVersion: integer("document_version"),
  kind: text("kind").notNull().default("comment"),
  body: text("body").notNull(),
  proposedText: text("proposed_text"),
  status: text("status").notNull().default("open"),
  appliedVersion: integer("applied_version"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
export const communityFollows = pgTable(
  "community_follows",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => communityMessages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.userId] })],
);
export const communityNotifications = pgTable(
  "community_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => communityMessages.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => communityMessages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [unique().on(t.userId, t.messageId)],
);
