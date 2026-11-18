import { managesStays } from "../../../../lib/shared/reservation-roles";
import { managementLinks, panelHref } from "@/lib/management-navigation";
import { relationshipLabel } from "../../../../lib/shared/membership";
import { useEffect, useRef } from "react";
import { rememberReview, reviewId } from "@/lib/access-review";
import { useLocation, useSearch, Link } from "wouter";
import {
  CalendarDays,
  BookOpen,
  LogOut,
  KeyRound,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ownerRequest, useAuth } from "@/context/AuthContext";
import { BookingList } from "@/components/booking-list";
import { CommunityPanel } from "@/components/community-panel";
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
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      user?.accountStatus === "approved" &&
      new URLSearchParams(search).has("onglet") &&
      window.matchMedia("(max-width: 850px)").matches
    ) {
      content.current?.focus({ preventScroll: true });
      content.current?.scrollIntoView({ block: "start" });
    }
  }, [search, user?.accountStatus]);
  const requestId = reviewId(search);
  useEffect(() => {
    if (requestId) rememberReview(null);
  }, [requestId]);
  const count = useQuery({
    queryKey: ["admin-access-count", user?.id],
    enabled: managesStays(user),
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
  const staffLinks = managementLinks(user);
  const managementPanels = {
    approbations: <BookingList review />,
    sejours: <StaysPanel />,
    comptes: <AccountsPanel requestId={requestId} />,
    chalet: <ChaletPanel />,
    blogue: <BlogPanel />,
  };
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
      id: "vie",
      label: "Vie du chalet",
      icon: BookOpen,
      visible: true,
      panel: <CommunityPanel />,
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
      label: "Mes chroniques",
      icon: BookOpen,
      visible: !managesStays(user),
      panel: <BlogPanel />,
    },
    ...staffLinks.map((link) => ({
      ...link,
      visible: true,
      panel: managementPanels[link.id],
      label:
        link.id === "comptes" && count.data?.pending
          ? link.label + " (" + count.data.pending + ")"
          : link.label,
    })),
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
                : user.isReservationAdmin
                  ? "Administrateur"
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
            {["Mon espace", "Administration"].map((group) => {
              const entries = tabs.filter(
                (t) =>
                  (staffLinks.some((link) => link.id === t.id)
                    ? "Administration"
                    : "Mon espace") === group,
              );
              return (
                entries.length > 0 && (
                  <div
                    key={group}
                    className="nav-group"
                    data-group={
                      group === "Administration" ? "staff" : "personal"
                    }
                  >
                    <p className="eyebrow">{group}</p>
                    {entries.map((t) => (
                      <Link
                        key={t.id}
                        href={panelHref(t.id)}
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
          <section
            key={selected.id}
            ref={content}
            tabIndex={-1}
            className="account-content scroll-mt-24"
          >
            {requestId && !managesStays(user) ? (
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
