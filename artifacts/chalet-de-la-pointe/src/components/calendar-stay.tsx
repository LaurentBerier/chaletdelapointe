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

export const StayInspection = createContext<{
  stayFor: (day: string) => CalendarEntry | undefined;
  active: string | null;
  preview: (day: string, visible: boolean) => void;
}>({ stayFor: () => undefined, active: null, preview: () => {} });

export function CalendarDayButton(props: DayButtonProps) {
  const { stayFor, active, preview } = useContext(StayInspection);
  const date = props.day.date;
  const day = format(date, "yyyy-MM-dd");
  const stay = stayFor(day);
  if (!stay?.ownerName) return <DayButton {...props} />;
  const dates = stayDates(stay.startDate, stay.endDate);
  const column = (date.getDay() + 6) % 7; // French calendar starts on Monday.
  return <span className="calendar-stay-day" style={stayStyle(stay.ownerColorSlot)}
    data-edge={column < 2 ? "start" : column > 4 ? "end" : undefined}
    onPointerEnter={e => { if (e.pointerType === "mouse") preview(day, true); }}
    onPointerLeave={e => { if (e.pointerType === "mouse") preview(day, false); }}
    onFocus={e => { if (e.target.matches(":focus-visible")) preview(day, true); }}
    onBlur={() => preview(day, false)}>
    <DayButton {...props} aria-expanded={active === day}
      aria-label={`${props["aria-label"]}. Réservé par ${stay.ownerName}. Séjour : ${dates}.`} />
    {active === day && <span aria-hidden="true" className="calendar-stay-tip">
      <span>Séjour confirmé</span><strong>{stay.ownerName}</strong><span>{dates}</span>
    </span>}
  </span>;
}
