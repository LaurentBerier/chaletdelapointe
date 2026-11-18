import {
  relationshipLabel,
  type Relationship,
  type AccountStatus,
} from "../../../../lib/shared/membership";
import { managesStays } from "../../../../lib/shared/reservation-roles";
import { BlogComments } from "./blog-comments";
import { BookingAccessPanel } from "./booking-access";
import { AdminCancelStay } from "./cancel-stay";
import type { BookingAccess } from "../../../../lib/db/src/booking-access";
import { IllustratedNote } from "./field-heading";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { BlogContent, BlogImage, uploadBlogImage } from "./blog-content";
import {
  legacyRichContent,
  parseRichContent,
  type RichNode,
} from "../../../../lib/shared/blog-content";
const BlogEditor = lazy(() =>
  import("./blog-editor").then((m) => ({ default: m.BlogEditor })),
);
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerRequest, useAuth } from "@/context/AuthContext";
import { listProperties } from "@workspace/api-client-react";
import { dayKey, stayDates } from "../../../../lib/shared/stay-dates";
import type { BlogPost } from "@/data/blog";
import { Link } from "wouter";

type Account = {
  id: string;
  name: string;
  email: string;
  accountStatus: AccountStatus;
  declaredRelation: Relationship | null;
  registrationRequestId: string | null;
  group: string;
  canApprove: boolean;
  isDisabled: boolean;
  isAdmin: boolean;
  isReservationAdmin: boolean;
  bookingAccess: BookingAccess;
  bookingAccessRequestId: string | null;
  bookingAccessRequestedAt: string | null;
};
const groups: Record<string, string> = {
  public: "Membre",
  proprietaire: "Propriétaire",
  ancien_proprietaire: "Ancien propriétaire",
  famille: "Famille",
  ami: "Ami",
};
const write = (url: string, method: string, body?: unknown) =>
  ownerRequest(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
function useAction() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    cache = useQueryClient();
  async function run(
    work: () => Promise<unknown>,
    success = "Modifications enregistrées.",
  ) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
      await cache.invalidateQueries();
      setMessage(success);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    run,
    feedback: message ? (
      <p className="feedback" role="status">
        {message}
      </p>
    ) : null,
  };
}
const values = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  return Object.fromEntries(new FormData(e.currentTarget));
};
export function ProfilePanel() {
  const { user, saveName } = useAuth(),
    nameAction = useAction();
  return (
    <>
      <h2 className="section-title">Mon profil</h2>
      <div className="account-grid">
        <form
          className="panel account-form"
          onSubmit={(e) => {
            const f = values(e);
            void nameAction.run(() => saveName(String(f.name)));
          }}
        >
          <p className="eyebrow">Identité</p>
          <h3>Mon nom affiché</h3>
          <p>
            Vos articles portent ce nom. Seuls les propriétaires le voient sur
            vos séjours approuvés.
          </p>
          <label>
            Nom affiché
            <input
              name="name"
              defaultValue={user?.name}
              required
              maxLength={80}
            />
          </label>
          <p className="text-sm">{user?.email}</p>
          <button className="action" disabled={nameAction.busy}>
            Enregistrer le nom
          </button>
          {nameAction.feedback}
        </form>
        <BookingAccessPanel />
      </div>
    </>
  );
}
export function SecurityPanel() {
  const { user, savePassword } = useAuth(),
    pw = useAction();
  const hasPassword = !!user?.hasPassword;
  return (
    <>
      <h2 className="section-title">Sécurité</h2>
      <div className="security-panel">
        <form
          className="panel account-form"
          onSubmit={(e) => {
            const form = e.currentTarget,
              f = values(e);
            void pw.run(
              async () => {
                if (f.password !== f.confirm)
                  throw Error("Les mots de passe ne correspondent pas.");
                await savePassword(String(f.password));
                form.reset();
              },
              hasPassword
                ? "Votre mot de passe a été modifié."
                : "Votre mot de passe a été créé.",
            );
          }}
        >
          <p className="eyebrow">Connexion au compte</p>
          <h3>
            {hasPassword
              ? "Changer mon mot de passe"
              : "Créer mon mot de passe"}
          </h3>
          <p>
            {hasPassword
              ? "Choisissez un nouveau mot de passe d’au moins 10 caractères."
              : "Aucun mot de passe n’est défini. Choisissez-en un d’au moins 10 caractères pour vous connecter aussi sans lien par courriel."}
          </p>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              name="password"
              minLength={10}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirmer le mot de passe
            <input
              type="password"
              name="confirm"
              required
              autoComplete="new-password"
            />
          </label>
          <button className="action" disabled={pw.busy}>
            {pw.busy
              ? "Enregistrement…"
              : hasPassword
                ? "Enregistrer le nouveau mot de passe"
                : "Créer le mot de passe"}
          </button>
          {pw.feedback}
        </form>
      </div>
    </>
  );
}
function AccessDecision({ account: a }: { account: Account }) {
  const op = useAction(),
    cache = useQueryClient();
  if (
    a.accountStatus !== "approved" ||
    a.isDisabled ||
    a.isAdmin ||
    a.bookingAccess === "none"
  )
    return null;
  const decide = (decision: "approve" | "deny" | "revoke" | "reopen") =>
    op.run(async () => {
      try {
        await write("/admin/accounts/" + a.id + "/booking-access", "POST", {
          decision,
          requestId: a.bookingAccessRequestId,
        });
      } finally {
        await cache.invalidateQueries({ queryKey: ["admin-accounts"] });
        await cache.invalidateQueries({ queryKey: ["admin-access-count"] });
      }
    });
  return (
    <div className="access-decision">
      {a.bookingAccess === "pending" ? (
        <div className="button-row">
          <button
            className="action"
            disabled={op.busy}
            onClick={() => decide("approve")}
          >
            Autoriser à réserver
          </button>
          <button
            className="secondary-action"
            disabled={op.busy}
            onClick={() => decide("deny")}
          >
            Refuser l’accès
          </button>
        </div>
      ) : a.bookingAccess === "granted" ? (
        <>
          <p>Accès aux réservations : autorisé.</p>
          <button
            className="text-link"
            disabled={op.busy}
            onClick={() => decide("revoke")}
          >
            Retirer le droit de réserver
          </button>
        </>
      ) : (
        <>
          <p>La demande d’accès aux réservations a été refusée.</p>
          <button
            className="text-link"
            disabled={op.busy}
            onClick={() => decide("reopen")}
          >
            Permettre une nouvelle demande
          </button>
        </>
      )}
      {op.feedback}
    </div>
  );
}
function RegistrationCard({ a }: { a: Account }) {
  const { user } = useAuth();
  const op = useAction(),
    cache = useQueryClient();
  const [group, setGroup] = useState("public"),
    [canBook, setBook] = useState(false),
    [canApprove, setApprove] = useState(false);
  const decide = (decision: "approve" | "deny") =>
    op.run(async () => {
      try {
        await write("/admin/accounts/" + a.id + "/registration", "POST", {
          decision,
          requestId: a.registrationRequestId,
          ...(decision === "approve"
            ? {
                group,
                canBook,
                canApprove: group === "proprietaire" && canApprove,
              }
            : {}),
        });
      } finally {
        await cache.invalidateQueries({ queryKey: ["admin-accounts"] });
      }
    });
  return (
    <article className="access-queue-item account-form">
      <strong>{a.name}</strong>
      <p>{a.email}</p>
      <p>Lien déclaré : {relationshipLabel(a.declaredRelation)}</p>
      {a.accountStatus !== "pending" ? (
        <p role="status">
          {a.accountStatus === "approved"
            ? "Inscription approuvée."
            : "Inscription refusée."}
        </p>
      ) : (
        <>
          {user?.isAdmin ? (
            <label>
              Rôle à attribuer
              <select
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  setApprove(false);
                }}
              >
                {Object.entries(groups).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              Le compte sera ouvert comme membre. Le super administrateur
              attribue les rôles.
            </p>
          )}
          {group === "proprietaire" && (
            <p>
              Un propriétaire voit les noms associés aux séjours en attente et
              confirmés.
            </p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={canBook}
              onChange={(e) => setBook(e.target.checked)}
            />{" "}
            Autoriser à faire des réservations
          </label>
          {group === "proprietaire" && (
            <label className="check">
              <input
                type="checkbox"
                checked={canApprove}
                onChange={(e) => setApprove(e.target.checked)}
              />{" "}
              Recevoir et traiter les demandes de séjour
            </label>
          )}
          <p>Le membre recevra votre décision par courriel.</p>
          <div className="button-row">
            <button
              className="action"
              disabled={op.busy}
              onClick={() => decide("approve")}
            >
              Approuver le compte
            </button>
            <button
              className="secondary-action"
              disabled={op.busy}
              onClick={() => decide("deny")}
            >
              Refuser l’inscription
            </button>
          </div>
        </>
      )}
      {op.feedback}
    </article>
  );
}
function AccountRow({ a }: { a: Account }) {
  const op = useAction(),
    [group, setGroup] = useState(a.group);
  return (
    <details className="panel">
      <summary>
        <span>
          <strong>{a.name}</strong>
          <small>{a.email}</small>
        </span>
        <span className="badge">
          {a.isAdmin
            ? "Super admin"
            : a.isDisabled
              ? "Suspendu"
              : a.isReservationAdmin
                ? "Administrateur"
                : groups[a.group]}
        </span>
      </summary>
      {a.declaredRelation && (
        <p>Lien déclaré : {relationshipLabel(a.declaredRelation)}</p>
      )}
      {a.bookingAccess === "denied" && <AccessDecision account={a} />}
      {a.isAdmin ? (
        <p className="mt-4">
          Compte protégé. Modifiez votre nom dans Mon profil.
        </p>
      ) : (
        <form
          className="account-form mt-5"
          onSubmit={(e) => {
            const f = values(e);
            void op.run(() =>
              write("/admin/accounts/" + a.id, "PATCH", {
                ...(f.name === a.name ? {} : { name: f.name }),
                group,
                canApprove: f.approve === "on",
                ...(a.bookingAccess !== "pending" &&
                (f.book === "on") !== (a.bookingAccess === "granted")
                  ? { canBook: f.book === "on" }
                  : {}),
                isDisabled: f.disabled === "on",
                isReservationAdmin: f.staff === "on",
              }),
            );
          }}
        >
          <label>
            Nom affiché
            <input name="name" defaultValue={a.name} maxLength={80} required />
          </label>
          <label>
            Lien avec le chalet
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {Object.entries(groups).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {a.bookingAccess === "pending" ? (
            <p>
              Une demande d’accès aux réservations est en attente : utilisez les
              boutons de décision ci-dessus.
            </p>
          ) : (
            <label className="check">
              <input
                key={a.bookingAccess}
                name="book"
                type="checkbox"
                defaultChecked={a.bookingAccess === "granted"}
              />{" "}
              Autoriser à faire des réservations
            </label>
          )}
          {group === "proprietaire" && (
            <label className="check">
              <input
                type="checkbox"
                name="approve"
                defaultChecked={a.canApprove}
              />{" "}
              Recevoir et traiter les demandes de réservation
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              name="staff"
              defaultChecked={a.isReservationAdmin}
            />{" "}
            Administrateur
          </label>
          <p className="text-sm">
            Gère tous les séjours et examine les demandes de compte et d’accès
            aux réservations.
          </p>
          <label className="check">
            <input
              type="checkbox"
              name="disabled"
              defaultChecked={a.isDisabled}
            />{" "}
            Suspendre l’accès à la plateforme
          </label>
          <button className="action" disabled={op.busy}>
            Enregistrer ce compte
          </button>
          {op.feedback}
        </form>
      )}
    </details>
  );
}
export function AccountsPanel({ requestId }: { requestId: string | null }) {
  const { user } = useAuth();
  const full = !!user?.isAdmin;
  const q = useQuery({
    queryKey: [
      "admin-accounts",
      user?.id,
      full ? "directory" : "requests",
      requestId,
    ],
    refetchInterval: 30000,
    queryFn: () =>
      ownerRequest<Account[]>(
        full
          ? "/admin/accounts"
          : "/admin/requests" +
              (requestId ? "?demande=" + encodeURIComponent(requestId) : ""),
      ),
  });
  if (requestId) {
    const applicant = q.data?.find(
      (a) => a.registrationRequestId === requestId,
    );
    if (applicant)
      return (
        <section
          className="access-queue"
          aria-label="Inscription reçue par courriel"
        >
          <p className="eyebrow">Création de compte</p>
          <h2 className="section-title">Demande d’inscription</h2>
          <RegistrationCard a={applicant} key={applicant.id} />
          <Link className="text-link" href="/tableau-de-bord?onglet=comptes">
            {full ? "Voir tous les comptes" : "Voir toutes les demandes"}
          </Link>
        </section>
      );
    const member = q.data?.find(
      (a) => a.bookingAccessRequestId === requestId && !a.isDisabled,
    );
    return (
      <section className="access-queue" aria-label="Demande reçue par courriel">
        <p className="eyebrow">Accès aux réservations</p>
        <h2 className="section-title">Demande du membre</h2>
        {q.isPending ? (
          <p>Chargement…</p>
        ) : q.isError ? (
          <p role="alert">
            Impossible de charger cette demande. Réessayez dans un instant.
          </p>
        ) : !member ? (
          <p>Cette demande n’est plus active.</p>
        ) : (
          <div className="access-queue-item">
            <strong>{member.name}</strong>
            <p>{member.email}</p>
            {member.bookingAccess === "pending" ? (
              <>
                <p>Le membre recevra votre décision par courriel.</p>
                <AccessDecision account={member} />
              </>
            ) : (
              <p role="status">
                {member.bookingAccess === "granted"
                  ? "Demande acceptée."
                  : "Demande refusée."}
              </p>
            )}
          </div>
        )}
        <Link className="text-link" href="/tableau-de-bord?onglet=comptes">
          {full ? "Voir tous les comptes" : "Voir toutes les demandes"}
        </Link>
      </section>
    );
  }
  return (
    <>
      <h2 className="section-title">
        {full ? "Comptes et accès" : "Demandes des membres"}
      </h2>
      <p className="section-note">
        Les nouveaux membres apparaissent après confirmation de leur courriel.
        Le droit de réserver peut être accordé sans attribuer le rôle de
        propriétaire.
      </p>
      {q.data && (
        <section
          className="access-queue"
          aria-label="Demandes de création de compte"
        >
          <p className="eyebrow">Inscriptions</p>
          <h3>Demandes de création de compte</h3>
          {q.data.some((a) => a.accountStatus === "pending") ? (
            q.data
              .filter((a) => a.accountStatus === "pending")
              .map((a) => <RegistrationCard key={a.id} a={a} />)
          ) : (
            <p>Aucune inscription en attente.</p>
          )}
        </section>
      )}
      {q.data && (
        <section
          className="access-queue"
          aria-label="Demandes d’accès aux réservations"
        >
          <p className="eyebrow">À examiner</p>
          <h3>Demandes d’accès aux réservations</h3>
          {q.data.some(
            (a) =>
              a.bookingAccess === "pending" &&
              !a.isDisabled &&
              a.accountStatus === "approved",
          ) ? (
            q.data
              .filter(
                (a) =>
                  a.bookingAccess === "pending" &&
                  !a.isDisabled &&
                  a.accountStatus === "approved",
              )
              .sort((a, b) =>
                (a.bookingAccessRequestedAt ?? "").localeCompare(
                  b.bookingAccessRequestedAt ?? "",
                ),
              )
              .map((a) => (
                <div key={a.id} className="access-queue-item">
                  <strong>{a.name}</strong>
                  <p>{a.email}</p>
                  <AccessDecision account={a} />
                </div>
              ))
          ) : (
            <p>Aucune demande en attente.</p>
          )}
        </section>
      )}
      {q.isPending
        ? "Chargement…"
        : q.isError
          ? "Comptes indisponibles."
          : full &&
            q.data
              .filter((a) => a.accountStatus === "approved")
              .map((a) => <AccountRow key={a.id} a={a} />)}
      {full && q.data?.some((a) => a.accountStatus === "denied") && (
        <details className="panel">
          <summary>Inscriptions refusées</summary>
          {q.data
            .filter((a) => a.accountStatus === "denied")
            .map((a) => (
              <RegistrationCard a={a} key={a.id} />
            ))}
        </details>
      )}
    </>
  );
}
export function ChaletPanel() {
  const q = useQuery({
      queryKey: ["chalet-listing"],
      queryFn: () => listProperties(),
    }),
    op = useAction();
  return (
    <>
      <h2 className="section-title">Réglages du chalet</h2>
      {q.isPending
        ? "Chargement…"
        : q.isError
          ? "Chalet indisponible."
          : q.data.map((p) => (
              <form
                key={p.id}
                className="panel account-form"
                onSubmit={(e) => {
                  const f = values(e);
                  void op.run(() =>
                    write("/admin/properties/" + p.id, "PATCH", {
                      ...f,
                      maxGuests: Number(f.maxGuests),
                    }),
                  );
                }}
              >
                <label>
                  Nom du chalet
                  <input
                    name="name"
                    defaultValue={p.name}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Description du séjour
                  <textarea
                    name="description"
                    defaultValue={p.description}
                    maxLength={2000}
                  />
                </label>
                <label>
                  Capacité maximale
                  <input
                    name="maxGuests"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={p.maxGuests}
                    required
                  />
                </label>
                <button className="action" disabled={op.busy}>
                  Enregistrer le chalet
                </button>
                {op.feedback}
              </form>
            ))}
    </>
  );
}
function Editor({ post, close }: { post?: BlogPost; close: () => void }) {
  const { user } = useAuth(),
    op = useAction();
  const [remove, setRemove] = useState(false);
  const [richContent, setRichContent] = useState<RichNode>(
    () => post?.richContent ?? legacyRichContent(post?.content || ""),
  );
  const [mediaBusy, setMediaBusy] = useState(false),
    [coverBusy, setCoverBusy] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(
      post?.coverImage ?? null,
    ),
    [mediaError, setMediaError] = useState("");
  const [preview, setPreview] = useState(false);
  return (
    <form
      className="panel account-form"
      onSubmit={(e) => {
        const f = values(e);
        if (mediaBusy || coverBusy) return;
        void op.run(async () => {
          const parsed = parseRichContent(richContent);
          await write(
            post ? "/account/articles/" + post.id : "/account/articles",
            post ? "PATCH" : "POST",
            {
              ...f,
              content: parsed.text,
              richContent: parsed.document,
              coverImage,
              published: f.published === "on",
            },
          );
          close();
        });
      }}
    >
      <h3>{post ? "Modifier la chronique" : "Nouvelle chronique"}</h3>
      <label>
        Titre
        <input
          name="title"
          defaultValue={post?.title}
          maxLength={160}
          required
        />
      </label>
      <label>
        Résumé
        <textarea
          name="excerpt"
          defaultValue={post?.excerpt}
          required
          maxLength={500}
        />
      </label>
      <div className="blog-cover-editor">
        <div>
          <strong>Image de couverture</strong>
          <p className="community-muted">
            Une photo ou un GIF pour la carte du blogue et le haut de l’article.
          </p>
        </div>
        {coverImage && (
          <BlogImage
            src={coverImage}
            alt="Aperçu de la couverture"
            className="blog-cover-preview"
          />
        )}
        <label>
          Choisir une couverture
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={coverBusy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setCoverBusy(true);
              setMediaError("");
              try {
                setCoverImage(await uploadBlogImage(file));
              } catch (err) {
                setMediaError((err as Error).message);
              } finally {
                setCoverBusy(false);
              }
            }}
          />
        </label>
        {coverBusy && <p role="status">Ajout de la couverture…</p>}
        {coverImage && (
          <button
            type="button"
            className="text-link"
            onClick={() => setCoverImage(null)}
          >
            Retirer la couverture
          </button>
        )}
        {mediaError && (
          <p className="community-error" role="alert">
            {mediaError}
          </p>
        )}
      </div>
      <div>
        <div className="rich-editor-heading">
          <strong>Texte de la chronique</strong>
          <button
            type="button"
            className="text-link"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Revenir à l’éditeur" : "Aperçu du texte"}
          </button>
        </div>
        <div hidden={preview}>
          <Suspense fallback={<p>Chargement de l’éditeur…</p>}>
            <BlogEditor
              initialContent={richContent}
              onChange={setRichContent}
              onBusyChange={setMediaBusy}
            />
          </Suspense>
        </div>
        {preview && (
          <div className="blog-preview">
            <BlogContent rich={richContent} content="" />
          </div>
        )}
      </div>
      {
        <label className="check">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post?.published}
          />{" "}
          Publier sur le blogue
        </label>
      }
      <div className="button-row">
        <button className="action" disabled={op.busy || mediaBusy || coverBusy}>
          Enregistrer
        </button>
        <button className="secondary-action" type="button" onClick={close}>
          Fermer
        </button>
        {managesStays(user) && post && (
          <button
            className="text-link"
            type="button"
            onClick={() => setRemove(!remove)}
          >
            Retirer du blogue…
          </button>
        )}
      </div>
      {remove && (
        <div className="feedback">
          <p>
            Retirer cet article du blogue ? Les admins pourront le rétablir en
            brouillon.
          </p>
          <button
            type="button"
            className="text-link"
            disabled={op.busy}
            onClick={() =>
              op.run(async () => {
                await write("/admin/articles/" + post!.id, "DELETE");
                close();
              })
            }
          >
            Confirmer le retrait
          </button>
        </div>
      )}
      {op.feedback}
    </form>
  );
}
export function BlogPanel() {
  const { user } = useAuth(),
    moderation = useAction(),
    q = useQuery({
      queryKey: ["account-articles", user?.id],
      queryFn: () => ownerRequest<BlogPost[]>("/account/articles"),
    }),
    [edit, setEdit] = useState<BlogPost | "new" | null>(null);
  return (
    <>
      <div className="panel-heading">
        <h2 className="section-title">
          {managesStays(user) ? "Gestion du blogue" : "Mes chroniques"}
        </h2>
        <button className="action" onClick={() => setEdit("new")}>
          Écrire une chronique
        </button>
      </div>
      <p className="section-note">
        Vous pouvez écrire et publier vos chroniques. Les articles publiés sont
        visibles sur le site; vos brouillons restent privés. Les admins peuvent
        modérer les publications et les commentaires.
      </p>
      {edit && (edit === "new" || !edit.removedAt) && (
        <Editor
          key={edit === "new" ? "new" : edit.id}
          post={edit === "new" ? undefined : edit}
          close={() => setEdit(null)}
        />
      )}
      {edit && edit !== "new" && <BlogComments slug={edit.slug} />}
      {moderation.feedback}
      {q.isPending ? (
        "Chargement…"
      ) : q.isError ? (
        "Articles indisponibles."
      ) : !q.data.length ? (
        <IllustratedNote kind="pine">
          <h3>Votre première chronique</h3>
          <p>Commencez un brouillon pour raconter un moment au chalet.</p>
        </IllustratedNote>
      ) : (
        q.data.map((p) => (
          <div key={p.id} className="panel">
            <span className="badge">
              {p.removedAt
                ? "Retiré par la modération"
                : p.published
                  ? "Publié"
                  : "Brouillon"}
            </span>
            <h3 className="mt-2">{p.title}</h3>
            <p>{p.author || "Équipe ChaletDeLaPointe"}</p>
            <div className="button-row mt-3">
              {!p.removedAt && (
                <button className="text-link" onClick={() => setEdit(p)}>
                  Modifier
                </button>
              )}
              {managesStays(user) && (
                <>
                  <button
                    className="text-link"
                    disabled={moderation.busy}
                    onClick={() =>
                      moderation.run(() =>
                        write(
                          "/admin/articles/" + p.id + "/moderation",
                          "POST",
                          { action: p.commentsLocked ? "unlock" : "lock" },
                        ),
                      )
                    }
                  >
                    {p.commentsLocked
                      ? "Rouvrir les commentaires"
                      : "Fermer les commentaires"}
                  </button>
                  {p.removedAt && (
                    <button
                      className="text-link"
                      disabled={moderation.busy}
                      onClick={() =>
                        moderation.run(() =>
                          write(
                            "/admin/articles/" + p.id + "/moderation",
                            "POST",
                            { action: "restore" },
                          ),
                        )
                      }
                    >
                      Rétablir en brouillon
                    </button>
                  )}
                  {p.removedAt && (
                    <button className="text-link" onClick={() => setEdit(p)}>
                      Examiner les commentaires
                    </button>
                  )}
                </>
              )}
              {p.published && !p.removedAt && (
                <Link className="text-link" href={"/blogue/" + p.slug}>
                  Voir l’article
                </Link>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
type Stay = {
  id: string;
  startDate: string;
  endDate: string;
  guests: number;
  status: string;
  userId: string;
  ownerName: string;
};
const labels: Record<string, string> = {
  pending_approval: "En attente",
  confirmed: "Approuvée",
  cancelled: "Annulée",
  rejected: "Refusée",
  draft: "Brouillon",
  expired: "Expirée",
  pending_payment: "En attente de paiement",
};
function AdminStay({ s, name }: { s: Stay; name?: string }) {
  const op = useAction();
  return (
    <details className="panel">
      <summary>
        <span>
          <strong>{stayDates(s.startDate, s.endDate)}</strong>
          <small>
            {name} · {s.guests} voyageur{s.guests > 1 ? "s" : ""}
          </small>
        </span>
        <span className={"badge status-" + s.status}>{labels[s.status]}</span>
      </summary>
      {s.status !== "cancelled" && (
        <form
          className="account-form mt-4"
          onSubmit={(e) => {
            const f = values(e);
            void op.run(() =>
              write("/admin/reservations/" + s.id, "PATCH", {
                ...f,
                guests: Number(f.guests),
              }),
            );
          }}
        >
          <div className="account-grid">
            <label>
              Arrivée
              <input
                required
                name="startDate"
                type="date"
                defaultValue={dayKey(s.startDate)}
              />
            </label>
            <label>
              Départ
              <input
                required
                name="endDate"
                type="date"
                defaultValue={dayKey(s.endDate)}
              />
            </label>
          </div>
          <label>
            Voyageurs
            <input
              type="number"
              min={1}
              required
              name="guests"
              defaultValue={s.guests}
            />
          </label>
          <div className="button-row">
            <button className="action" disabled={op.busy}>
              Modifier le séjour
            </button>
          </div>
        </form>
      )}
      <AdminCancelStay stay={s} name={name} />
      {op.feedback}
    </details>
  );
}
export function StaysPanel() {
  const q = useQuery({
    queryKey: ["admin-stays"],
    queryFn: () => ownerRequest<Stay[]>("/admin/reservations"),
  });
  return (
    <>
      <h2 className="section-title">Toutes les réservations</h2>
      <p className="section-note">
        Modifiez un séjour ou annulez une réservation pour libérer les dates et
        prévenir la personne qui a réservé. Pour approuver ou refuser une
        demande, ouvrez Approbations.
      </p>
      {q.isPending ? (
        "Chargement…"
      ) : q.isError ? (
        "Séjours indisponibles."
      ) : q.data.length ? (
        q.data.map((s) => <AdminStay key={s.id} s={s} name={s.ownerName} />)
      ) : (
        <p className="panel">Aucun séjour.</p>
      )}
    </>
  );
}
