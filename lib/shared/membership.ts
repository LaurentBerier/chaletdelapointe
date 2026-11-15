export const relationships = {
  proprietaire: "Propriétaire",
  ancien_proprietaire: "Ancien propriétaire",
  ami_famille: "Ami de la famille",
  location: "Aucun lien familial — je souhaite louer le chalet",
} as const;
export type Relationship = keyof typeof relationships;
export type AccountStatus = "pending" | "approved" | "denied";
export const isRelationship = (value: unknown): value is Relationship =>
  typeof value === "string" && Object.hasOwn(relationships, value);
export function relationshipLabel(value: unknown) {
  return isRelationship(value) ? relationships[value] : "Non précisé";
}
