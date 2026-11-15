import { BookingAccessPanel } from "@/components/booking-access";
import { FieldHeading } from "@/components/field-heading";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { DayPicker, type DateRange } from "react-day-picker";
import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createReservation, getPublicCalendar, listProperties, type CalendarEntry } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const iso = (date: Date) => format(date, "yyyy-MM-dd");
const readable = (date: string) => format(parseISO(date), "d MMM yyyy", { locale: fr });
const signInDatesKey = "chalet.calendar.sign-in-dates";

export default function Calendrier() {
  const { user, isLoading } = useAuth();
  const mobile = useIsMobile();
  const cache = useQueryClient();
  const today = parseISO(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date()));
  const [month, setMonth] = useState(startOfMonth(today));
  const [range, setRange] = useState<DateRange>();
  const resumeAfterLogin = useRef(new URLSearchParams(location.search).has("reprendre"));
  const [editingArrival, setEditingArrival] = useState(false);
  const calendar = useRef<HTMLElement>(null);
  const [guests, setGuests] = useState(1);
  const [notice, setNotice] = useState("");
  const properties = useQuery({ queryKey: ["chalet-listing"], queryFn: () => listProperties() });
  const chalet = properties.data?.find(p => p.slug === "chalet-saint-mathieu");
  const availability = useQuery({
    queryKey: ["availability", chalet?.id, user?.isOwner ? user.id : "public"],
    enabled: !!chalet && !isLoading, refetchInterval: 30000,
    queryFn: async () => {
      if (user?.isOwner) return getPublicCalendar(chalet!.id);
      const res = await fetch("/api/calendar/" + chalet!.id, { cache: "no-store" });
      if (!res.ok) throw new Error("Calendrier indisponible.");
      return res.json() as Promise<CalendarEntry[]>;
    },
  });
  const stays = availability.data ?? [];
  // The email link can return the owner in a different tab of the same browser.
  useEffect(() => {
    if (!resumeAfterLogin.current || !user || !availability.data) return;
    resumeAfterLogin.current = false;
    const saved = localStorage.getItem(signInDatesKey);
    if (!saved) return;
    const [start, end, savedAt] = saved.split("|");
    const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start < todayISO || Number(savedAt) < Date.now() - 3_600_000) return;
    if (availability.data.some(s => s.startDate <= start && start < s.endDate)) {
      setNotice("Votre date d’arrivée a été réservée. Choisissez une autre date.");
      return;
    }
    const from = parseISO(start);
    const keepEnd = /^\d{4}-\d{2}-\d{2}$/.test(end) && start < end &&
      !availability.data.some(s => start < s.endDate && s.startDate < end);
    setMonth(startOfMonth(from));
    setRange({ from, to: keepEnd ? parseISO(end) : undefined });
  }, [user, availability.data]);
  const checkIn = range?.from && iso(range.from);
  const checkOut = range?.to && iso(range.to);
  const nights = range?.from && range.to ? differenceInCalendarDays(range.to, range.from) : 0;
  const conflicts = (start: string, end: string) => stays.some(s => start < s.endDate && s.startDate < end);
  const occupied = (day: string) => stays.some(s => s.startDate <= day && day < s.endDate);
  const selectingEnd = !!checkIn && !checkOut && !editingArrival;
  function editArrival() {
    if (!range?.from) return;
    setMonth(startOfMonth(range.from));
    setEditingArrival(true);
    setNotice("");
    calendar.current?.focus();
    calendar.current?.scrollIntoView({ block: "nearest" });
  }
  function disabled(date: Date) {
    const day = iso(date);
    if (day < iso(today)) return true;
    if (selectingEnd && day > checkIn!) return conflicts(checkIn!, day);
    return occupied(day);
  }
  function select(date: Date) {
    const day = iso(date);
    if (booking.isPending || disabled(date)) return;
    localStorage.removeItem(signInDatesKey);
    setNotice("");
    if (editingArrival) {
      const keepDeparture = checkOut && day < checkOut && !conflicts(day, checkOut);
      setRange({ from: date, to: keepDeparture ? range?.to : undefined });
      setEditingArrival(false);
    } else if (selectingEnd && day > checkIn!) setRange({ from: range!.from, to: date });
    else setRange({ from: date, to: undefined });
  }
  const booking = useMutation({
    mutationFn: () => createReservation({ propertyId: chalet!.id, startDate: checkIn!, endDate: checkOut!, guests }),
    onSuccess: async () => {
      localStorage.removeItem(signInDatesKey);
      setRange(undefined); setNotice("Demande envoyée. Vos nuits sont en attente d’approbation.");
      await cache.invalidateQueries({ queryKey: ["availability"] });
      await cache.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: async (err: Error) => {
      setNotice(err.message.replace(/^HTTP \d+[^:]*:\s*/, ""));
      await availability.refetch();
    },
  });
  const visibleStart = iso(startOfMonth(month)), visibleEnd = iso(addMonths(startOfMonth(month), mobile ? 1 : 2));
  const visible = stays.filter(s => s.startDate < visibleEnd && s.endDate > visibleStart);
  const ready = !!chalet && availability.isSuccess && !availability.isRefetchError;
  return <main className="calendar-page min-h-screen bg-secondary/20 pt-28 pb-20 px-4">
    <div className="max-w-5xl mx-auto">
      <FieldHeading kind="stay" title="Calendrier des disponibilités" />
      {(!ready && (properties.isError || availability.isError || (properties.isSuccess && !chalet)))
        ? <p role="alert">Les disponibilités sont momentanément indisponibles. <button className="underline" onClick={() => { void properties.refetch(); if (chalet) void availability.refetch(); }}>Réessayer</button></p>
        : !ready ? <p role="status">Chargement des disponibilités…</p>
        : <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_17rem] items-start">
          <section ref={calendar} tabIndex={-1} aria-label="Dates du séjour" className="bg-background border rounded-2xl p-4 md:p-6 scroll-mt-24">
            <p className="mb-4 text-sm text-muted-foreground" role="status">{editingArrival ? "Choisissez votre nouvelle date d’arrivée dans le calendrier." : selectingEnd ? "Choisissez maintenant votre date de départ." : "Sélectionnez votre arrivée, puis votre départ."}</p>
            <DayPicker locale={fr} mode="range" month={month} onMonthChange={setMonth}
              numberOfMonths={mobile ? 1 : 2} startMonth={startOfMonth(today)} selected={range}
              onSelect={(_range, day) => select(day)} disabled={disabled}
              modifiers={{
                held: d => stays.some(s => s.status === "held" && s.startDate <= iso(d) && iso(d) < s.endDate),
                booked: d => stays.some(s => s.status === "confirmed" && s.startDate <= iso(d) && iso(d) < s.endDate),
              }}
              modifiersStyles={{ held: { backgroundColor: "#f6e8c3", color: "#594418" }, booked: { backgroundColor: "#dce7e4", color: "#26463d" } }}
            />
            <div className="flex flex-wrap gap-4 mt-5 text-sm"><span>○ Disponible</span><span className="bg-[#f6e8c3] px-2 rounded">En attente</span><span className="bg-[#dce7e4] px-2 rounded">Réservé</span></div>
            {visible.length > 0 && <ul className="border-t mt-5 pt-3 text-sm space-y-2">{visible.map(s =>
              <li key={s.startDate}>{readable(s.startDate)} → {readable(s.endDate)} · {s.status === "held" ? "En attente" : "Réservé"}{user?.isOwner && s.ownerName && " · " + s.ownerName}</li>)}</ul>}
          </section>
          <aside className="p-5 border rounded-2xl bg-background">
            <p className="eyebrow">{chalet?.name}</p><h2 className="font-serif text-2xl text-primary">Votre séjour</h2>{chalet?.description && <p className="text-sm mt-2">{chalet.description}</p>}
              <div className="my-4 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <dl><dt className="text-muted-foreground">Arrivée</dt><dd>{checkIn ? readable(checkIn) : "À choisir"}</dd></dl>
                  {checkIn && <button type="button" disabled={booking.isPending} className="text-primary underline py-2" onClick={editingArrival ? () => setEditingArrival(false) : editArrival}>{editingArrival ? "Annuler la modification" : "Modifier l’arrivée"}</button>}
                </div>
                <dl><dt className="text-muted-foreground">Départ</dt><dd>{checkOut ? readable(checkOut) : "À choisir"}</dd></dl>
              </div>
              {user?.canBook && <label className="flex items-center justify-between">Voyageurs <select className="border rounded-md p-2" value={guests} onChange={e => setGuests(Number(e.target.value))}>
                {Array.from({ length: chalet!.maxGuests }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>}
              {nights > 0 && <p className="mt-4">{nights} nuit{nights > 1 ? "s" : ""}</p>}
              {user?.canBook ?
              <button disabled={editingArrival || !nights || conflicts(checkIn!, checkOut!) || booking.isPending} onClick={() => booking.mutate()} className="w-full bg-primary text-white rounded-lg p-3 mt-4 disabled:opacity-45">Demander la réservation</button>
              : user ? <BookingAccessPanel compact/> : <Link className="block bg-primary text-white text-center px-4 py-3 mt-4 rounded-lg" href="/connexion" onClick={() => {
                if (checkIn) localStorage.setItem(signInDatesKey, [checkIn, checkOut ?? "", Date.now()].join("|"));
                else localStorage.removeItem(signInDatesKey);
              }}>Se connecter pour réserver</Link>}
              {!user && <p className="mt-3 text-sm">Pas encore d’accès aux réservations ? <Link href="/tableau-de-bord?onglet=profil" className="text-link">Me connecter pour demander l’accès</Link>.</p>}
              {checkIn && <button disabled={booking.isPending} className="underline mt-3 text-sm" onClick={() => { localStorage.removeItem(signInDatesKey); setRange(undefined); setEditingArrival(false); setNotice(""); }}>Effacer les dates</button>}
              <p className="mt-3 text-sm" role="status">{notice}</p>
              {user?.canBook && <Link href="/tableau-de-bord" className="text-sm underline">Mes réservations</Link>}
          </aside>
        </div>}
    </div>
  </main>;
}
