export const bookingAccessStates = [
  "none",
  "pending",
  "granted",
  "denied",
] as const;
export type BookingAccess = (typeof bookingAccessStates)[number];
export function mayBook(account: { bookingAccess: BookingAccess }) {
  return account.bookingAccess === "granted";
}
