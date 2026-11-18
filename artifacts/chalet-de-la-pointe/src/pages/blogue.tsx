import { BlogImage } from "@/components/blog-content";
import { FieldHeading } from "@/components/field-heading";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useJournal } from "@/data/blog";
import { useAuth } from "@/context/AuthContext";

export default function Blogue() {
  const { user } = useAuth();
  const journal = useJournal(),
    blogPosts = journal.data ?? [];
  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto px-6 max-w-5xl pb-24">
        <FieldHeading kind="journal" title="Chroniques du lac">
          Histoires et guides pour profiter du lac Saint-Mathieu et de la
          région.
        </FieldHeading>
        {user?.accountStatus === "approved" && (
          <div className="mb-8">
            <Link
              className="action inline-flex"
              href="/tableau-de-bord?onglet=blogue"
            >
              Écrire une chronique
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {journal.isPending && <p>Chargement des chroniques…</p>}
          {journal.isError && (
            <p>Les chroniques sont momentanément indisponibles.</p>
          )}
          {journal.isSuccess && !blogPosts.length && (
            <p>Aucune chronique pour le moment.</p>
          )}
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`group ${index === 0 ? "md:col-span-2" : ""}`}
              data-testid={`card-post-${post.id}`}
            >
              <Link
                href={`/blogue/${post.slug}`}
                data-testid={`link-post-${post.slug}`}
              >
                <div
                  className={`overflow-hidden mb-6 ${index === 0 ? "aspect-[21/9]" : "aspect-[4/3]"}`}
                >
                  <BlogImage
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 text-xs tracking-wider uppercase text-muted-foreground mb-4">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{post.author}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{post.readTime}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-primary mb-4 group-hover:text-primary/70 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-6 inline-flex items-center text-sm uppercase tracking-widest text-primary font-medium">
                    Lire l'article{" "}
                    <span className="ml-2 group-hover:translate-x-2 transition-transform inline-block">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
