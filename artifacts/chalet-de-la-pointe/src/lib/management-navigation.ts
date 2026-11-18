import {
  BookOpen,
  CalendarRange,
  House,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { managesStays } from "../../../../lib/shared/reservation-roles";

export function managementLinks(
  user?: {
    accountStatus: string;
    isAdmin: boolean;
    isReservationAdmin: boolean;
    canApprove: boolean;
  } | null,
) {
  if (!user || user.accountStatus !== "approved") return [];
  return [
    ...(user.canApprove
      ? [
          {
            id: "approbations" as const,
            label: "Approbations",
            icon: ShieldCheck,
          },
        ]
      : []),
    ...(managesStays(user)
      ? [
          {
            id: "sejours" as const,
            label: "Tous les séjours",
            icon: CalendarRange,
          },
          {
            id: "comptes" as const,
            label: user.isAdmin ? "Comptes et accès" : "Demandes des membres",
            icon: UsersRound,
          },
        ]
      : []),
    ...(managesStays(user)
      ? [{ id: "blogue" as const, label: "Gestion du blogue", icon: BookOpen }]
      : []),
    ...(user.isAdmin
      ? [{ id: "chalet" as const, label: "Réglages du chalet", icon: House }]
      : []),
  ];
}
export const panelHref = (id: string) => "/tableau-de-bord?onglet=" + id;
