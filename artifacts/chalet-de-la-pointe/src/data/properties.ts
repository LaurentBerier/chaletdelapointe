import aerialImg from "@assets/Aerial_1777816601975.png";
import balconImg from "@assets/Balcon_1777816601977.jpg";
import beachImg from "@assets/Beach_1777816601977.png";
import chambreImg from "@assets/Chambre1_1777816601977.png";
import salonImg from "@assets/Ref_salon_1777816601977.png";
import salleAMangerImg from "@assets/Salon_Salleamanger_1777816601977.png";
import winterImg from "@assets/WideWinter_1777816601978.png";
import sunsetImg from "@assets/1146C8D0-D3D0-4422-B54F-0D998326620C_1_105_c_1777781795373.jpeg";
import mistyImg from "@assets/IMG_6664_1777733051950.JPG";
import stormImg from "@assets/IMG_0508_1777733051950.jpeg";
import lakeImg from "@assets/IMG_0559_1777733069151.jpeg";

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
      "Niché sur sa propre pointe au cœur du lac Saint-Mathieu, ce chalet d'exception jouit du plus bel emplacement du lac — une vue directe et imprenable sur l'eau, et une plage de sable privée à quelques pas du balcon. Une retraite authentique pensée pour ceux qui cherchent l'espace, le silence et la beauté brute du Bas-Saint-Laurent en toute saison.",
    shortDescription:
      "Le seul chalet sur sa propre pointe — vue directe sur le lac et plage privée de sable.",
    location: "Saint-Mathieu-de-Rioux, Bas-Saint-Laurent, Québec",
    city: "Saint-Mathieu-de-Rioux",
    province: "Québec",
    country: "Canada",
    basePrice: 350,
    coverImage: aerialImg,
    galleryImages: [
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
    ],
    amenities: [
      { label: "Plage privée de sable", icon: "Umbrella" },
      { label: "Sur la pointe — vue directe", icon: "Eye" },
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
    ],
    bedrooms: 4,
    bathrooms: 2,
    maxGuests: 8,
    isActive: true,
    tags: ["Plage privée", "Sur la pointe", "Vue directe sur le lac", "4 saisons"],
  },
];

export const allImages = {
  aerialImg,
  balconImg,
  beachImg,
  chambreImg,
  salonImg,
  salleAMangerImg,
  winterImg,
  sunsetImg,
  mistyImg,
  stormImg,
  lakeImg,
};

export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find((p) => p.slug === slug);
}

export function getActiveProperties(): Property[] {
  return properties.filter((p) => p.isActive);
}
