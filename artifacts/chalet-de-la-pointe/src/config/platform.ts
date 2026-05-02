export const platformConfig = {
  platformName: "ChaletDeLaPointe",
  tagline: "Un refuge silencieux sur l'eau",
  primaryColor: "#2C3E50",
  currency: "CAD",
  currencySymbol: "$",
  region: "Québec, Canada",
  locale: "fr-CA",
  contactEmail: "info@chaletdelapointe.ca",
  contactPhone: "+1 (418) 000-0000",
  socialLinks: {
    instagram: "https://instagram.com/chaletdelapointe",
    facebook: "https://facebook.com/chaletdelapointe",
  },
} as const;

export type PlatformConfig = typeof platformConfig;
