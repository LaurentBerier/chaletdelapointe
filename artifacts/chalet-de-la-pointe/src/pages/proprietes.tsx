import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Search } from "lucide-react";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";

export default function Proprietes() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-32">
      <div className="container mx-auto px-6 max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">Nos Propriétés</h1>
          <p className="text-muted-foreground text-lg">Des retraites d'exception dans la nature québécoise.</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-card border border-border shadow-md rounded-full p-2 max-w-3xl mb-16 flex items-center"
        >
          <div className="flex-1 px-6 border-r border-border">
            <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Destination</div>
            <input 
              type="text" 
              placeholder="Saint-Mathieu-de-Rioux" 
              className="w-full bg-transparent outline-none text-sm text-foreground placeholder:text-foreground/50"
              readOnly
            />
          </div>
          <div className="flex-1 px-6 border-r border-border">
            <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Date d'arrivée</div>
            <div className="text-sm text-muted-foreground">Choisir les dates</div>
          </div>
          <div className="flex-1 px-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Voyageurs</div>
              <div className="text-sm text-muted-foreground">Ajouter des voyageurs</div>
            </div>
            <button className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 transition-colors" data-testid="button-search">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href="/chalet" data-testid="card-property-chalet-st-mathieu" className="block group">
              <div className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img 
                    src={heroImg} 
                    alt="Chalet St-Mathieu" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-primary text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                    Coup de cœur
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-serif text-primary font-medium">Chalet St-Mathieu</h2>
                    <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded text-sm font-medium">
                      350 $ <span className="text-xs font-normal text-muted-foreground">/ nuit</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>Bas-Saint-Laurent, Québec</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">Lac</span>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">Nature</span>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">8 voyageurs</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
