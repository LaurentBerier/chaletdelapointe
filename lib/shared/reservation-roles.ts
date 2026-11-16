type Staff = { isAdmin: boolean; isReservationAdmin: boolean };

export function managesStays(user: Staff | undefined | null) {
  return !!user && (user.isAdmin || user.isReservationAdmin);
}

export function reviewsStays(
  user: (Staff & { group: string; canApprove: boolean }) | undefined,
) {
  return (
    managesStays(user) || (user?.group === "proprietaire" && user.canApprove)
  );
}
