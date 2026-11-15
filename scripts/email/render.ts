// Run with: pnpm --filter @workspace/scripts exec tsx email/render.ts
import { writeFileSync } from "node:fs";
import { chaletEmail } from "../../lib/shared/chalet-email.mjs";
const letters = {
  confirmation: [
    "Inscription",
    "Confirmez votre adresse courriel",
    "Confirmez votre adresse pour transmettre votre demande de compte à l’administration du chalet. Vous recevrez ensuite sa décision par courriel.",
    "Confirmer mon adresse",
    "pointe",
  ],
  magic_link: [
    "Connexion",
    "Bon retour au chalet",
    "Utilisez ce lien personnel pour ouvrir votre espace.",
    "Ouvrir mon espace",
    "brume",
  ],
  recovery: [
    "Sécurité du compte",
    "Réinitialiser votre mot de passe",
    "Ce lien personnel vous permet de choisir un nouveau mot de passe pour votre compte.",
    "Choisir un mot de passe",
    "brume",
  ],
  invite: [
    "Invitation",
    "Votre place au chalet",
    "Vous êtes invité à rejoindre l’espace des propriétaires du Chalet de la Pointe.",
    "Accepter mon invitation",
    "pointe",
  ],
} as const;
for (const [key, [category, title, message, button, view]] of Object.entries(
  letters,
)) {
  const html = chaletEmail({
    category,
    title,
    message,
    button,
    view,
    href: "{{ .ConfirmationURL }}",
    note:
      key === "invite"
        ? "Si cette invitation ne vous est pas destinée, vous pouvez l’ignorer."
        : "Si vous n’avez pas demandé ce courriel, vous pouvez l’ignorer.",
  });
  writeFileSync(
    new URL("../../supabase/templates/" + key + ".html", import.meta.url),
    html + "\n",
  );
}
