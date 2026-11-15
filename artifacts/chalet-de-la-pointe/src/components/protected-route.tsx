import { Redirect } from "wouter";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm tracking-wider uppercase">
            Chargement…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        to={
          location.search.includes("onglet=approbations")
            ? "/connexion?suite=approbations"
            : new URLSearchParams(location.search).get("onglet") === "profil"
              ? "/connexion?suite=profil"
              : "/connexion"
        }
      />
    );
  }

  if (requireAdmin && !user?.isAdmin) {
    return <Redirect to="/tableau-de-bord" />;
  }

  return <>{children}</>;
}
