import {
  relationships,
  isRelationship,
} from "../../../../lib/shared/membership";
import {
  reviewId,
  reviewPath,
  rememberReview,
  rememberedReview,
} from "@/lib/access-review";
import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { KeyRound, Mail, ArrowLeft, Waves } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import hero from "@assets/IMG_0559_1777733069151.jpg";

export default function Connexion() {
  const auth = useAuth(),
    [path] = useLocation();
  const [tab, setTab] = useState<"password" | "link" | "forgot">("password");
  const [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [relation, setRelation] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const mode = auth.recovery
    ? "recover"
    : path === "/inscription"
      ? "signup"
      : tab;
  const reset = (t: typeof tab) => {
    setTab(t);
    setError("");
    setNotice("");
    setPassword("");
  };
  const requestedReview = reviewId(location.search);
  const returnReview =
    requestedReview || (auth.user?.isAdmin && rememberedReview());
  if (auth.isAuthenticated && !auth.recovery)
    return (
      <Redirect
        to={
          returnReview
            ? reviewPath(returnReview)
            : new URLSearchParams(location.search).get("suite") ===
                "approbations"
              ? "/tableau-de-bord?onglet=approbations"
              : new URLSearchParams(location.search).get("suite") === "profil"
                ? "/tableau-de-bord?onglet=profil"
                : localStorage.getItem("chalet.calendar.sign-in-dates") &&
                    auth.user?.canBook
                  ? "/calendrier?reprendre=1"
                  : auth.user?.canBook
                    ? "/tableau-de-bord"
                    : "/tableau-de-bord?onglet=profil"
        }
      />
    );
  const title = {
    signup: "Demander un compte",
    password: "Bon retour au chalet",
    link: "Un lien par courriel",
    forgot: "Mot de passe oublié",
    recover: "Nouveau mot de passe",
  }[mode];
  return (
    <main className="auth-shell">
      <div
        className="auth-landscape"
        style={{
          backgroundImage:
            "linear-gradient(0deg,#16342ed9,transparent 75%),url(" + hero + ")",
        }}
      >
        <div>
          <Waves />
          <p className="eyebrow">Lac Saint-Mathieu · Québec</p>
          <h2>Le chalet de la Pointe</h2>
        </div>
      </div>
      <section className="auth-main">
        <Link href="/" className="inline-flex gap-2 items-center text-sm">
          <ArrowLeft size={16} /> Retour au chalet
        </Link>
        <div className="auth-form">
          <p className="eyebrow">Espace personnel</p>
          <h1>{title}</h1>
          <p className="text-muted-foreground mb-6">
            {mode === "signup"
              ? "Indiquez votre lien avec le chalet, puis confirmez votre courriel. L’administration examinera votre demande et vous répondra par courriel."
              : mode === "recover"
                ? "Choisissez un mot de passe d’au moins 10 caractères."
                : mode === "forgot"
                  ? "Recevez un lien pour choisir un nouveau mot de passe."
                  : "Retrouvez votre profil, vos séjours et les chroniques du lac."}
          </p>
          {(mode === "password" || mode === "link") && (
            <div className="switcher">
              {(["password", "link"] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={t === tab}
                  onClick={() => reset(t)}
                >
                  {t === "password" ? (
                    <KeyRound size={15} />
                  ) : (
                    <Mail size={15} />
                  )}{" "}
                  {t === "password" ? "Mot de passe" : "Lien par courriel"}
                </button>
              ))}
            </div>
          )}
          <form
            className="account-form"
            data-testid="form-connexion"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setNotice("");
              try {
                if (mode === "signup") {
                  if (!isRelationship(relation))
                    throw new Error("Choisissez votre lien avec le chalet.");
                  await auth.register(email, password, name, relation);
                  setPassword("");
                  setNotice(
                    "Pour une nouvelle inscription, ouvrez le courriel de confirmation. Votre demande sera ensuite transmise à l’administration. Si vous avez déjà un compte, utilisez la connexion.",
                  );
                }
                if (mode === "password")
                  await auth.passwordLogin(email, password);
                if (mode === "link") {
                  rememberReview(requestedReview);
                  await auth.login(email);
                  setNotice(
                    requestedReview
                      ? "Consultez votre courriel de connexion. Si vous l’ouvrez sur un autre appareil, rouvrez ensuite le lien Examiner la demande."
                      : "Si votre compte existe, un lien de connexion vous sera envoyé.",
                  );
                }
                if (mode === "forgot") {
                  await auth.sendRecovery(email);
                  setNotice(
                    "Si votre compte existe, vous recevrez un lien de réinitialisation.",
                  );
                }
                if (mode === "recover") {
                  await auth.savePassword(password);
                  setPassword("");
                }
              } catch {
                setError(
                  mode === "password"
                    ? "Connexion impossible. Vérifiez votre courriel et votre mot de passe."
                    : "Demande impossible. Vérifiez les champs ou réessayez dans un instant.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "signup" && (
              <label>
                Nom affiché
                <input
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {mode === "signup" && (
              <label>
                Lien avec le chalet
                <select
                  name="relation"
                  value={relation}
                  required
                  onChange={(e) => setRelation(e.target.value)}
                >
                  <option value="" disabled>
                    Choisissez une réponse
                  </option>
                  {Object.entries(relationships).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode !== "recover" && (
              <label>
                Adresse courriel
                <input
                  data-testid="input-email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {["password", "signup", "recover"].includes(mode) && (
              <label>
                {mode === "password"
                  ? "Mot de passe"
                  : "Mot de passe (10 caractères minimum)"}
                <input
                  required
                  type="password"
                  minLength={mode === "password" ? 1 : 10}
                  autoComplete={
                    mode === "password" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            {mode === "password" && (
              <button
                type="button"
                className="text-link"
                onClick={() => reset("forgot")}
              >
                Mot de passe oublié ?
              </button>
            )}
            {(error || auth.authError) && (
              <p className="feedback" role="alert">
                {error || auth.authError}
              </p>
            )}
            {notice && (
              <div className="sent-note" role="status">
                <img
                  src="/media/chalet/pine.jpg"
                  width="480"
                  height="320"
                  alt=""
                />
                <div>
                  <strong>Votre boîte courriel</strong>
                  <p>{notice}</p>
                </div>
              </div>
            )}
            <button
              data-testid="button-submit"
              className="action"
              disabled={busy || auth.isLoading}
            >
              {busy
                ? "Un instant…"
                : {
                    signup: "Demander un compte",
                    password: "Me connecter",
                    link: "Recevoir mon lien",
                    forgot: "Envoyer le lien",
                    recover: "Enregistrer mon mot de passe",
                  }[mode]}
            </button>
          </form>
          <div className="mt-7 border-t pt-4 text-sm">
            {mode === "signup" ? (
              <Link href="/connexion" onClick={() => reset("password")}>
                Déjà membre ? <u>Se connecter</u>
              </Link>
            ) : mode === "forgot" ? (
              <button onClick={() => reset("password")}>
                ← Revenir à la connexion
              </button>
            ) : (
              mode !== "recover" && (
                <Link href="/inscription" onClick={() => reset("password")}>
                  Première visite ? <u>Créer un compte</u>
                </Link>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
