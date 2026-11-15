import { CalendarCheck2 } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerRequest, useAuth } from "@/context/AuthContext";

export function BookingAccessPanel({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth(),
    cache = useQueryClient();
  const request = useMutation({
    mutationFn: () => ownerRequest("/me/booking-access", { method: "POST" }),
    onSettled: () => cache.invalidateQueries({ queryKey: ["session-account"] }),
  });
  if (!user) return null;
  if (user.accountStatus !== "approved")
    return (
      <div className="booking-access-compact">
        <strong>
          {user.accountStatus === "pending"
            ? "Inscription en attente"
            : "Inscription refusée"}
        </strong>
        <p>
          {user.accountStatus === "pending"
            ? "Vous pourrez demander à réserver une fois votre compte approuvé."
            : "Vous pouvez toujours consulter les disponibilités publiques."}
        </p>
      </div>
    );
  const state = user.canBook ? "granted" : user.bookingAccess;
  return (
    <section
      className={
        compact ? "booking-access-compact" : "panel account-form access-panel"
      }
      aria-label="Accès aux réservations"
    >
      {!compact && (
        <>
          <p className="eyebrow">Séjours au chalet</p>
          <h3>Accès aux réservations</h3>
        </>
      )}
      <div aria-live="polite">
        {state === "granted" ? (
          <>
            <span className="badge status-confirmed">Accès actif</span>
            <p>
              Vous pouvez choisir vos dates et soumettre une demande de séjour.
            </p>
          </>
        ) : state === "pending" ? (
          <>
            <span className="badge status-pending_approval">
              Demande en attente
            </span>
            <p>
              Votre demande a été transmise à l’administration du chalet. Vous
              recevrez sa réponse par courriel.
            </p>
          </>
        ) : state === "denied" ? (
          <>
            <span className="badge status-rejected">Accès refusé</span>
            <p>
              Votre demande d’accès n’a pas été acceptée. Pour un suivi,{" "}
              <Link href="/contact" className="text-link">
                contactez le chalet
              </Link>
              .
            </p>
          </>
        ) : (
          <p>
            Demandez l’autorisation de réserver le chalet. Vous pourrez choisir
            un séjour une fois votre accès approuvé.
          </p>
        )}
      </div>
      {state === "none" && (
        <button
          type="button"
          className="action"
          disabled={request.isPending}
          onClick={() => request.mutate()}
        >
          <CalendarCheck2 size={16} aria-hidden="true" />{" "}
          {request.isPending
            ? "Envoi en cours…"
            : "Demander l’accès aux réservations"}
        </button>
      )}
      {state === "granted" && !compact && (
        <Link href="/calendrier" className="text-link">
          Ouvrir le calendrier
        </Link>
      )}
      {request.isError && (
        <p className="feedback" role="alert">
          {request.error.message}
        </p>
      )}
    </section>
  );
}
