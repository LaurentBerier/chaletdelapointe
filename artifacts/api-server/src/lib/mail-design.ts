const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function bookingHtml(subject: string, body: string, url?: string) {
  const review = subject.includes("à approuver");
  const href =
    url &&
    new URL(
      review ? "/tableau-de-bord?onglet=approbations" : "/tableau-de-bord",
      url,
    ).href;
  return (
    '<!doctype html><html lang="fr"><body style="background:#f2f3ed;padding:24px;font:16px/1.6 Arial,sans-serif;color:#243e37"><div style="max-width:520px;margin:auto;background:white;border:1px solid #d4ded7;border-radius:16px;overflow:hidden"><div style="background:#254b42;color:white;padding:24px 32px;letter-spacing:2px">CHALET DE LA POINTE</div><div style="padding:28px 32px"><small>LAC SAINT-MATHIEU · RÉSERVATIONS</small><h1 style="font:30px Georgia,serif">' +
    escape(subject.split(" · ").pop() || subject) +
    "</h1><p>" +
    escape(body.split("\n\nExaminer la demande :")[0]).replace(/\n/g, "<br>") +
    "</p>" +
    (href
      ? '<p style="margin:28px 0"><a style="background:#254b42;color:white;text-decoration:none;padding:12px 20px;border-radius:8px" href="' +
        escape(href) +
        '">' +
        (review ? "Examiner la demande" : "Voir mon séjour") +
        "</a></p>"
      : "") +
    '<p style="color:#596b64;font-size:13px">Une question ? Répondez simplement à ce courriel.</p></div></div></body></html>'
  );
}
