import { BlogContent, BlogImage } from "@/components/blog-content";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { useJournal } from "@/data/blog";
import NotFound from "@/pages/not-found";
import { BlogComments } from "@/components/blog-comments";

export default function Article() {
  const params = useParams<{ slug: string }>();
  const journal = useJournal(),
    blogPosts = journal.data ?? [];
  if (journal.isPending || journal.isError)
    return (
      <div className="pt-32 text-center">
        {journal.isPending
          ? "Chargement de l’article…"
          : "Article momentanément indisponible."}
      </div>
    );
  const post = blogPosts.find((p) => p.slug === params.slug);

  if (!post) return <NotFound />;

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[380px] overflow-hidden">
        <BlogImage
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
      </div>

      {/* Article */}
      <div className="container mx-auto px-6 max-w-2xl -mt-24 relative z-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs tracking-widest uppercase text-muted-foreground border border-border px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-5xl font-serif text-primary mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-12 border-b border-border pb-8">
            <span>{post.author}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{post.date}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>{post.readTime} de lecture</span>
          </div>

          <BlogContent rich={post.richContent} content={post.content} />

          <div className="mt-16 border-t border-border pt-8">
            <Link
              href="/blogue"
              className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-back-blogue"
            >
              ← Retour au blogue
            </Link>
          </div>
        </motion.div>

        <BlogComments slug={post.slug} />
        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="text-2xl font-serif text-primary mb-8">
              À lire aussi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {related.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <Link
                    href={`/blogue/${r.slug}`}
                    data-testid={`link-related-${r.slug}`}
                  >
                    <div className="group cursor-pointer">
                      <div className="aspect-[4/3] overflow-hidden mb-4">
                        <BlogImage
                          src={r.image}
                          alt={r.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">
                        {r.date}
                      </p>
                      <h3 className="font-serif text-primary text-lg group-hover:text-primary/70 transition-colors leading-snug">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
