import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import heroImg from "@assets/IMG_0559_1777733069151.jpeg";
import mistyImg2 from "@assets/IMG_6664_1777781698233.JPG";
import sunsetImg from "@assets/1146C8D0-D3D0-4422-B54F-0D998326620C_1_105_c_1777781795373.jpeg";
import beachImg from "@assets/F4891ADE-8A04-4560-9623-CC579CE378E6_1_105_c_1777781804503.jpeg";

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
  amenities: AmenityItem[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  isActive: boolean;
  tags: string[];
}

export interface AmenityItem {
  label: string;
  icon: string;
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
    galleryImages: [heroImg, mistyImg, stormImg, sunsetImg, beachImg, mistyImg2],
    amenities: [
      { label: "Accès au lac", icon: "Waves" },
      { label: "Quai privé", icon: "Anchor" },
      { label: "Canots & kayaks", icon: "Ship" },
      { label: "Feu de camp", icon: "Flame" },
      { label: "Cuisine équipée", icon: "ChefHat" },
      { label: "Wifi", icon: "Wifi" },
      { label: "4 chambres", icon: "Bed" },
      { label: "Salle de bain complète", icon: "Bath" },
      { label: "Terrasse panoramique", icon: "Trees" },
      { label: "Stationnement", icon: "Car" },
      { label: "Plage à proximité", icon: "Umbrella" },
      { label: "Vue sur le lac", icon: "Eye" },
    ],
    bedrooms: 4,
    bathrooms: 2,
    maxGuests: 8,
    isActive: true,
    tags: ["Lac", "Nature", "Famille", "Calme"],
  },
];

export const allImages = { mistyImg, stormImg, heroImg, mistyImg2, sunsetImg, beachImg };

export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

export function getActiveProperties(): Property[] {
  return properties.filter((p) => p.isActive);
}
