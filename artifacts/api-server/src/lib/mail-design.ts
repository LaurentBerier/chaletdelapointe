import { chaletEmail } from "../../../../lib/shared/chalet-email.mjs";

export function bookingHtml(subject: string, body: string, url?: string) {
  const review = subject.includes("à approuver");
  const href =
    url &&
    new URL(
      review ? "/tableau-de-bord?onglet=approbations" : "/tableau-de-bord",
      url,
    ).href;
  return chaletEmail({
    category: review ? "Comité d’approbation" : "Votre réservation",
    title: subject.split(" · ").pop() || subject,
    message: body.split("\n\nExaminer la demande :")[0],
    button: review ? "Examiner la demande" : "Voir mon séjour",
    href,
    note: "Une question sur ce séjour ? Répondez simplement à ce courriel.",
    view: "pointe",
  });
}
