import { relationshipLabel } from "../../../../lib/shared/membership";
import { useEffect } from "react";
import { rememberReview, reviewId } from "@/lib/access-review";
import { useLocation, useSearch, Link } from "wouter";
import {
  CalendarDays,
  BookOpen,
  LogOut,
  ShieldCheck,
  KeyRound,
  UserRound,
  UsersRound,
  House,
  CalendarRange,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ownerRequest, useAuth } from "@/context/AuthContext";
import { BookingList } from "@/components/booking-list";
import {
  ProfilePanel,
  SecurityPanel,
  AccountsPanel,
  StaysPanel,
  BlogPanel,
  ChaletPanel,
} from "@/components/account-panels";

export default function TableauDeBord() {
  const { user, logout } = useAuth(),
    [, navigate] = useLocation(),
    search = useSearch();
  const requestId = reviewId(search);
  useEffect(() => {
    if (requestId) rememberReview(null);
  }, [requestId]);
  const count = useQuery({
    queryKey: ["admin-access-count", user?.id],
    enabled: !!user?.isAdmin,
    queryFn: () =>
      ownerRequest<{ pending: number }>("/admin/booking-access/count"),
    refetchInterval: 30000,
  });
  if (!user) return null;
  if (user.accountStatus !== "approved") {
    const waiting = user.accountStatus === "pending";
    return (
      <main className="dashboard">
        <div className="account-wrap">
          <section className="panel account-form">
            <p className="eyebrow">Demande de création de compte</p>
            <h1 className="section-title">
              {waiting
                ? "Votre inscription est en attente"
                : "Votre inscription a été refusée"}
            </h1>
            <p>
              {waiting
                ? "Votre adresse est confirmée. L’administration du chalet examinera votre demande et vous répondra par courriel."
                : "L’administration n’a pas accepté votre demande. Vous pouvez contacter le chalet si vous avez des questions."}
            </p>
            <p>
              {user.name} · {user.email}
              <br />
              Lien déclaré : {relationshipLabel(user.declaredRelation)}
            </p>
            <div className="button-row">
              <Link className="text-link" href="/calendrier">
                Consulter les disponibilités
              </Link>
              {!waiting && (
                <Link className="text-link" href="/contact">
                  Contacter le chalet
                </Link>
              )}
              <button
                className="text-link"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                Déconnexion
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }
  const tabs = [
    {
      id: "reservations",
      label: "Mes réservations",
      icon: CalendarDays,
      visible: user.canBook,
      panel: <BookingList />,
    },
    {
      id: "profil",
      label: "Mon profil",
      icon: UserRound,
      visible: true,
      panel: <ProfilePanel />,
    },
    {
      id: "securite",
      label: "Sécurité",
      icon: KeyRound,
      visible: true,
      panel: <SecurityPanel />,
    },
    {
      id: "blogue",
      label: user.isAdmin ? "Gestion du blogue" : "Mes chroniques",
      icon: BookOpen,
      visible: true,
      panel: <BlogPanel />,
    },
    {
      id: "approbations",
      label: "Approbations",
      icon: ShieldCheck,
      visible: user.canApprove,
      panel: <BookingList review />,
    },
    {
      id: "comptes",
      label: count.data?.pending
        ? "Comptes et accès (" + count.data.pending + ")"
        : "Comptes et accès",
      icon: UsersRound,
      visible: user.isAdmin,
      panel: <AccountsPanel requestId={requestId} />,
    },
    {
      id: "sejours",
      label: "Tous les séjours",
      icon: CalendarRange,
      visible: user.isAdmin,
      panel: <StaysPanel />,
    },
    {
      id: "chalet",
      label: "Réglages du chalet",
      icon: House,
      visible: user.isAdmin,
      panel: <ChaletPanel />,
    },
  ].filter((t) => t.visible);
  const selected =
    tabs.find((t) => t.id === new URLSearchParams(search).get("onglet")) ??
    tabs[0];
  return (
    <div className="dashboard">
      <div className="account-wrap">
        <header className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow">
              <span aria-hidden="true" /> Espace personnel
            </p>
            <h1>Bonjour, {user.name}</h1>
            <span className="badge">
              {user.isAdmin
                ? "Super administrateur"
                : user.canApprove
                  ? "Propriétaire · Comité d’approbation"
                  : user.isOwner
                    ? "Propriétaire"
                    : "Membre"}
            </span>
          </div>
          <figure className="welcome-photo">
            <img
              src="/media/chalet/pointe-automne.jpg"
              width="1120"
              height="443"
              alt="Le chalet sur sa pointe boisée au bord du lac"
            />
            <figcaption>La pointe en automne</figcaption>
          </figure>
        </header>
        <div className="account-layout">
          <nav aria-label="Menu du compte" className="account-nav">
            <label className="mobile-panel-menu">
              <span className="eyebrow">Mon espace</span>
              <select
                aria-label="Choisir un panneau"
                value={selected.id}
                onChange={(e) =>
                  navigate("/tableau-de-bord?onglet=" + e.target.value)
                }
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {["Mon espace", "Administration"].map((group) => {
              const entries = tabs.filter(
                (t) =>
                  (["comptes", "sejours", "chalet"].includes(t.id)
                    ? "Administration"
                    : "Mon espace") === group,
              );
              return (
                entries.length > 0 && (
                  <div key={group} className="nav-group">
                    <p className="eyebrow">{group}</p>
                    {entries.map((t) => (
                      <Link
                        key={t.id}
                        href={"/tableau-de-bord?onglet=" + t.id}
                        data-testid={"tab-" + t.id}
                        aria-current={selected.id === t.id ? "page" : undefined}
                      >
                        <t.icon size={17} />
                        {t.label}
                      </Link>
                    ))}
                  </div>
                )
              );
            })}
            <button
              className="nav-logout"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </nav>
          <section key={selected.id} className="account-content">
            {requestId && !user.isAdmin ? (
              <div className="panel" role="status">
                <h2 className="section-title">Compte administrateur requis</h2>
                <p>
                  Pour examiner cette demande, déconnectez-vous puis rouvrez le
                  lien du courriel avec votre compte administrateur.
                </p>
              </div>
            ) : (
              selected.panel
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
