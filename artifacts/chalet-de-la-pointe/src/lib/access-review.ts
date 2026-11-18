// Store only the request reference (never a credential) when the login email
// opens a new tab. Navigation always stays on a fixed path on this site.
const key = "chalet.access-review";
export function reviewId(search: string) {
  const value = new URLSearchParams(search).get("demande");
  return value && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
    ? value
    : null;
}
export function reviewPath(id: string) {
  return "/tableau-de-bord?onglet=comptes&demande=" + encodeURIComponent(id);
}
export function rememberReview(id: string | null) {
  try {
    if (id)
      localStorage.setItem(
        key,
        JSON.stringify({ id, until: Date.now() + 3600000 }),
      );
    else localStorage.removeItem(key);
  } catch {
    /* Password login still has the reference in the URL. */
  }
}
export function rememberedReview() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value?.until > Date.now())
      return reviewId("demande=" + encodeURIComponent(value.id));
  } catch {
    /* No valid reference. */
  }
  return null;
}

const panelIds = [
  "vie",
  "profil",
  "securite",
  "reservations",
  "approbations",
  "comptes",
  "sejours",
  "chalet",
  "blogue",
];
export function returnPanel(search: string, key: "onglet" | "suite") {
  const panel = new URLSearchParams(search).get(key);
  return panel && panelIds.includes(panel) ? panel : undefined;
}

// Keep only known, inert references when signing in from a shared community link.
export function communityDestination(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("onglet") !== "vie" && params.get("suite") !== "vie")
    return "";
  const safe = new URLSearchParams();
  for (const key of ["document", "section", "discussion"]) {
    const value = params.get(key);
    if (value && /^[a-z0-9-]{1,100}$/.test(value)) safe.set(key, value);
  }
  const view = params.get("vue");
  if (view && ["reglements", "discussions", "notifications"].includes(view))
    safe.set("vue", view);
  return safe.size ? "&" + safe.toString() : "";
}

export function articleDestination(search: string) {
  const params = new URLSearchParams(search),
    slug = params.get("article");
  return params.get("suite") === "blogue" &&
    slug &&
    /^[a-z0-9-]{1,100}$/.test(slug)
    ? "/blogue/" + slug + "#commentaires"
    : "";
}
