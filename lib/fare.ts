import type { CarOption, RideType, TripDraft } from "@/lib/booking";

export type DistanceSource = "maps" | "manual" | "missing";

export type FareBreakup = {
  rideType: RideType;
  serviceType: string;
  vehicleType: string;
  routeKm: number;
  billableKm: number;
  minimumKm: number;
  ratePerKm: number;
  baseFare: number;
  driverBata: number;
  nightCharge: number;
  totalFare: number;
  calendarDays: number;
  nights: number;
  distanceSource: DistanceSource;
  hasDistance: boolean;
  hasValidOutstationDates: boolean;
  canCalculateFare: boolean;
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
const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateFareBreakup(trip: TripDraft, car: CarOption): FareBreakup {
  const routeKm = getFareRouteKm(trip);
  const distanceSource = getDistanceSource(trip);
  const calendarDays = trip.rideType === "Outstation" ? getOutstationCalendarDays(trip) : 0;
  const nights = trip.rideType === "Outstation" ? getOutstationNights(trip) : 0;
  const minimumKm = trip.rideType === "Outstation" && calendarDays > 0
    ? OUTSTATION_MINIMUM_KM_PER_DAY * calendarDays
    : 0;
  const hasDistance = routeKm > 0;
  const hasValidOutstationDates = trip.rideType !== "Outstation" || calendarDays > 0;
  const canCalculateFare = hasDistance && hasValidOutstationDates;

  let billableKm = 0;
  let driverBata = 0;
  let nightCharge = 0;

  if (canCalculateFare) {
    if (trip.rideType === "Within City") {
      billableKm = roundKm(routeKm + WITHIN_CITY_BUFFER_KM);
    } else if (trip.rideType === "Outstation") {
      billableKm = roundKm(Math.max(routeKm, minimumKm));
      driverBata = DRIVER_BATA_PER_DAY * calendarDays;
      nightCharge = DRIVER_BATA_PER_NIGHT * nights;
    } else {
      billableKm = routeKm;
    }
  }

  const baseFare = Math.round(billableKm * car.ratePerKm);
  const totalFare = baseFare + driverBata + nightCharge;

  return {
    rideType: trip.rideType,
    serviceType: getServiceTypeLabel(trip.rideType),
    vehicleType: car.name,
    routeKm,
    billableKm,
    minimumKm,
    ratePerKm: car.ratePerKm,
    baseFare,
    driverBata,
    nightCharge,
    totalFare,
    calendarDays,
    nights,
    distanceSource,
    hasDistance,
    hasValidOutstationDates,
    canCalculateFare,
    note: getFareNote(trip.rideType)
  };
}

export function getFareBreakupRows(breakup: FareBreakup): FareRow[] {
  const rows: FareRow[] = [
    {
      label: "Service type",
      value: breakup.serviceType
    },
    {
      label: "Vehicle type",
      value: breakup.vehicleType
    }
  ];

  if (breakup.rideType === "Outstation") {
    rows.push(
      {
        label: "Calendar days",
        value: breakup.hasValidOutstationDates ? String(breakup.calendarDays) : "Return date needed"
      },
      {
        label: "Nights",
        value: breakup.hasValidOutstationDates ? String(breakup.nights) : "Return date needed"
      },
      {
        label: "Minimum KM",
        value: breakup.hasValidOutstationDates ? formatKm(breakup.minimumKm) : "Return date needed"
      }
    );
  }

  rows.push(
    {
      label: "Route KM",
      value: breakup.hasDistance ? `${formatKm(breakup.routeKm)} (${formatDistanceSource(breakup.distanceSource)})` : "Needed"
    },
    {
      label: "Billable KM",
      value: breakup.canCalculateFare ? formatKm(breakup.billableKm) : "Needed"
    },
    {
      label: "Rate per KM",
      value: `${formatCurrency(breakup.ratePerKm)} / KM`
    },
    {
      label: "Base fare",
      value: breakup.canCalculateFare ? formatCurrency(breakup.baseFare) : "Needed"
    }
  );

  if (breakup.rideType === "Outstation") {
    rows.push(
      {
        label: "Driver bata",
        value: breakup.canCalculateFare ? formatCurrency(breakup.driverBata) : "Needed"
      },
      {
        label: "Night charge",
        value: breakup.canCalculateFare ? formatCurrency(breakup.nightCharge) : "Needed"
      }
    );
  }

  rows.push(
    {
      label: "Total estimated fare",
      value: breakup.canCalculateFare ? formatCurrency(breakup.totalFare) : getMissingFareMessage(breakup),
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

export function getOutstationCalendarDays(trip: Pick<TripDraft, "date" | "returnDate" | "rideType">) {
  if (trip.rideType !== "Outstation") {
    return 0;
  }

  const pickupDate = parseInputDate(trip.date);
  const returnDate = parseInputDate(trip.returnDate);

  if (pickupDate === null || returnDate === null || returnDate < pickupDate) {
    return 0;
  }

  return Math.floor((returnDate - pickupDate) / DAY_MS) + 1;
}

export function getOutstationNights(trip: Pick<TripDraft, "date" | "returnDate" | "rideType">) {
  return Math.max(0, getOutstationCalendarDays(trip) - 1);
}

export function getOutstationMinimumKm(trip: Pick<TripDraft, "date" | "returnDate" | "rideType">) {
  const calendarDays = getOutstationCalendarDays(trip);
  return calendarDays > 0 ? OUTSTATION_MINIMUM_KM_PER_DAY * calendarDays : 0;
}

export function isReturnDateBeforePickup(pickupDateValue: string, returnDateValue: string) {
  const pickupDate = parseInputDate(pickupDateValue);
  const returnDate = parseInputDate(returnDateValue);

  return pickupDate !== null && returnDate !== null && returnDate < pickupDate;
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
    return "Toll, parking, state tax, permit, and extra charges extra.";
  }

  return "Toll and parking extra.";
}

export function getServiceTypeLabel(rideType: RideType) {
  return rideType === "Within City" ? "Hourly / Within City" : rideType;
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

function getMissingFareMessage(breakup: FareBreakup) {
  if (breakup.rideType === "Outstation" && !breakup.hasValidOutstationDates && !breakup.hasDistance) {
    return "Enter KM and return date";
  }

  if (breakup.rideType === "Outstation" && !breakup.hasValidOutstationDates) {
    return "Select return date";
  }

  return "Enter KM to calculate";
}

function parseInputDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}
