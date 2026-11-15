import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "wouter";
import {
  Wifi, Anchor, Waves, Flame, ChefHat, Bed, Bath, Trees, Car,
  MapPin, Umbrella, Eye, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import aerialImg from "@assets/Aerial_1777816601975.jpg";
import beachImg from "@assets/Beach_1777816601977.jpg";
import balconImg from "@assets/Balcon_1777816601977.jpg";
import salleAMangerImg from "@assets/Salon_Salleamanger_1777816601977.jpg";
import salonImg from "@assets/Ref_salon_1777816601977.jpg";
import chambreImg from "@assets/Chambre1_1777816601977.jpg";
import winterImg from "@assets/WideWinter_1777816601978.jpg";
import sunsetImg from "@assets/1146C8D0-D3D0-4422-B54F-0D998326620C_1_105_c_1777781795373.jpg";
import mistyImg from "@assets/IMG_6664_1777733051950.jpg";
import stormImg from "@assets/IMG_0508_1777733051950.jpg";
import lakeImg from "@assets/IMG_0559_1777733069151.jpg";

const images = [
  aerialImg,
  beachImg,
  balconImg,
  salleAMangerImg,
  salonImg,
  chambreImg,
  winterImg,
  sunsetImg,
  mistyImg,
  stormImg,
  lakeImg,
];

const amenities = [
  { icon: <Umbrella className="w-5 h-5" />, label: "Plage privée de sable" },
  { icon: <Eye className="w-5 h-5" />, label: "Vue directe sur le lac" },
  { icon: <Waves className="w-5 h-5" />, label: "Accès au lac" },
  { icon: <Anchor className="w-5 h-5" />, label: "Canots & kayaks" },
  { icon: <Flame className="w-5 h-5" />, label: "Feu de camp" },
  { icon: <ChefHat className="w-5 h-5" />, label: "Cuisine équipée" },
  { icon: <Wifi className="w-5 h-5" />, label: "Wifi" },
  { icon: <Bed className="w-5 h-5" />, label: "Dortoir + 2 chambres semi-privées" },
  { icon: <Bath className="w-5 h-5" />, label: "1 salle de bain avec douche" },
  { icon: <Trees className="w-5 h-5" />, label: "Terrasse panoramique" },
  { icon: <Car className="w-5 h-5" />, label: "Stationnement" },
];

export default function Chalet() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || isGalleryHovered) return;
    const autoplay = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => window.clearInterval(autoplay);
  }, [emblaApi, isGalleryHovered]);

  const selectedImageSrc = selectedImageIndex !== null ? images[selectedImageIndex] : null;

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Edge-to-edge Gallery */}
      <div
        className="relative w-full h-[60vh] bg-neutral-900 group"
        onMouseEnter={() => setIsGalleryHovered(true)}
        onMouseLeave={() => setIsGalleryHovered(false)}
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

        <button
          onClick={scrollPrev}
          className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-primary p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid="carousel-prev"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={scrollNext}
          className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-primary p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          data-testid="carousel-next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="absolute bottom-6 left-1/2 -translate-y-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full transition-all ${idx === selectedIndex ? 'bg-white w-4' : 'bg-white/50'}`}
              onClick={() => emblaApi?.scrollTo(idx)}
              data-testid={`carousel-dot-${idx}`}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Le seul chalet sur la pointe
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">Chalet St-Mathieu</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm font-medium">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Saint-Mathieu-de-Rioux, Bas-Saint-Laurent, Québec
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-primary text-base">
                <span>Dortoir + 2 chambres semi-privées</span>
                <span>•</span>
                <span>1 salle de bain avec douche</span>
                <span>•</span>
                <span>8 voyageurs max</span>
              </div>
            </motion.div>

            {/* Highlight cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8"
            >
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-secondary/20">
                <div className="text-primary shrink-0 mt-1"><Umbrella className="w-6 h-6" /></div>
                <div>
                  <div className="font-serif text-primary text-lg mb-1">Plage privée de sable</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Une plage à vous seuls, à quelques pas du chalet.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-secondary/20">
                <div className="text-primary shrink-0 mt-1"><Eye className="w-6 h-6" /></div>
                <div>
                  <div className="font-serif text-primary text-lg mb-1">Emplacement unique</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Posé sur sa propre pointe, vue directe et imprenable sur le lac.</p>
                </div>
              </div>
            </motion.div>

            <hr className="my-8 border-border" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="prose prose-lg text-muted-foreground leading-relaxed max-w-none"
            >
              <p>
                Le Chalet St-Mathieu occupe le plus bel emplacement du lac : sa propre pointe boisée, entourée d'eau sur trois côtés. Du balcon ou de la grande pièce à vivre, baignée de lumière par d'immenses fenêtres, vous avez l'impression de flotter au-dessus de l'eau.
              </p>
              <p>
                À quelques pas, votre <strong>plage privée de sable</strong> descend doucement vers le lac, parfaite pour la baignade des enfants, un café au lever du jour ou un feu en fin de soirée. Un refuge authentique pour se reconnecter à la nature québécoise, en toute saison, sans sacrifier le confort.
              </p>
              <p>
                Le chalet comprend une seule salle de bain avec douche. Le dortoir offre deux chambres semi-privées munies de deux lits simples chacune, ainsi que deux lits simples et un lit double dans le dortoir. Le divan-lit se trouve au rez-de-chaussée.
              </p>
            </motion.div>

            <hr className="my-8 border-border" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-serif text-primary mb-8">Ce que ce chalet offre</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                {amenities.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-foreground/80">
                    <div className="text-primary">{item.icon}</div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <hr className="my-8 border-border" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-serif text-primary mb-6">Disponibilités</h2>
              <Link href="/calendrier" className="text-primary underline">Consulter le calendrier partagé</Link>
            </motion.div>
          </div>

          {/* Right Column - Sticky Booking Card */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="sticky top-32 bg-card border border-border shadow-xl rounded-2xl p-6"
            >
              <h2 className="font-serif text-2xl mb-4">Votre séjour au chalet</h2>
              <p className="text-muted-foreground mb-6">Choisissez vos nuits et le nombre de voyageurs dans le calendrier.</p>
              <Link href="/calendrier" className="block rounded-lg bg-primary text-white text-center py-3" data-testid="button-request-reservation">Voir les disponibilités</Link>
            </motion.div>
          </div>
        </div>
      </div>

      <section className="px-6 pb-20">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-serif text-primary mb-3">Galerie complète</h2>
            <p className="text-muted-foreground">Toutes les photos du chalet</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {images.map((src, index) => (
              <motion.button
                key={`bottom-gallery-${index}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
                type="button"
                onClick={() => {
                  setSelectedImageIndex(index);
                  setIsImageDialogOpen(true);
                }}
                className="group rounded-2xl overflow-hidden aspect-[4/3] bg-secondary/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`Ouvrir la photo du chalet ${index + 1} en plein écran`}
              >
                <img
                  src={src}
                  alt={`Photo du chalet ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <Dialog
        open={isImageDialogOpen}
        onOpenChange={(isOpen) => {
          setIsImageDialogOpen(isOpen);
          if (!isOpen) setSelectedImageIndex(null);
        }}
      >
        <DialogContent className="h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] origin-center border-none bg-black/95 p-2 shadow-none data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:rounded-lg sm:p-4 [&>button]:bg-black/50 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100">
          <DialogTitle className="sr-only">Photo du chalet en plein écran</DialogTitle>
          <DialogDescription className="sr-only">
            {selectedImageIndex !== null ? `Agrandissement de la photo du chalet ${selectedImageIndex + 1}` : "Agrandissement de photo du chalet"}
          </DialogDescription>
          {selectedImageSrc ? (
            <img
              src={selectedImageSrc}
              alt={selectedImageIndex !== null ? `Photo du chalet ${selectedImageIndex + 1} en pleine résolution` : "Photo du chalet en pleine résolution"}
              className="h-full w-full object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
