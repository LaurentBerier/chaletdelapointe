import { motion } from "framer-motion";
import { Link } from "wouter";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";
import mistyImg from "@assets/IMG_6664_1777733051950.JPG";

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[100dvh] min-h-[600px] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <motion.img 
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src={heroImg} 
            alt="Chalet St-Mathieu vue du lac au coucher du soleil" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        </div>

        <div className="relative z-10 text-center text-white px-6 mt-16 max-w-4xl">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-sm md:text-base tracking-[0.2em] uppercase mb-6 text-white/80"
          >
            Saint-Mathieu-de-Rioux, Québec
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium mb-8 leading-tight drop-shadow-lg"
          >
            Un refuge silencieux sur l'eau
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Link 
              href="/chalet" 
              className="inline-block bg-white text-primary px-8 py-4 text-sm tracking-wider uppercase hover:bg-white/90 transition-colors duration-300"
              data-testid="link-discover-hero"
            >
              Découvrir le Chalet
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-24 md:py-32 px-6 bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-5xl font-serif text-primary mb-8"
          >
            Le temps suspendu
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light"
          >
            Loin du bruit de la ville, le Chalet St-Mathieu offre une expérience de luxe discret, ancrée dans la nature québécoise. Pensez matins brumeux sur une eau calme, couchers de soleil dorés et nuages dramatiques au-dessus des îles boisées. Un monde surélevé et sans hâte.
          </motion.p>
        </div>
      </section>

      {/* Split Feature Section */}
      <section className="py-0">
        <div className="flex flex-col md:flex-row w-full">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="w-full md:w-1/2 h-[50vh] md:h-[80vh]"
          >
            <img src={mistyImg} alt="Brume matinale" className="w-full h-full object-cover" />
          </motion.div>
          <div className="w-full md:w-1/2 bg-secondary flex items-center justify-center p-12 md:p-24">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-md"
            >
              <h3 className="text-2xl md:text-4xl font-serif text-primary mb-6">Élégance naturelle</h3>
              <p className="text-secondary-foreground/80 mb-8 leading-relaxed">
                Chaque détail a été pensé pour ne pas faire obstacle au paysage. Des fenêtres panoramiques aux matériaux naturels, le chalet fusionne avec son environnement pour créer un espace de vie apaisant.
              </p>
              <Link 
                href="/chalet" 
                className="inline-block border border-primary text-primary px-8 py-3 text-sm tracking-wider uppercase hover:bg-primary hover:text-white transition-colors duration-300"
                data-testid="link-discover-details"
              >
                Explorer les aménagements
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-primary text-primary-foreground text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="container mx-auto max-w-2xl"
        >
          <h2 className="text-3xl md:text-5xl font-serif mb-8">Votre retraite vous attend</h2>
          <p className="text-primary-foreground/80 mb-10 text-lg">
            Vérifiez nos disponibilités et planifiez votre séjour au Chalet St-Mathieu.
          </p>
          <Link 
            href="/calendrier" 
            className="inline-block bg-white text-primary px-10 py-4 text-sm tracking-wider uppercase hover:bg-white/90 transition-colors duration-300"
            data-testid="link-book-cta"
          >
            Réserver
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
