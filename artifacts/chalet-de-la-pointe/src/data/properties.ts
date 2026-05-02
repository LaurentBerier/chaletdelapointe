import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";

export interface Property {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  location: string;
  city: string;
  province: string;
  country: string;
  basePrice: number;
  coverImage: string;
  galleryImages: string[];
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  isActive: boolean;
}

export const properties: Property[] = [
  {
    id: "chalet-st-mathieu",
    name: "Chalet St-Mathieu",
    slug: "chalet-st-mathieu",
    description:
      "Niché sur les rives du lac Saint-Mathieu, ce chalet d'exception offre une retraite de luxe discret au cœur du Bas-Saint-Laurent. Des fenêtres panoramiques cadrent un paysage en constant changement — brume du matin, orages d'été, couchers de soleil dorés. Pensé pour ceux qui cherchent l'espace, le silence et l'authenticité québécoise.",
    shortDescription:
      "Un refuge de luxe discret sur les rives du lac Saint-Mathieu, au cœur du Bas-Saint-Laurent.",
    location: "Saint-Mathieu-de-Rioux, Bas-Saint-Laurent, Québec",
    city: "Saint-Mathieu-de-Rioux",
    province: "Québec",
    country: "Canada",
    basePrice: 350,
    coverImage: heroImg,
    galleryImages: [heroImg, mistyImg, stormImg],
    amenities: [
      "Accès au lac",
      "Quai privé",
      "Canots & kayaks",
      "Feu de camp",
      "Cuisine équipée",
      "Wifi",
      "4 chambres",
      "Salle de bain complète",
      "Terrasse panoramique",
      "Stationnement",
    ],
    bedrooms: 4,
    bathrooms: 2,
    maxGuests: 8,
    isActive: true,
  },
];

export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

export function getActiveProperties(): Property[] {
  return properties.filter((p) => p.isActive);
}
