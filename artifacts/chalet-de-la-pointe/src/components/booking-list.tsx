import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { listMyReservations, type ReservationStatus, type Reservation } from "@workspace/api-client-react";
import { ownerRequest, useAuth } from "@/context/AuthContext";

type Stay = Pick<Reservation, "id" | "startDate" | "endDate" | "guests" | "status"> & { ownerName?: string };
const labels: Record<ReservationStatus, string> = {
  draft: "Brouillon", pending_payment: "En attente de paiement", pending_approval: "En attente",
  confirmed: "Approuvée", cancelled: "Annulée", rejected: "Refusée", expired: "Expirée",
};

export function BookingList({ review = false }: { review?: boolean }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const key = ["bookings", user?.id, review];
  const rows = useQuery<Stay[]>({ queryKey: key, refetchInterval: 30000,
    queryFn: () => review ? ownerRequest("/reviews") : listMyReservations() });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) =>
      ownerRequest("/reviews/" + id, { method: "POST", body: JSON.stringify({ decision }) }),
    onSettled: async () => {
      await cache.invalidateQueries({ queryKey: ["bookings"] });
      await cache.invalidateQueries({ queryKey: ["availability"] });
    },
  });
  return <section>
    <div className="flex justify-between items-baseline gap-3 mb-5">
      <h2 className="text-2xl font-serif">{review ? "Demandes à examiner" : "Mes réservations"}</h2>
      <Link href="/calendrier" className="underline text-sm">Voir le calendrier</Link>
    </div>
    {rows.isLoading && <p>Chargement…</p>}
    {rows.isError && <p role="alert">Impossible de charger les demandes. <button className="underline" onClick={() => rows.refetch()}>Réessayer</button></p>}
    {decide.isError && <p role="alert">{decide.error.message}</p>}
    {rows.data?.length === 0 && <p>Aucune demande pour le moment.</p>}
    <ul className="space-y-3">{rows.data?.map(s => <li key={s.id} className="bg-background border rounded-xl p-5">
      <strong>{s.startDate} → {s.endDate}</strong>
      <p className="text-sm my-2">{s.ownerName && s.ownerName + " · "}{s.guests} voyageur{s.guests > 1 && "s"} · {labels[s.status]}</p>
      {review && s.status === "pending_approval" && <div className="flex gap-3">
        <button disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, decision: "approve" })} className="rounded bg-primary text-white px-4 py-2">Approuver</button>
        <button disabled={decide.isPending} onClick={() => decide.mutate({ id: s.id, decision: "reject" })} className="rounded border px-4 py-2">Refuser</button>
      </div>}
    </li>)}</ul>
  </section>;
}
