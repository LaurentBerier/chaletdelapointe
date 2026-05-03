import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { DayPicker, DateRange } from "react-day-picker";
import { differenceInDays, addDays, subDays } from "date-fns";
import {
  Wifi, Anchor, Waves, Flame, ChefHat, Bed, Bath, Trees, Car,
  MapPin, Umbrella, Eye, ChevronLeft, ChevronRight, Minus, Plus, Sparkles,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import aerialImg from "@assets/Aerial_1777816601975.png";
import beachImg from "@assets/Beach_1777816601977.png";
import balconImg from "@assets/Balcon_1777816601977.jpg";
import salleAMangerImg from "@assets/Salon_Salleamanger_1777816601977.png";
import salonImg from "@assets/Ref_salon_1777816601977.png";
import chambreImg from "@assets/Chambre1_1777816601977.png";
import winterImg from "@assets/WideWinter_1777816601978.png";
import sunsetImg from "@assets/1146C8D0-D3D0-4422-B54F-0D998326620C_1_105_c_1777781795373.jpeg";
import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import lakeImg from "@assets/IMG_0559_1777733069151.jpeg";

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);

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
  }, [emblaApi, onSelect]);

  const today = new Date();
  const bookedDays = [
    { from: subDays(today, 2), to: addDays(today, 3) },
    { from: addDays(today, 10), to: addDays(today, 15) },
  ];

  const pricePerNight = 300;
  const nights = dateRange?.from && dateRange?.to ? Math.max(1, differenceInDays(dateRange.to, dateRange.from)) : 5;
  const subtotal = nights * pricePerNight;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Edge-to-edge Gallery */}
      <div className="relative w-full h-[60vh] bg-neutral-900 group">
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
                <span>4 chambres</span>
                <span>•</span>
                <span>2 salles de bain</span>
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
              <div className="bg-secondary/20 p-4 rounded-2xl inline-block pointer-events-none">
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
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-2xl font-bold text-foreground">{pricePerNight} $</span>
                <span className="text-muted-foreground">/ nuit</span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden mb-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full flex text-left divide-x divide-border border-b border-border hover:bg-secondary/30 transition-colors" data-testid="button-date-picker">
                      <div className="flex-1 p-3">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Arrivée</div>
                        <div className="text-sm text-foreground truncate">
                          {dateRange?.from ? dateRange.from.toLocaleDateString('fr-CA') : 'Ajouter une date'}
                        </div>
                      </div>
                      <div className="flex-1 p-3">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Départ</div>
                        <div className="text-sm text-foreground truncate">
                          {dateRange?.to ? dateRange.to.toLocaleDateString('fr-CA') : 'Ajouter une date'}
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      disabled={[{ before: today }, ...bookedDays]}
                    />
                  </PopoverContent>
                </Popover>

                <div className="p-3 bg-card hover:bg-secondary/30 transition-colors">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Voyageurs</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{guests} {guests > 1 ? 'voyageurs' : 'voyageur'}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:border-primary text-primary transition-colors disabled:opacity-50"
                        disabled={guests <= 1}
                        data-testid="button-guests-minus"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-4 text-center">{guests}</span>
                      <button
                        onClick={() => setGuests(Math.min(8, guests + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:border-primary text-primary transition-colors disabled:opacity-50"
                        disabled={guests >= 8}
                        data-testid="button-guests-plus"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
                data-testid="button-request-reservation"
              >
                Demander une réservation
              </button>

              <p className="text-center text-muted-foreground text-sm mt-4 mb-6">
                Vous ne serez pas facturé pour le moment
              </p>

              <div className="space-y-4 text-sm text-foreground/80 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="underline decoration-border underline-offset-4">{nights} nuits × {pricePerNight} $</span>
                  <span>{subtotal} $</span>
                </div>
                <div className="flex justify-between">
                  <span className="underline decoration-border underline-offset-4">Frais de service</span>
                  <span>{serviceFee} $</span>
                </div>
              </div>

              <div className="flex justify-between pt-6 text-foreground font-bold text-lg">
                <span>Total</span>
                <span>{total} $</span>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
