import { motion } from "framer-motion";
import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";

const posts = [
  {
    id: 1,
    title: "Le charme des matins brumeux sur le lac",
    excerpt: "Découvrez pourquoi se lever à l'aube est la meilleure décision que vous prendrez lors de votre séjour. La brume épaisse qui s'élève de l'eau calme crée une atmosphère mystique.",
    author: "Équipe ChaletDeLaPointe",
    date: "12 Octobre 2023",
    image: mistyImg
  },
  {
    id: 2,
    title: "La beauté dramatique des orages d'été",
    excerpt: "Il n'y a rien de plus spectaculaire que de regarder un orage se former au-dessus des îles boisées depuis le confort du salon. Une symphonie de la nature.",
    author: "Équipe ChaletDeLaPointe",
    date: "28 Août 2023",
    image: stormImg
  },
  {
    id: 3,
    title: "L'art de ne rien faire",
    excerpt: "Dans un monde hyper-connecté, le luxe véritable est de prendre le temps. Un guide pour déconnecter et profiter pleinement de la quiétude du Chalet St-Mathieu.",
    author: "Équipe ChaletDeLaPointe",
    date: "15 Juin 2023",
    image: heroImg
  }
];

export default function Blogue() {
  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto px-6 max-w-5xl pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-24 text-center"
        >
          <h1 className="text-4xl md:text-6xl font-serif text-primary mb-6">Chroniques du Lac</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Histoires, réflexions et guides pour profiter pleinement de votre séjour au Bas-Saint-Laurent.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {posts.map((post, index) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`group cursor-pointer ${index === 0 ? "md:col-span-2" : ""}`}
            >
              <div className={`overflow-hidden mb-6 ${index === 0 ? "aspect-[21/9]" : "aspect-[4/3]"}`}>
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-4 text-xs tracking-wider uppercase text-muted-foreground mb-4">
                  <span>{post.date}</span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>{post.author}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif text-primary mb-4 group-hover:text-primary/70 transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="mt-6 inline-flex items-center text-sm uppercase tracking-widest text-primary font-medium">
                  Lire l'article <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
