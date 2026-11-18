export type CommunitySection = { id: string; title: string; body: string };
export type CommunityDocument = {
  id: string;
  slug: string;
  title: string;
  introduction: string;
  sections: CommunitySection[];
  status: "discussion" | "adopted" | "archived";
  version: number;
  updated_at: string;
  editor?: string;
  comment_count?: number;
};
export type CommunityMessage = {
  id: string;
  document_id: string | null;
  parent_id: string | null;
  author_id: string;
  author: string;
  topic_title: string | null;
  section_key: string | null;
  section_snapshot: CommunitySection | null;
  document_version: number | null;
  kind: "comment" | "suggestion";
  body: string;
  proposed_text: string | null;
  status: "open" | "resolved" | "applied" | "declined";
  applied_version: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  following?: boolean;
  replies?: CommunityMessage[];
};
export const documentStatus = {
  discussion: "En discussion",
  adopted: "Adopté",
  archived: "Archivé",
};
export const messageStatus = {
  open: "Ouvert",
  resolved: "Résolu",
  applied: "Intégré au document",
  declined: "Non retenu",
};
export function canManageDocuments(
  user?: { isAdmin: boolean; isReservationAdmin: boolean } | null,
) {
  return !!user && (user.isAdmin || user.isReservationAdmin);
}
export function canReadDocuments(
  user?: {
    isAdmin: boolean;
    isReservationAdmin: boolean;
    isOwner?: boolean;
    group?: string;
  } | null,
) {
  return (
    !!user &&
    (canManageDocuments(user) || user.isOwner || user.group === "proprietaire")
  );
}
