import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { DayPicker } from "react-day-picker";
import { addDays, subDays } from "date-fns";
import { Wifi, Anchor, Waves, Flame, ChefHat, Bed, Bath, Trees, Car } from "lucide-react";

import heroImg from "@assets/IMG_0559_1777733069151.jpeg";
import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";

const images = [mistyImg, stormImg, heroImg];

const amenities = [
  { icon: <Waves className="w-5 h-5" />, label: "Accès au lac" },
  { icon: <Anchor className="w-5 h-5" />, label: "Quai privé" },
  { icon: <Anchor className="w-5 h-5" />, label: "Canots & kayaks" },
  { icon: <Flame className="w-5 h-5" />, label: "Feu de camp" },
  { icon: <ChefHat className="w-5 h-5" />, label: "Cuisine équipée" },
  { icon: <Wifi className="w-5 h-5" />, label: "Wifi" },
  { icon: <Bed className="w-5 h-5" />, label: "4 chambres" },
  { icon: <Bath className="w-5 h-5" />, label: "Salle de bain complète" },
  { icon: <Trees className="w-5 h-5" />, label: "Terrasse panoramique" },
  { icon: <Car className="w-5 h-5" />, label: "Stationnement" },
];

export default function Chalet() {
  const [emblaRef] = useEmblaCarousel({ loop: true });

  const today = new Date();
  const bookedDays = [
    { from: subDays(today, 2), to: addDays(today, 3) },
    { from: addDays(today, 10), to: addDays(today, 15) },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <div className="container mx-auto px-6 max-w-6xl pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-serif text-primary mb-4">Le Chalet</h1>
          <p className="text-muted-foreground text-lg uppercase tracking-widest text-sm">Chalet St-Mathieu, Saint-Mathieu-de-Rioux</p>
        </motion.div>

        {/* Carousel */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden mb-16"
        >
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((src, index) => (
                <div className="flex-[0_0_100%] min-w-0 relative h-full" key={index}>
                  <img 
                    src={src} 
                    alt={`Vue du chalet ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="prose prose-lg prose-headings:font-serif prose-headings:text-primary prose-p:text-muted-foreground prose-p:leading-relaxed max-w-none mb-16"
            >
              <h2>Un sanctuaire en harmonie avec la nature</h2>
              <p>
                Niché au cœur d'une forêt mature sur les rives du Lac Saint-Mathieu, ce chalet offre un équilibre parfait entre confort moderne et charme rustique. La grande pièce à vivre, baignée de lumière naturelle grâce à ses immenses fenêtres, vous donne l'impression de flotter au-dessus de l'eau.
              </p>
              <p>
                Que vous soyez ici pour admirer les nuages dramatiques d'une fin d'après-midi d'automne ou pour profiter d'un matin brumeux sur le lac lisse comme un miroir, le Chalet St-Mathieu est votre refuge personnel.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-2xl font-serif text-primary mb-8 border-b border-border pb-4">Aménagements</h3>
              <div className="grid grid-cols-2 gap-6">
                {amenities.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-muted-foreground">
                    <div className="text-primary/70">{item.icon}</div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="sticky top-32 bg-secondary/30 p-8 border border-border"
            >
              <h3 className="text-xl font-serif text-primary mb-6">Disponibilités</h3>
              <div className="mb-8 pointer-events-none scale-90 origin-top-left md:scale-100">
                <DayPicker 
                  mode="multiple" 
                  selected={bookedDays.flatMap(range => [range.from, range.to])}
                  modifiers={{ booked: bookedDays }}
                  modifiersStyles={{
                    booked: { backgroundColor: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))', textDecoration: 'line-through' }
                  }}
                  className="bg-transparent"
                />
              </div>
              <button 
                className="w-full bg-primary text-primary-foreground py-4 text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors"
                data-testid="button-request-reservation"
              >
                Demander une réservation
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
