import { createContext, useContext, type CSSProperties } from "react";
import { DayButton, type DayButtonProps } from "react-day-picker";
import { format } from "date-fns";
import type { CalendarEntry } from "@workspace/api-client-react";
import { stayDates } from "../../../../lib/shared/stay-dates";

const palette = [
  "#28735d", "#3466ad", "#a34b67", "#946121", "#7352a0", "#087d89",
  "#b34e30", "#657723", "#97518a", "#496781", "#875e47",
];
export function stayStyle(slot?: number): CSSProperties {
  const accent = slot ? (palette[slot - 1] ?? `hsl(${(slot * 137.508) % 360} 54% 36%)`) : "#526c65";
  return { "--stay-accent": accent } as CSSProperties;
}

type DayStays = { night?: CalendarEntry; departure?: CalendarEntry };
export const StayInspection = createContext<{
  staysFor: (day: string) => DayStays;
  ownerView: boolean;
  active: string | null;
  preview: (day: string, visible: boolean) => void;
}>({ staysFor: () => ({}), ownerView: false, active: null, preview: () => {} });

const statusLabel = (stay: CalendarEntry) => stay.status === "held" ? "Demande en attente" : "Séjour confirmé";

function StayDetail({ stay, prefix }: { stay: CalendarEntry; prefix?: string }) {
  return <span className="calendar-tip-entry">
    <span>{prefix && prefix + " · "}{statusLabel(stay)}</span>
    <strong>{stay.ownerName}</strong>
    <span>{stayDates(stay.startDate, stay.endDate)}</span>
  </span>;
}

export function CalendarDayButton(props: DayButtonProps) {
  const { staysFor, ownerView, active, preview } = useContext(StayInspection);
  const date = props.day.date;
  const day = format(date, "yyyy-MM-dd");
  const { night, departure } = staysFor(day);
  const inspect = ownerView && !!(night?.ownerName || departure?.ownerName);
  if (!inspect && !departure) return <DayButton {...props} />;

  const describe = (s: CalendarEntry) => statusLabel(s) +
    (ownerView && s.ownerName ? " : " + s.ownerName : "") + ", " + stayDates(s.startDate, s.endDate) + ".";
  const label = [props["aria-label"], departure && "Départ. " + describe(departure),
    night ? (departure ? "Arrivée. " : "") + describe(night) : "Nuit disponible."].filter(Boolean).join(" ");
  const markedButton = <DayButton {...props} aria-expanded={inspect ? active === day : undefined} aria-label={label}>
    {props.children}{departure && <span aria-hidden="true" className="calendar-checkout-label">Départ</span>}
  </DayButton>;
  if (!inspect) return <span className="calendar-checkout-day">{markedButton}</span>;

  const column = (date.getDay() + 6) % 7; // French calendar starts on Monday.
  return <span className="calendar-stay-day" style={stayStyle((night ?? departure)?.ownerColorSlot)}
    data-night={night?.status} data-checkout={departure ? true : undefined}
    data-edge={column < 2 ? "start" : column > 4 ? "end" : undefined}
    onPointerEnter={e => { if (e.pointerType === "mouse") preview(day, true); }}
    onPointerLeave={e => { if (e.pointerType === "mouse") preview(day, false); }}
    onFocus={e => { if (e.target.matches(":focus-visible")) preview(day, true); }}
    onBlur={() => preview(day, false)}>
    {markedButton}
    {active === day && <span aria-hidden="true" className="calendar-stay-tip">
      {departure && <StayDetail stay={departure} prefix="Départ" />}
      {night ? <StayDetail stay={night} prefix={departure ? "Arrivée" : undefined} />
        : <span className="calendar-tip-free">Nuit disponible</span>}
    </span>}
  </span>;
}
