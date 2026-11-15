import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerRequest } from "@/context/AuthContext";
import { stayDates } from "../../../../lib/shared/stay-dates";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
  AlertDialogHeader, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "./ui/alert-dialog";

type Stay = { id: string; startDate: string; endDate: string; status: string };

export function AdminCancelStay({ stay, name }: { stay: Stay; name?: string }) {
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => ownerRequest("/admin/reservations/" + stay.id + "/cancel", { method: "POST" }),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all(["bookings", "admin-stays", "availability"].map(key =>
        cache.invalidateQueries({ queryKey: [key] })));
    },
  });
  if (!["confirmed", "pending_approval", "pending_payment", "draft"].includes(stay.status)) return null;
  return <AlertDialog open={open} onOpenChange={next => {
    if (!cancel.isPending) { cancel.reset(); setOpen(next); }
  }}>
    <AlertDialogTrigger asChild>
      <button type="button" className="text-link stay-cancel-link">Annuler la réservation…</button>
    </AlertDialogTrigger>
    <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl">
      <AlertDialogHeader>
        <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong>{name ? name + " · " : ""}{stayDates(stay.startDate, stay.endDate)}</strong>
          <br />Ces dates seront libérées.{stay.status !== "draft" &&
            " La personne qui a réservé recevra un courriel d’annulation."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {cancel.isError && <p role="alert">{cancel.error.message}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={cancel.isPending}>Garder la réservation</AlertDialogCancel>
        <AlertDialogAction className="bg-[#8b3932] text-white hover:bg-[#742f29]" disabled={cancel.isPending}
          onClick={e => { e.preventDefault(); cancel.mutate(); }}>
          {cancel.isPending ? "Annulation en cours…" : "Confirmer l’annulation"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
