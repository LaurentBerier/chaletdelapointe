import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerRequest, useAuth } from "@/context/AuthContext";
import { managesStays } from "../../../../lib/shared/reservation-roles";
type Comment = {
  id: string;
  parent_id: string | null;
  author_id: string;
  author: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  removed_at: string | null;
  replies?: Comment[];
};
const date = (s: string) =>
  new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(s));
export function BlogComments({ slug }: { slug: string }) {
  const { user } = useAuth(),
    cache = useQueryClient();
  const [page, setPage] = useState(0);
  const approved = user?.accountStatus === "approved";
  const q = useQuery({
    queryKey: ["blog-comments", slug, page, user?.id, managesStays(user)],
    enabled: approved,
    queryFn: () =>
      ownerRequest<{ locked: boolean; comments: Comment[]; hasMore: boolean }>(
        `/account/blog/${slug}/comments?offset=${page * 30}`,
      ),
    refetchInterval: 30000,
  });
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ["blog-comments", slug] });
  return (
    <section
      className="community mt-14 scroll-mt-28 border-t border-border pt-8"
      id="commentaires"
    >
      <h2 className="text-2xl font-serif mb-3">Autour de cette chronique</h2>
      <p className="community-muted">
        Les commentaires sont partagés entre les utilisateurs approuvés du
        chalet.
      </p>
      {!approved ? (
        <p className="panel mt-4">
          {user ? (
            "Votre compte doit être approuvé pour participer."
          ) : (
            <Link
              className="text-link"
              href={
                "/connexion?suite=blogue&article=" + encodeURIComponent(slug)
              }
            >
              Connectez-vous pour lire les commentaires et participer.
            </Link>
          )}
        </p>
      ) : (
        <>
          {q.error && (
            <p role="alert" className="community-error">
              {q.error.message}
            </p>
          )}
          {q.isPending ? (
            <p>Chargement des commentaires…</p>
          ) : (
            q.data && (
              <>
                {q.data.locked ? (
                  <p className="community-callout">
                    Les commentaires sont fermés pour cet article.
                  </p>
                ) : (
                  <CommentForm slug={slug} onSaved={refresh} />
                )}
                {q.data.comments.length === 0 && (
                  <p className="community-empty">
                    Aucun commentaire pour le moment.
                  </p>
                )}
                {q.data.comments.map((c) => (
                  <CommentCard
                    key={c.id}
                    comment={c}
                    slug={slug}
                    locked={q.data.locked}
                    refresh={refresh}
                  />
                ))}
                {(page > 0 || q.data.hasMore) && (
                  <div className="community-toolbar">
                    <button disabled={!page} onClick={() => setPage(page - 1)}>
                      Précédents
                    </button>
                    <span>Page {page + 1}</span>
                    <button
                      disabled={!q.data.hasMore}
                      onClick={() => setPage(page + 1)}
                    >
                      Suivants
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
function CommentForm({
  slug,
  parent,
  onSaved,
}: {
  slug: string;
  parent?: string;
  onSaved: () => unknown;
}) {
  const [body, setBody] = useState("");
  const op = useMutation({
    mutationFn: () =>
      ownerRequest("/account/blog/" + slug + "/comments", {
        method: "POST",
        body: JSON.stringify({ body, parentId: parent }),
      }),
    onSuccess: () => {
      setBody("");
      onSaved();
    },
  });
  return (
    <form
      className="panel community-form"
      onSubmit={(e) => {
        e.preventDefault();
        op.mutate();
      }}
    >
      <label>
        {parent ? "Votre réponse" : "Votre commentaire"}
        <textarea
          rows={3}
          required
          maxLength={6000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      {op.error && (
        <p role="alert" className="community-error">
          {op.error.message}
        </p>
      )}
      <button className="community-button" disabled={op.isPending}>
        {op.isPending
          ? "Publication…"
          : parent
            ? "Publier la réponse"
            : "Publier le commentaire"}
      </button>
    </form>
  );
}
function CommentCard({
  comment: c,
  slug,
  locked,
  refresh,
  reply = false,
}: {
  comment: Comment;
  slug: string;
  locked: boolean;
  refresh: () => unknown;
  reply?: boolean;
}) {
  const { user } = useAuth();
  const manager = managesStays(user),
    own = c.author_id === user?.id;
  const [respond, setRespond] = useState(false),
    [editing, setEditing] = useState(false),
    [body, setBody] = useState(c.body),
    [stamp, setStamp] = useState(c.updated_at);
  const op = useMutation({
    mutationFn: (payload: unknown) =>
      ownerRequest("/account/blog/comments/" + c.id, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
  });
  return (
    <article
      className={"community-message " + (reply ? "reply" : "")}
      id={"commentaire-" + c.id}
    >
      <header>
        <div className="community-author">
          <strong>{c.author}</strong>
          <small>
            {date(c.created_at)}
            {c.updated_at ? " · Modifié" : ""}
          </small>
        </div>
        {c.removed_at && <span className="community-status">Retiré</span>}
      </header>
      {c.removed_at && !manager ? (
        <p className="community-muted">
          Commentaire retiré. Les réponses sont conservées.
        </p>
      ) : editing ? (
        <form
          className="community-form"
          onSubmit={(e) => {
            e.preventDefault();
            op.mutate({ body, updatedAt: stamp });
          }}
        >
          <label>
            Votre commentaire
            <textarea
              required
              maxLength={6000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button disabled={op.isPending}>Enregistrer</button>
            <button type="button" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <p className="my-4 whitespace-pre-wrap break-words leading-relaxed">
          {c.body}
        </p>
      )}
      {op.error && (
        <p role="alert" className="community-error">
          {op.error.message}
        </p>
      )}
      <div className="community-message-actions">
        {!reply && !locked && (
          <button onClick={() => setRespond(!respond)}>Répondre</button>
        )}
        {own && !c.removed_at && !locked && (
          <button
            onClick={() => {
              setBody(c.body);
              setStamp(c.updated_at);
              setEditing(true);
            }}
          >
            Modifier
          </button>
        )}
        {(own || manager) && !c.removed_at && (
          <button
            disabled={op.isPending}
            onClick={() => {
              if (
                confirm(
                  "Retirer ce commentaire ? Les réponses seront conservées.",
                )
              )
                op.mutate({ action: "remove" });
            }}
          >
            Retirer
          </button>
        )}
        {manager && c.removed_at && (
          <button
            disabled={op.isPending}
            onClick={() => op.mutate({ action: "restore" })}
          >
            Rétablir le commentaire
          </button>
        )}
      </div>
      {!reply && (
        <div className="community-replies">
          {c.replies?.map((r) => (
            <CommentCard
              key={r.id}
              comment={r}
              slug={slug}
              locked={locked}
              refresh={refresh}
              reply
            />
          ))}
          {respond && !locked && (
            <CommentForm
              slug={slug}
              parent={c.id}
              onSaved={() => {
                setRespond(false);
                refresh();
              }}
            />
          )}
        </div>
      )}
    </article>
  );
}
