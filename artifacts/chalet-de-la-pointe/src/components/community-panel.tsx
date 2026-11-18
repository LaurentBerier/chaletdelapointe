import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  MessageCircle,
  Bell,
  ArrowLeft,
  Plus,
  Pencil,
  History,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { ownerRequest, useAuth } from "@/context/AuthContext";
import {
  canManageDocuments,
  canReadDocuments,
  documentStatus,
  messageStatus,
  type CommunityDocument,
  type CommunitySection,
  type CommunityMessage,
} from "../../../../lib/shared/community";

const base = "/tableau-de-bord?onglet=vie";
const docHref = (slug: string) =>
  base + "&document=" + encodeURIComponent(slug);
const date = (s: string) =>
  new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(new Date(s));
const api = <T,>(p: string, body?: unknown, method = "POST") =>
  ownerRequest<T>(
    "/community" + p,
    body === undefined ? undefined : { method, body: JSON.stringify(body) },
  );
function useAction() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      method,
    }: {
      path: string;
      body: unknown;
      method?: string;
    }) => api<any>(path, body, method),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["community"] }),
  });
}
function ErrorNote({ error }: { error: Error | null }) {
  return error ? (
    <p className="community-error" role="alert">
      {error.message}
    </p>
  ) : null;
}
function Text({ children }: { children: string }) {
  return (
    <div className="community-prose">
      {children.split(/\n\n+/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function CommunityPanel() {
  const { user } = useAuth();
  const search = useSearch(),
    [, navigate] = useLocation();
  const params = new URLSearchParams(search),
    slug = params.get("document"),
    tab = params.get("vue") || "reglements";
  const canRead = !!canReadDocuments(user);
  const notes = useQuery({
    queryKey: ["community", "notifications"],
    queryFn: () => api<any[]>("/notifications"),
    refetchInterval: 30000,
  });
  const action = useAction();
  const unread = notes.data?.filter((n) => !n.read_at).length || 0;
  return (
    <div className="community">
      <header className="community-heading">
        <p className="eyebrow">Notre chalet, nos échanges</p>
        <h2 className="section-title">Vie du chalet</h2>
        <p>Les documents communs et un endroit pour en parler ensemble.</p>
      </header>
      <nav className="community-tabs" aria-label="Vie du chalet">
        {canRead && (
          <Link
            href={base}
            aria-current={tab === "reglements" ? "page" : undefined}
          >
            <BookOpen size={17} />
            Règlements
          </Link>
        )}
        <Link
          href={base + "&vue=discussions"}
          aria-current={
            tab === "discussions" || (!canRead && tab === "reglements")
              ? "page"
              : undefined
          }
        >
          <MessageCircle size={17} />
          Discussions
        </Link>
        <Link
          href={base + "&vue=notifications"}
          aria-current={tab === "notifications" ? "page" : undefined}
        >
          <Bell size={17} />
          Notifications
          {unread > 0 && <span className="community-count">{unread}</span>}
        </Link>
      </nav>
      {tab === "notifications" ? (
        <section className="panel">
          <div className="community-toolbar">
            <h3>Vos notifications</h3>
            {unread > 0 && (
              <button
                disabled={action.isPending}
                onClick={() =>
                  action.mutate({ path: "/notifications", body: {} })
                }
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <ErrorNote error={notes.error || action.error} />
          {notes.isPending ? (
            <p>Chargement…</p>
          ) : notes.data?.length ? (
            <ul className="community-notifications">
              {notes.data.map((n) => (
                <li key={n.id} className={!n.read_at ? "unread" : ""}>
                  <button
                    onClick={async () => {
                      await action
                        .mutateAsync({
                          path: "/notifications",
                          body: { id: n.id },
                        })
                        .catch(() => {});
                      navigate(
                        (n.document_slug
                          ? docHref(n.document_slug)
                          : base + "&vue=discussions") +
                          "&discussion=" +
                          n.thread_id,
                      );
                    }}
                  >
                    <strong>{n.author}</strong> a répondu à « {n.title} ».
                    <small>{date(n.created_at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="community-muted">
              Les réponses aux discussions que vous suivez apparaîtront ici.
            </p>
          )}
        </section>
      ) : tab === "discussions" || (!canRead && !slug) ? (
        <GeneralDiscussions />
      ) : slug && !canRead ? (
        <p className="community-error" role="alert">
          Cet espace est réservé aux copropriétaires et aux administrateurs.
        </p>
      ) : slug ? (
        <DocumentView key={slug} slug={slug} />
      ) : (
        <DocumentLibrary />
      )}
    </div>
  );
}
function DocumentLibrary() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [, navigate] = useLocation();
  const docs = useQuery({
    queryKey: ["community", "documents"],
    queryFn: () => api<CommunityDocument[]>("/documents"),
  });
  return (
    <>
      <div className="community-toolbar">
        <p className="community-muted">
          Réservé aux copropriétaires et aux admins.
        </p>
        {canManageDocuments(user) && (
          <button
            className="community-button"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            Ajouter un règlement
          </button>
        )}
      </div>
      {creating && (
        <DocumentEditor
          onCancel={() => setCreating(false)}
          onSaved={(d) => {
            setCreating(false);
            navigate(docHref(d.slug));
          }}
        />
      )}
      <ErrorNote error={docs.error} />
      {docs.isPending && <p>Chargement des règlements…</p>}
      <div className="community-library">
        {docs.data?.map((d) => (
          <Link
            href={docHref(d.slug)}
            key={d.id}
            className="community-document-card"
          >
            <div className="community-toolbar">
              <BookOpen size={24} />
              <span className={"community-status " + d.status}>
                {documentStatus[d.status]}
              </span>
            </div>
            <h3>{d.title}</h3>
            <p>{d.introduction}</p>
            <div className="community-meta">
              <span>Version {d.version}</span>
              <span>
                {d.comment_count || 0} commentaire
                {d.comment_count === 1 ? "" : "s"}
              </span>
            </div>
            <span className="community-read">Lire et contribuer →</span>
          </Link>
        ))}
      </div>
      {docs.data?.length === 0 && (
        <p className="panel">Les règlements du chalet seront réunis ici.</p>
      )}
    </>
  );
}
type DocumentDetail = CommunityDocument & {
  versions: { version: number; created_at: string; editor: string | null }[];
};
function DocumentView({ slug }: { slug: string }) {
  const { user } = useAuth();
  const data = useQuery({
    queryKey: ["community", "document", slug],
    queryFn: () => api<DocumentDetail>("/documents/" + slug),
  });
  const [editing, setEditing] = useState(false),
    [history, setHistory] = useState(false),
    [section, setSection] = useState(""),
    [kind, setKind] = useState("comment"),
    [copied, setCopied] = useState("");
  const d = data.data;
  const anchor = new URLSearchParams(useSearch()).get("section");
  useEffect(() => {
    if (d && anchor)
      document
        .getElementById("section-" + anchor)
        ?.scrollIntoView({ block: "start" });
  }, [d?.id, anchor]);
  function contribute(id: string, suggestion = false) {
    setSection(id);
    setKind(suggestion ? "suggestion" : "comment");
    requestAnimationFrame(() =>
      document
        .getElementById("community-composer")
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }
  if (!d)
    return (
      <>
        <Link href={base} className="text-link">
          ← Tous les règlements
        </Link>
        <ErrorNote error={data.error} />
        {data.isPending && <p>Chargement du document…</p>}
      </>
    );
  return (
    <>
      <div className="community-toolbar">
        <Link href={base} className="text-link">
          <ArrowLeft size={16} /> Tous les règlements
        </Link>
        <div className="button-row">
          <button onClick={() => setHistory(!history)}>
            <History size={16} />
            Versions
          </button>
          {canManageDocuments(user) && (
            <button onClick={() => setEditing(!editing)}>
              <Pencil size={16} />
              {editing ? "Fermer l’éditeur" : "Modifier le document"}
            </button>
          )}
        </div>
      </div>
      {editing && (
        <DocumentEditor
          document={d}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      {history && <VersionHistory document={d} />}
      <article className="community-paper">
        <header>
          <span className={"community-status " + d.status}>
            {documentStatus[d.status]}
          </span>
          <h3>{d.title}</h3>
          <p className="community-meta">
            Version {d.version} · Mise à jour le {date(d.updated_at)}
          </p>
          <Text>{d.introduction}</Text>
        </header>
        {d.status === "discussion" && (
          <aside className="community-callout">
            <strong>Construisons ces règles ensemble.</strong>
            <p>
              Cette proposition n’est pas encore adoptée. Vos notes et
              suggestions sont partagées avec les copropriétaires et les admins.
              Seuls les admins peuvent modifier le texte.
            </p>
          </aside>
        )}
        <nav className="community-contents" aria-label="Sections du règlement">
          {d.sections.map((s, i) => (
            <a
              key={s.id}
              href={docHref(slug) + "&section=" + s.id + "#section-" + s.id}
            >
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>
        {d.sections.map((s, i) => (
          <section
            id={"section-" + s.id}
            key={s.id}
            className="community-section"
          >
            <div className="community-section-title">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h4>{s.title}</h4>
            </div>
            <Text>{s.body}</Text>
            <div className="community-section-actions">
              {d.status !== "archived" && (
                <>
                  <button onClick={() => contribute(s.id)}>
                    <MessageCircle size={15} />
                    Commenter
                  </button>
                  <button onClick={() => contribute(s.id, true)}>
                    <Pencil size={15} />
                    Suggérer un changement
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      location.origin +
                        docHref(slug) +
                        "&section=" +
                        s.id +
                        "#section-" +
                        s.id,
                    )
                    .then(() => setCopied(s.id));
                }}
              >
                <LinkIcon size={15} />
                {copied === s.id ? "Lien copié" : "Lien de la section"}
              </button>
            </div>
          </section>
        ))}
      </article>
      <section className="community-contributions">
        <h3 className="section-title">Notes et suggestions</h3>
        <p className="community-muted">
          Une question, une précision ou un autre texte à proposer ? La
          discussion reste liée à la version que vous avez lue.
        </p>
        {d.status !== "archived" && (
          <Composer
            key={section + kind}
            document={d}
            section={section}
            kind={kind}
            onSection={setSection}
            onKind={setKind}
          />
        )}
        <Threads document={d} />
      </section>
    </>
  );
}
function DocumentEditor({
  document: d,
  onCancel,
  onSaved,
}: {
  document?: CommunityDocument;
  onCancel: () => void;
  onSaved: (d: CommunityDocument) => void;
}) {
  const [title, setTitle] = useState(d?.title || ""),
    [introduction, setIntro] = useState(d?.introduction || ""),
    [status, setStatus] = useState(d?.status || "discussion");
  const [baseVersion] = useState(d?.version);
  const [sections, setSections] = useState<CommunitySection[]>(
    d?.sections || [{ id: crypto.randomUUID(), title: "", body: "" }],
  );
  const action = useAction();
  const change = (i: number, field: string, value: string) =>
    setSections((prev) =>
      prev.map((s, j) => (j === i ? { ...s, [field]: value } : s)),
    );
  return (
    <form
      className="panel community-form community-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const saved = await action.mutateAsync({
            path: d ? "/documents/" + d.slug : "/documents",
            method: d ? "PATCH" : "POST",
            body: {
              title,
              introduction,
              status,
              sections,
              version: baseVersion,
            },
          });
          onSaved(saved);
        } catch {}
      }}
    >
      <h3>{d ? "Modifier le règlement" : "Nouveau règlement"}</h3>
      <p>
        Chaque enregistrement conserve une nouvelle version. L’historique et les
        échanges restent accessibles.
      </p>
      <label>
        Titre
        <input
          required
          maxLength={180}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Introduction
        <textarea
          rows={4}
          maxLength={4000}
          value={introduction}
          onChange={(e) => setIntro(e.target.value)}
        />
      </label>
      <label>
        Statut
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="discussion">En discussion</option>
          <option value="adopted">Adopté par le groupe</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      {sections.map((s, i) => (
        <fieldset key={s.id}>
          <legend>Section {i + 1}</legend>
          <label>
            Titre de la section
            <input
              required
              maxLength={180}
              value={s.title}
              onChange={(e) => change(i, "title", e.target.value)}
            />
          </label>
          <label>
            Texte
            <textarea
              required
              rows={8}
              maxLength={12000}
              value={s.body}
              onChange={(e) => change(i, "body", e.target.value)}
            />
          </label>
          {sections.length > 1 && (
            <button
              type="button"
              onClick={() => setSections(sections.filter((_, j) => j !== i))}
            >
              Retirer cette section
            </button>
          )}
        </fieldset>
      ))}
      {sections.length < 40 && (
        <button
          type="button"
          onClick={() =>
            setSections([
              ...sections,
              { id: crypto.randomUUID(), title: "", body: "" },
            ])
          }
        >
          <Plus size={16} />
          Ajouter une section
        </button>
      )}
      <ErrorNote error={action.error} />
      <div className="button-row">
        <button className="community-button" disabled={action.isPending}>
          {action.isPending ? "Enregistrement…" : "Enregistrer le document"}
        </button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
function VersionHistory({ document: d }: { document: DocumentDetail }) {
  const [selected, setSelected] = useState<number | null>(null);
  const data = useQuery({
    queryKey: ["community", "version", d.slug, selected],
    enabled: !!selected,
    queryFn: () =>
      api<CommunityDocument>(`/documents/${d.slug}/versions/${selected}`),
  });
  return (
    <section className="panel community-history">
      <h3>Historique du document</h3>
      <div className="button-row">
        {d.versions.map((v) => (
          <button
            key={v.version}
            onClick={() => setSelected(v.version)}
            aria-pressed={selected === v.version}
          >
            Version {v.version}
            <small>
              {date(v.created_at)} · {v.editor || "Publication initiale"}
            </small>
          </button>
        ))}
      </div>
      <ErrorNote error={data.error} />
      {data.data && (
        <div>
          <h4>
            {data.data.title} · Version {selected}
          </h4>
          <Text>{data.data.introduction}</Text>
          {data.data.sections.map((s) => (
            <section key={s.id}>
              <h4>{s.title}</h4>
              <Text>{s.body}</Text>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
function Composer({
  document: d,
  section = "",
  kind = "comment",
  onSection,
  onKind,
  parent,
  onDone,
}: {
  document?: CommunityDocument;
  section?: string;
  kind?: string;
  onSection?: (s: string) => void;
  onKind?: (s: string) => void;
  parent?: CommunityMessage;
  onDone?: () => void;
}) {
  const [body, setBody] = useState(""),
    [title, setTitle] = useState(""),
    [proposed, setProposed] = useState(
      d?.sections.find((s) => s.id === section)?.body || "",
    );
  const [sent, setSent] = useState(false);
  const action = useAction();
  return (
    <form
      id={!parent ? "community-composer" : undefined}
      className="panel community-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setSent(false);
        try {
          await action.mutateAsync({
            path: "/messages",
            body: {
              documentId: d?.id,
              version: d?.version,
              parentId: parent?.id,
              sectionKey: section || undefined,
              kind,
              body,
              title,
              proposedText: proposed,
            },
          });
          setBody("");
          setTitle("");
          setSent(true);
          onDone?.();
        } catch {}
      }}
    >
      {!d && !parent && (
        <label>
          Titre de la discussion
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {d && !parent && (
        <>
          <div className="community-form-row">
            <label>
              À propos de
              <select
                value={section}
                onChange={(e) => onSection?.(e.target.value)}
              >
                <option value="">L’ensemble du document</option>
                {d.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Votre contribution
              <select value={kind} onChange={(e) => onKind?.(e.target.value)}>
                <option value="comment">Commentaire</option>
                <option value="suggestion" disabled={!section}>
                  Proposition de texte
                </option>
              </select>
            </label>
          </div>
          {kind === "suggestion" && (
            <label>
              Texte proposé pour remplacer cette section
              <textarea
                required
                rows={9}
                maxLength={12000}
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
              />
            </label>
          )}
        </>
      )}
      <label>
        {parent
          ? "Votre réponse"
          : kind === "suggestion"
            ? "Pourquoi proposer ce changement ?"
            : "Votre message"}
        <textarea
          required
          rows={3}
          maxLength={6000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <p className="community-muted">
        {d || parent?.document_id
          ? "Visible par les copropriétaires et les admins."
          : "Visible par les utilisateurs approuvés du site."}
      </p>
      <ErrorNote error={action.error} />
      {sent && <p role="status">Votre contribution a été publiée.</p>}
      <button className="community-button" disabled={action.isPending}>
        {action.isPending
          ? "Publication…"
          : parent
            ? "Publier la réponse"
            : kind === "suggestion"
              ? "Soumettre la suggestion"
              : "Publier le message"}
      </button>
    </form>
  );
}
function GeneralDiscussions() {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="community-toolbar">
        <div>
          <h3>Discussions du chalet</h3>
          <p className="community-muted">
            Un espace partagé entre les utilisateurs approuvés.
          </p>
        </div>
        <button
          className="community-button"
          onClick={() => setCreating(!creating)}
        >
          <Plus size={16} />
          Nouveau sujet
        </button>
      </div>
      {creating && <Composer onDone={() => setCreating(false)} />}
      <Threads />
    </>
  );
}
function Threads({ document: d }: { document?: CommunityDocument }) {
  const [page, setPage] = useState(0);
  const selected = new URLSearchParams(useSearch()).get("discussion");
  const data = useQuery({
    queryKey: ["community", "threads", d?.id || "general", page, selected],
    queryFn: () =>
      api<{ threads: CommunityMessage[]; hasMore: boolean }>(
        "/threads?offset=" +
          page * 30 +
          (d ? "&document=" + d.id : "") +
          (selected ? "&thread=" + selected : ""),
      ),
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (selected && data.data)
      document
        .getElementById("message-" + selected)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selected, data.data?.threads.map((t) => t.id).join()]);
  return (
    <div className="community-threads">
      {selected && (
        <Link
          className="text-link"
          href={d ? docHref(d.slug) : base + "&vue=discussions"}
        >
          ← Tous les échanges
        </Link>
      )}
      <ErrorNote error={data.error} />
      {data.isPending && <p>Chargement des échanges…</p>}
      {data.data?.threads.length === 0 && (
        <div className="community-empty">
          <MessageCircle size={26} />
          <p>Aucun échange pour le moment. Ouvrez la discussion.</p>
        </div>
      )}
      {data.data?.threads.map((m) => (
        <Message key={m.id} message={m} document={d} />
      ))}
      {(page > 0 || data.data?.hasMore) && (
        <div className="community-toolbar">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Échanges précédents
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={!data.data?.hasMore}
            onClick={() => setPage(page + 1)}
          >
            Échanges suivants
          </button>
        </div>
      )}
    </div>
  );
}
function Message({
  message: m,
  document: d,
  reply = false,
}: {
  message: CommunityMessage;
  document?: CommunityDocument;
  reply?: boolean;
}) {
  const { user } = useAuth();
  const manager = canManageDocuments(user);
  const [respond, setRespond] = useState(false),
    [edit, setEdit] = useState(false),
    [body, setBody] = useState(m.body),
    [proposed, setProposed] = useState(m.proposed_text || "");
  const action = useAction();
  const [editTimestamp, setEditTimestamp] = useState(m.updated_at);
  const run = async (path: string, body: unknown, method?: string) => {
    try {
      await action.mutateAsync({
        path: "/messages/" + m.id + path,
        body,
        method,
      });
    } catch {}
  };
  return (
    <article
      id={"message-" + m.id}
      className={"community-message " + (reply ? "reply" : "")}
    >
      <header>
        <div className="community-author">
          <span className="community-avatar">
            {m.author.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{m.author}</strong>
            <small>
              {date(m.created_at)}
              {m.updated_at ? " · Modifié" : ""}
            </small>
          </div>
        </div>
        {!reply && (
          <span className="community-status">{messageStatus[m.status]}</span>
        )}
      </header>
      {m.topic_title && <h4>{m.topic_title}</h4>}
      {m.section_snapshot && (
        <details className="community-context">
          <summary>
            {m.kind === "suggestion" ? "Suggestion" : "Commentaire"} ·{" "}
            {m.section_snapshot.title} · Version {m.document_version}
          </summary>
          <Text>{m.section_snapshot.body}</Text>
        </details>
      )}
      {m.deleted_at ? (
        <p className="community-muted">
          Message supprimé. Les réponses sont conservées.
        </p>
      ) : edit ? (
        <form
          className="community-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await action.mutateAsync({
                path: "/messages/" + m.id,
                method: "PATCH",
                body: {
                  body,
                  proposedText: proposed,
                  updatedAt: editTimestamp,
                },
              });
              setEdit(false);
            } catch {}
          }}
        >
          <label>
            Message
            <textarea
              required
              maxLength={6000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {m.kind === "suggestion" && (
            <label>
              Texte proposé
              <textarea
                required
                rows={7}
                maxLength={12000}
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
              />
            </label>
          )}
          <div className="button-row">
            <button disabled={action.isPending}>Enregistrer</button>
            <button type="button" onClick={() => setEdit(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          <Text>{m.body}</Text>
          {m.proposed_text && (
            <div className="community-proposal">
              <p className="eyebrow">Texte proposé</p>
              <Text>{m.proposed_text}</Text>
            </div>
          )}
        </>
      )}
      {m.applied_version && (
        <p className="community-muted">
          <Check size={15} />
          Intégré à la version {m.applied_version} du document.
        </p>
      )}
      <ErrorNote error={action.error} />
      <div className="community-message-actions">
        {!reply && (
          <>
            <button
              onClick={() => setRespond(!respond)}
              disabled={d?.status === "archived"}
            >
              Répondre{m.replies?.length ? " (" + m.replies.length + ")" : ""}
            </button>
            <button
              disabled={action.isPending}
              onClick={() => run("/follow", { following: !m.following })}
            >
              {m.following ? "Ne plus suivre" : "Suivre"}
            </button>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(
                  location.origin +
                    (d ? docHref(d.slug) : base + "&vue=discussions") +
                    "&discussion=" +
                    m.id +
                    "#message-" +
                    m.id,
                );
              }}
            >
              Copier le lien
            </button>
          </>
        )}
        {!m.deleted_at &&
          m.status !== "applied" &&
          m.author_id === user?.id && (
            <button
              onClick={() => {
                setEditTimestamp(m.updated_at);
                setBody(m.body);
                setProposed(m.proposed_text || "");
                setEdit(!edit);
              }}
            >
              Modifier
            </button>
          )}
        {!m.deleted_at &&
          m.status !== "applied" &&
          (manager || m.author_id === user?.id) && (
            <button
              disabled={action.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Supprimer ce message ? Les réponses seront conservées.",
                  )
                )
                  void run("", {}, "DELETE");
              }}
            >
              Supprimer
            </button>
          )}
        {manager && !reply && !m.deleted_at && m.status !== "applied" && (
          <>
            <button
              disabled={action.isPending}
              onClick={() =>
                run("/status", {
                  status: m.status === "open" ? "resolved" : "open",
                })
              }
            >
              {m.status === "open" ? "Marquer résolu" : "Rouvrir"}
            </button>
            {m.kind === "suggestion" && m.status === "open" && d && (
              <>
                <button
                  className="community-apply"
                  disabled={action.isPending || d.status === "archived"}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Intégrer ce texte à la section du règlement ? Une nouvelle version sera conservée.",
                      )
                    )
                      void run("/apply", { version: d.version });
                  }}
                >
                  Intégrer au règlement
                </button>
                <button
                  disabled={action.isPending}
                  onClick={() => run("/status", { status: "declined" })}
                >
                  Ne pas retenir
                </button>
              </>
            )}
          </>
        )}
      </div>
      {!reply && (
        <div className="community-replies">
          {m.replies?.map((r) => (
            <Message key={r.id} message={r} document={d} reply />
          ))}
          {respond && (
            <Composer
              document={d}
              parent={m}
              onDone={() => setRespond(false)}
            />
          )}
        </div>
      )}
    </article>
  );
}
