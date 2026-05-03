import { and, eq, lte, gt } from "drizzle-orm";
import {
  db,
  pricingSeasonsTable,
  discountRulesTable,
  propertiesTable,
  type SeasonBreakdownEntry,
  type User,
} from "@workspace/db";
import { eachNight, diffNights } from "./dates";

export interface PriceComputation {
  nights: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedGroup: User["group"];
  seasonBreakdown: SeasonBreakdownEntry[];
}

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function calculateReservationPrice(args: {
  propertyId: string;
  startDate: string;
  endDate: string;
  guests?: number;
  user: User | null;
}): Promise<PriceComputation> {
  const { propertyId, startDate, endDate, guests, user } = args;

  const nights = diffNights(startDate, endDate);
  if (nights <= 0) {
    throw new PricingError("endDate must be after startDate");
  }

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, propertyId))
    .limit(1);
  if (!property) throw new PricingError("Property not found", 404);
  if (!property.isActive) throw new PricingError("Property is not bookable", 400);
  if (guests !== undefined && guests > property.maxGuests) {
    throw new PricingError(
      `This property accepts at most ${property.maxGuests} guests (received ${guests})`,
      400,
    );
  }
  if (guests !== undefined && guests < 1) {
    throw new PricingError("guests must be at least 1", 400);
  }

  const seasons = await db
    .select()
    .from(pricingSeasonsTable)
    .where(eq(pricingSeasonsTable.propertyId, propertyId));

  const rules = await db
    .select()
    .from(discountRulesTable)
    .where(eq(discountRulesTable.propertyId, propertyId));

  const group = user?.group ?? "public";
  const isVip = user?.isVip ?? false;

  type Bucket = { nights: number; basePricePerNight: number; effectivePricePerNight: number };
  const buckets = new Map<string, Bucket>();

  for (const night of eachNight(startDate, endDate)) {
    const season = seasons.find((s) => night >= s.startDate && night < s.endDate);
    if (!season) {
      throw new PricingError(
        `No pricing season covers ${night}. Please contact the owner.`,
        400,
      );
    }

    // Find best discount: prefer exact (group + requires_vip match), else fallback
    const candidates = rules.filter(
      (r) =>
        r.seasonName === season.seasonName &&
        r.applicableGroup === group &&
        (r.requiresVip ? isVip : true),
    );
    const best = candidates.reduce<typeof candidates[number] | undefined>(
      (acc, r) => (!acc || r.discountPercentage > acc.discountPercentage ? r : acc),
      undefined,
    );
    const discountPct = best?.discountPercentage ?? 0;
    const effective = Math.round(season.basePricePerNight * (100 - discountPct) / 100);

    const key = `${season.seasonName}|${season.basePricePerNight}|${effective}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.nights += 1;
    } else {
      buckets.set(key, {
        nights: 1,
        basePricePerNight: season.basePricePerNight,
        effectivePricePerNight: effective,
      });
    }
  }

  const breakdown: SeasonBreakdownEntry[] = [];
  let subtotal = 0;
  let total = 0;
  for (const [key, b] of buckets) {
    const seasonName = key.split("|")[0] as SeasonBreakdownEntry["seasonName"];
    const subt = b.basePricePerNight * b.nights;
    const tot = b.effectivePricePerNight * b.nights;
    subtotal += subt;
    total += tot;
    breakdown.push({
      seasonName,
      nights: b.nights,
      basePricePerNight: b.basePricePerNight,
      effectivePricePerNight: b.effectivePricePerNight,
      subtotal: subt,
    });
  }

  return {
    nights,
    subtotal,
    discountAmount: subtotal - total,
    total,
    appliedGroup: group,
    seasonBreakdown: breakdown,
  };
}
