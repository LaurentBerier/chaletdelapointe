import { useQuery } from "@tanstack/react-query";
import mist from "@assets/IMG_6664_1777733051950.jpg";
import storm from "@assets/IMG_0508_1777733051950.jpg";
import lake from "@assets/IMG_0559_1777733069151.jpg";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string | null;
  createdAt: string;
  cover: string;
  tags: string[];
  published: boolean;
  removedAt?: string | null;
  commentsLocked: boolean;
}
export function useJournal() {
  return useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const r = await fetch("/api/journal");
      if (!r.ok) throw Error("Les chroniques sont indisponibles.");
      const rows: BlogPost[] = await r.json();
      return rows.map((p) => ({
        ...p,
        author: p.author || "Équipe ChaletDeLaPointe",
        date: new Intl.DateTimeFormat("fr-CA", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(p.createdAt)),
        image: p.cover === "brume" ? mist : p.cover === "orage" ? storm : lake,
        readTime:
          Math.max(1, Math.ceil(p.content.split(/\s+/).length / 200)) + " min",
      }));
    },
  });
}
