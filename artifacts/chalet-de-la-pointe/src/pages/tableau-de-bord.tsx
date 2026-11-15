import { BookingList } from "@/components/booking-list";
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
} from "lucide-react";

type Tab = "reservations" | "blogue" | "depenses" | "admin";

export default function TableauDeBord() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(user?.canApprove && new URLSearchParams(location.search).get("onglet") === "approbations" ? "admin" : "reservations");

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "reservations", label: "Mes réservations", icon: CalendarDays },
    { id: "blogue", label: "Blogue", icon: BookOpen },
    { id: "depenses", label: "Dépenses", icon: Receipt },
    { id: "admin", label: "Approbations", icon: ShieldCheck, adminOnly: true },
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
            <p className="text-sm text-muted-foreground mt-1 capitalize">{user?.canApprove ? "Propriétaire · Comité d’approbation" : "Propriétaire"}</p>
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
              const isLocked = tab.adminOnly && !user?.canApprove;
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
          {activeTab === "reservations" && <BookingList />}

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
          {activeTab === "admin" && user?.canApprove && <BookingList review />}
        </motion.div>
      </div>
    </div>
  );
}
