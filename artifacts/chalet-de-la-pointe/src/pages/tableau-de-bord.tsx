import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarDays,
  BookOpen,
  Receipt,
  ShieldCheck,
  LogOut,
  Lock,
  MapPin,
  Clock,
} from "lucide-react";

type Tab = "reservations" | "blogue" | "depenses" | "admin";

const mockReservations = [
  {
    id: "RES-001",
    property: "Chalet St-Mathieu",
    checkIn: "14 juillet 2024",
    checkOut: "21 juillet 2024",
    guests: 4,
    status: "Confirmée",
  },
  {
    id: "RES-002",
    property: "Chalet St-Mathieu",
    checkIn: "2 septembre 2024",
    checkOut: "7 septembre 2024",
    guests: 6,
    status: "En attente",
  },
];

export default function TableauDeBord() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("reservations");

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "reservations", label: "Mes réservations", icon: CalendarDays },
    { id: "blogue", label: "Blogue", icon: BookOpen },
    { id: "depenses", label: "Dépenses", icon: Receipt },
    { id: "admin", label: "Administration", icon: ShieldCheck, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-secondary pt-20">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-6 max-w-5xl py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest uppercase text-muted-foreground mb-1">Espace personnel</p>
            <h1 className="text-2xl md:text-3xl font-serif text-primary">
              Bonjour, {user?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            data-testid="button-logout"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>

        {/* Tabs */}
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isLocked = tab.adminOnly && user?.role !== "admin";
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !isLocked && setActiveTab(tab.id)}
                  disabled={isLocked}
                  data-testid={`tab-${tab.id}`}
                  className={`flex items-center gap-2 px-4 py-4 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  } ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Icon size={15} />
                  {tab.label}
                  {isLocked && <Lock size={12} className="ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 max-w-5xl py-10">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Reservations Tab */}
          {activeTab === "reservations" && (
            <div>
              <h2 className="text-xl font-serif text-primary mb-6">Mes réservations</h2>
              {mockReservations.length === 0 ? (
                <div className="bg-background border border-border p-12 text-center">
                  <CalendarDays size={32} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune réservation pour le moment.</p>
                  <Link href="/calendrier" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
                    Voir les disponibilités
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {mockReservations.map((res) => (
                    <div
                      key={res.id}
                      data-testid={`card-reservation-${res.id}`}
                      className="bg-background border border-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs tracking-widest uppercase text-muted-foreground">{res.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${
                            res.status === "Confirmée"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {res.status}
                          </span>
                        </div>
                        <h3 className="font-serif text-primary text-lg">{res.property}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            Saint-Mathieu-de-Rioux
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {res.checkIn} → {res.checkOut}
                          </span>
                          <span>{res.guests} voyageurs</span>
                        </div>
                      </div>
                      <button
                        className="shrink-0 border border-border text-sm px-6 py-2.5 hover:border-primary hover:text-primary transition-colors"
                        data-testid={`button-details-${res.id}`}
                      >
                        Détails
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blog Tab */}
          {activeTab === "blogue" && (
            <div>
              <h2 className="text-xl font-serif text-primary mb-6">Chroniques du Lac</h2>
              <div className="bg-background border border-border p-8 text-center">
                <BookOpen size={32} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Retrouvez tous nos articles sur le lac et la région.</p>
                <Link
                  href="/blogue"
                  className="inline-block bg-primary text-primary-foreground px-8 py-3 text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors"
                  data-testid="link-go-blog"
                >
                  Voir le blogue
                </Link>
              </div>
            </div>
          )}

          {/* Dépenses Tab */}
          {activeTab === "depenses" && (
            <div>
              <h2 className="text-xl font-serif text-primary mb-6">Dépenses</h2>
              <div className="bg-background border border-border p-12 text-center">
                <Receipt size={32} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Module de dépenses</p>
                <p className="text-sm text-muted-foreground/60">Cette fonctionnalité sera disponible lors de la Phase Deux de la plateforme.</p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-muted-foreground/40">
                  <Lock size={12} />
                  Bientôt disponible
                </div>
              </div>
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === "admin" && user?.role === "admin" && (
            <div>
              <h2 className="text-xl font-serif text-primary mb-6">Administration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Propriétés actives", value: "1", sub: "Chalet St-Mathieu" },
                  { label: "Réservations totales", value: "2", sub: "dont 1 confirmée" },
                  { label: "Articles publiés", value: "4", sub: "sur le blogue" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-background border border-border p-6">
                    <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-4xl font-serif text-primary mb-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-background border border-border p-8 text-center">
                <ShieldCheck size={32} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Panneau d'administration complet</p>
                <p className="text-sm text-muted-foreground/60">La gestion complète des réservations, propriétés et utilisateurs sera disponible en Phase Deux.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
