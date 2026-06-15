import type { CarOption, RideType, TripDraft } from "@/lib/booking";

export type DistanceSource = "maps" | "manual" | "missing";

export type FareBreakup = {
  rideType: RideType;
  routeKm: number;
  billableKm: number;
  ratePerKm: number;
  baseFare: number;
  driverBata: number;
  totalFare: number;
  travelDays: number;
  travelNights: number;
  distanceSource: DistanceSource;
  hasDistance: boolean;
  note: string;
};

export type FareRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

const WITHIN_CITY_BUFFER_KM = 15;
const OUTSTATION_MINIMUM_KM_PER_DAY = 250;
const DRIVER_BATA_PER_DAY = 500;
const DRIVER_BATA_PER_NIGHT = 300;

export function calculateFareBreakup(trip: TripDraft, car: CarOption): FareBreakup {
  const routeKm = getFareRouteKm(trip);
  const distanceSource = getDistanceSource(trip);
  const travelDays = Math.max(1, Math.round(trip.travelDays || 1));
  const travelNights = Math.max(0, Math.round(trip.travelNights || 0));
  const hasDistance = routeKm > 0;

  let billableKm = 0;
  let driverBata = 0;

  if (hasDistance) {
    if (trip.rideType === "Within City") {
      billableKm = roundKm(routeKm + WITHIN_CITY_BUFFER_KM);
    } else if (trip.rideType === "Outstation") {
      billableKm = roundKm(Math.max(routeKm, OUTSTATION_MINIMUM_KM_PER_DAY * travelDays));
      driverBata = DRIVER_BATA_PER_DAY * travelDays + DRIVER_BATA_PER_NIGHT * travelNights;
    } else {
      billableKm = routeKm;
    }
  }

  const baseFare = Math.round(billableKm * car.ratePerKm);
  const totalFare = baseFare + driverBata;

  return {
    rideType: trip.rideType,
    routeKm,
    billableKm,
    ratePerKm: car.ratePerKm,
    baseFare,
    driverBata,
    totalFare,
    travelDays,
    travelNights,
    distanceSource,
    hasDistance,
    note: getFareNote(trip.rideType)
  };
}

export function getFareBreakupRows(breakup: FareBreakup): FareRow[] {
  const rows: FareRow[] = [
    {
      label: "Estimated route KM",
      value: breakup.hasDistance ? `${formatKm(breakup.routeKm)} (${formatDistanceSource(breakup.distanceSource)})` : "Needed"
    },
    {
      label: "Billable KM",
      value: breakup.hasDistance ? formatKm(breakup.billableKm) : "Needed"
    },
    {
      label: "Vehicle rate per KM",
      value: `${formatCurrency(breakup.ratePerKm)} / KM`
    },
    {
      label: "Base fare",
      value: breakup.hasDistance ? formatCurrency(breakup.baseFare) : "Needed"
    }
  ];

  if (breakup.rideType === "Outstation") {
    rows.splice(
      2,
      0,
      { label: "Travel days", value: String(breakup.travelDays) },
      { label: "Nights", value: String(breakup.travelNights) }
    );
    rows.push({
      label: "Driver bata",
      value: breakup.hasDistance ? formatCurrency(breakup.driverBata) : "Needed"
    });
  }

  rows.push(
    {
      label: "Total estimated fare",
      value: breakup.hasDistance ? formatCurrency(breakup.totalFare) : "Enter KM to calculate",
      emphasis: true
    },
    {
      label: "Note",
      value: breakup.note
    }
  );

  return rows;
}

export function getFareRouteKm(trip: TripDraft) {
  return roundKm(trip.routeKm ?? trip.manualKm ?? 0);
}

export function getTripDistanceSource(trip: TripDraft): DistanceSource {
  return getDistanceSource(trip);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatKm(value: number) {
  return `${roundKm(value).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(roundKm(value)) ? 0 : 1
  })} KM`;
}

export function roundKm(value: number) {
  return Math.round(Math.max(0, value) * 10) / 10;
}

export function getFareNote(rideType: RideType) {
  if (rideType === "Outstation") {
    return "Toll, parking, state tax, permit, and extra charges are extra if applicable.";
  }

  return "Toll and parking extra.";
}

export function formatDistanceSource(source: DistanceSource) {
  if (source === "maps") {
    return "Google Maps";
  }

  if (source === "manual") {
    return "Manual estimate";
  }

  return "Not available";
}

function getDistanceSource(trip: TripDraft): DistanceSource {
  if (trip.routeKm && trip.routeKm > 0) {
    return "maps";
  }

  if (trip.manualKm && trip.manualKm > 0) {
    return "manual";
  }

  return "missing";
}
