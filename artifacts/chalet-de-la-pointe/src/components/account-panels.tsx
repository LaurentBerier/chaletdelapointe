import { BookingAccessPanel } from "./booking-access";
import type { BookingAccess } from "../../../../lib/db/src/booking-access";
import { IllustratedNote } from "./field-heading";
import { useState, type FormEvent } from "react";
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
  group: string;
  canApprove: boolean;
  isDisabled: boolean;
  isAdmin: boolean;
  bookingAccess: BookingAccess;
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
    a.group === "proprietaire" ||
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
              : groups[a.group]}
        </span>
      </summary>
      {a.bookingAccess !== "pending" && <AccessDecision account={a} />}
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
                isDisabled: f.disabled === "on",
              }),
            );
          }}
        >
          <label>
            Nom affiché
            <input name="name" defaultValue={a.name} maxLength={80} required />
          </label>
          <label>
            Accès
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {Object.entries(groups).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
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
export function AccountsPanel() {
  const q = useQuery({
    queryKey: ["admin-accounts"],
    refetchInterval: 30000,
    queryFn: () => ownerRequest<Account[]>("/admin/accounts"),
  });
  return (
    <>
      <h2 className="section-title">Comptes et accès</h2>
      <p className="section-note">
        Les nouveaux membres apparaissent après confirmation de leur courriel.
        Le droit de réserver peut être accordé sans attribuer le rôle de
        propriétaire.
      </p>
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
              a.group !== "proprietaire",
          ) ? (
            q.data
              .filter(
                (a) =>
                  a.bookingAccess === "pending" &&
                  !a.isDisabled &&
                  a.group !== "proprietaire",
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
          : q.data.map((a) => <AccountRow key={a.id} a={a} />)}
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
  return (
    <form
      className="panel account-form"
      onSubmit={(e) => {
        const f = values(e);
        void op.run(async () => {
          await write(
            post ? "/account/articles/" + post.id : "/account/articles",
            post ? "PATCH" : "POST",
            { ...f, published: f.published === "on" },
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
      <label>
        Texte
        <textarea
          rows={9}
          name="content"
          defaultValue={post?.content}
          maxLength={30000}
          required
        />
      </label>
      {user?.isAdmin && (
        <label className="check">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post?.published}
          />{" "}
          Publier sur le blogue
        </label>
      )}
      <div className="button-row">
        <button className="action" disabled={op.busy}>
          Enregistrer
        </button>
        <button className="secondary-action" type="button" onClick={close}>
          Fermer
        </button>
        {user?.isAdmin && post && (
          <button
            className="text-link"
            type="button"
            onClick={() => setRemove(!remove)}
          >
            Supprimer…
          </button>
        )}
      </div>
      {remove && (
        <div className="feedback">
          <p>Supprimer définitivement cet article ?</p>
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
            Confirmer la suppression
          </button>
        </div>
      )}
      {op.feedback}
    </form>
  );
}
export function BlogPanel() {
  const { user } = useAuth(),
    q = useQuery({
      queryKey: ["account-articles", user?.id],
      queryFn: () => ownerRequest<BlogPost[]>("/account/articles"),
    }),
    [edit, setEdit] = useState<BlogPost | "new" | null>(null);
  return (
    <>
      <div className="panel-heading">
        <h2 className="section-title">
          {user?.isAdmin ? "Gestion du blogue" : "Mes chroniques"}
        </h2>
        <button className="action" onClick={() => setEdit("new")}>
          Écrire une chronique
        </button>
      </div>
      <p className="section-note">
        Les brouillons restent privés jusqu’à leur publication par
        l’administration.
      </p>
      {edit && (
        <Editor
          key={edit === "new" ? "new" : edit.id}
          post={edit === "new" ? undefined : edit}
          close={() => setEdit(null)}
        />
      )}
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
              {p.published ? "Publié" : "Brouillon"}
            </span>
            <h3 className="mt-2">{p.title}</h3>
            <p>{p.author || "Équipe ChaletDeLaPointe"}</p>
            <div className="button-row mt-3">
              {(user?.isAdmin || !p.published) && (
                <button className="text-link" onClick={() => setEdit(p)}>
                  Modifier
                </button>
              )}
              {p.published && (
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
  const op = useAction(),
    [cancel, setCancel] = useState(false);
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
          {s.status !== "cancelled" && (
            <button
              type="button"
              className="text-link"
              onClick={() => setCancel(!cancel)}
            >
              Annuler le séjour…
            </button>
          )}
        </div>
      </form>
      {cancel && (
        <div className="feedback">
          <p>Libérer ces dates en annulant le séjour ?</p>
          <button
            className="text-link"
            disabled={op.busy}
            onClick={() =>
              op.run(async () => {
                await write(
                  "/admin/reservations/" + s.id + "/cancel",
                  "POST",
                  {},
                );
                setCancel(false);
              }, "Séjour annulé.")
            }
          >
            Confirmer l’annulation
          </button>
        </div>
      )}
      {op.feedback}
    </details>
  );
}
export function StaysPanel() {
  const q = useQuery({
      queryKey: ["admin-stays"],
      queryFn: () => ownerRequest<Stay[]>("/admin/reservations"),
    }),
    a = useQuery({
      queryKey: ["admin-accounts"],
      queryFn: () => ownerRequest<Account[]>("/admin/accounts"),
    });
  return (
    <>
      <h2 className="section-title">Toutes les réservations</h2>
      <p className="section-note">
        Modifiez les dates ou le nombre de voyageurs. Pour approuver ou refuser
        une demande, ouvrez Approbations.
      </p>
      {q.isPending ? (
        "Chargement…"
      ) : q.isError ? (
        "Séjours indisponibles."
      ) : q.data.length ? (
        q.data.map((s) => (
          <AdminStay
            key={s.id}
            s={s}
            name={a.data?.find((u) => u.id === s.userId)?.name}
          />
        ))
      ) : (
        <p className="panel">Aucun séjour.</p>
      )}
    </>
  );
}
