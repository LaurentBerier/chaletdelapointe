import { useLocation, useSearch, Link } from "wouter";
import {
  CalendarDays,
  BookOpen,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
  House,
  CalendarRange,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BookingList } from "@/components/booking-list";
import {
  ProfilePanel,
  AccountsPanel,
  StaysPanel,
  BlogPanel,
  ChaletPanel,
} from "@/components/account-panels";

export default function TableauDeBord() {
  const { user, logout } = useAuth(),
    [, navigate] = useLocation(),
    search = useSearch();
  if (!user) return null;
  const tabs = [
    {
      id: "reservations",
      label: "Mes réservations",
      icon: CalendarDays,
      visible: user.isOwner,
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
      label: "Comptes et accès",
      icon: UsersRound,
      visible: user.isAdmin,
      panel: <AccountsPanel />,
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
          <div>
            <p className="eyebrow">Chalet de la Pointe · Mon espace</p>
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
          <button
            className="logout"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </header>
        <div className="account-layout">
          <nav aria-label="Menu du compte" className="account-nav">
            <p className="eyebrow">Mon espace</p>
            {tabs.map((t) => (
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
          </nav>
          <section key={selected.id} className="account-content">
            {selected.panel}
          </section>
        </div>
      </div>
    </div>
  );
}
