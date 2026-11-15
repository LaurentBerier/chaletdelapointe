export const bookingAccessStates = [
  "none",
  "pending",
  "granted",
  "denied",
] as const;
export type BookingAccess = (typeof bookingAccessStates)[number];
export function mayBook(account: {
  group: string;
  bookingAccess: BookingAccess;
}) {
  return (
    account.group === "proprietaire" || account.bookingAccess === "granted"
  );
}
