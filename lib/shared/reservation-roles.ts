type Staff = { isAdmin: boolean; isReservationAdmin: boolean };

export function managesStays(user: Staff | undefined | null) {
  return !!user && (user.isAdmin || user.isReservationAdmin);
}

export function cancelsOthersStays(
  user: (Staff & { canCancelOthers: boolean }) | undefined | null,
) {
  return !!user && (managesStays(user) || user.canCancelOthers);
}

export function isCancellableStay(status: string) {
  return ["draft", "pending_payment", "pending_approval", "confirmed"].includes(
    status,
  );
}

export function reviewsStays(
  user: (Staff & { group: string; canApprove: boolean }) | undefined,
) {
  return (
    managesStays(user) || (user?.group === "proprietaire" && user.canApprove)
  );
}
