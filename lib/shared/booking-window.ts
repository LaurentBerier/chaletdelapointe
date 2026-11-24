/** Reservation years open at midnight on January 1 in the chalet's timezone. */
export function getBookingWindow(now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(now);
  const lastYear = Math.max(2027, Number(today.slice(0, 4)));
  return {
    today,
    lastYear,
    lastNight: `${lastYear}-12-31`,
    // Checkout is exclusive: the last open night can end on January 1.
    endDate: `${lastYear + 1}-01-01`,
    message: `Les nuits sont ouvertes à la réservation jusqu’au 31 décembre ${lastYear}. Les dates de ${lastYear + 1} ouvriront le 1er janvier ${lastYear + 1}, à minuit (heure du Québec).`,
  };
}

export function bookingWindowError(startDate: string, endDate: string, now = new Date()) {
  const window = getBookingWindow(now);
  return startDate >= window.endDate || endDate > window.endDate ? window.message : null;
}
