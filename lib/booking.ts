export type RideType = "Airport Transfer" | "Within City" | "Outstation";

export type TripDraft = {
  pickup: string;
  dropoff: string;
  date: string;
  returnDate: string;
  time: string;
  rideType: RideType;
  routeKm: number | null;
  manualKm: number | null;
};

export type CarOption = {
  id: string;
  name: string;
  seats: number;
  luggage: number;
  ratePerKm: number;
  image: string;
  tone: string;
};

export type PassengerDetails = {
  fullName: string;
  mobile: string;
  email: string;
  instruction: string;
};

export type PaymentOption = "Card" | "UPI" | "Pay Later";

export type OperationsEmailStatus = {
  attempted: boolean;
  sent: boolean;
  errorReason: string;
  resendId: string;
};

export type BookingRecord = {
  bookingId: string;
  trip: TripDraft;
  car: CarOption;
  passenger: PassengerDetails;
  payment: PaymentOption;
  operationsEmailStatus?: OperationsEmailStatus;
};

const tripKey = "cabHailing.trip";
const carKey = "cabHailing.car";
const passengerKey = "cabHailing.passenger";
const bookingKey = "cabHailing.booking";

export const rideTypes: RideType[] = ["Airport Transfer", "Within City", "Outstation"];

export function getRideTypeLabel(rideType: RideType) {
  return rideType === "Within City" ? "Hourly / Within City" : rideType;
}

export const carOptions: CarOption[] = [
  {
    id: "sedan",
    name: "Sedan",
    seats: 4,
    luggage: 2,
    ratePerKm: 30,
    image: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80",
    tone: "Reliable city and airport comfort"
  },
  {
    id: "mpv-suv",
    name: "MPV / SUV",
    seats: 6,
    luggage: 4,
    ratePerKm: 40,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
    tone: "Family, group, and luggage friendly"
  },
  {
    id: "luxury-sedan",
    name: "Luxury Sedan",
    seats: 4,
    luggage: 3,
    ratePerKm: 60,
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80",
    tone: "Mercedes, Audi, and executive class"
  }
];

export const emptyTrip: TripDraft = {
  pickup: "",
  dropoff: "",
  date: "",
  returnDate: "",
  time: "",
  rideType: "Airport Transfer",
  routeKm: null,
  manualKm: null
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getTrip() {
  const trip = readJson<Partial<TripDraft>>(tripKey);
  return trip ? normalizeTrip(trip) : null;
}

export function saveTrip(trip: TripDraft) {
  writeJson(tripKey, normalizeTrip(trip));
}

export function getSelectedCar() {
  const car = readJson<Partial<CarOption>>(carKey);
  return normalizeCar(car);
}

export function saveSelectedCar(car: CarOption) {
  writeJson(carKey, car);
}

export function getPassenger() {
  return readJson<PassengerDetails>(passengerKey);
}

export function savePassenger(passenger: PassengerDetails) {
  writeJson(passengerKey, passenger);
}

export function saveBooking(record: BookingRecord) {
  writeJson(bookingKey, {
    ...record,
    trip: normalizeTrip(record.trip),
    car: normalizeCar(record.car) ?? record.car,
    operationsEmailStatus: normalizeOperationsEmailStatus(record.operationsEmailStatus)
  });
}

export function getBooking() {
  const booking = readJson<BookingRecord>(bookingKey);

  if (!booking) {
    return null;
  }

  return {
    ...booking,
    trip: normalizeTrip(booking.trip),
    car: normalizeCar(booking.car) ?? booking.car,
    operationsEmailStatus: normalizeOperationsEmailStatus(booking.operationsEmailStatus)
  };
}

export function createBookingId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBH-${stamp}-${suffix}`;
}

function normalizeTrip(trip: Partial<TripDraft>): TripDraft {
  return {
    pickup: typeof trip.pickup === "string" ? trip.pickup : "",
    dropoff: typeof trip.dropoff === "string" ? trip.dropoff : "",
    date: typeof trip.date === "string" ? trip.date : "",
    returnDate: typeof trip.returnDate === "string" ? trip.returnDate : "",
    time: typeof trip.time === "string" ? trip.time : "",
    rideType: isRideType(trip.rideType) ? trip.rideType : "Airport Transfer",
    routeKm: normalizeNullableKm(trip.routeKm),
    manualKm: normalizeNullableKm(trip.manualKm)
  };
}

function normalizeCar(car: Partial<CarOption> | null) {
  if (!car?.id) {
    return null;
  }

  const legacyIdMap: Record<string, string> = {
    suv: "mpv-suv",
    "premium-suv": "mpv-suv",
    luxury: "luxury-sedan"
  };
  const id = legacyIdMap[car.id] ?? car.id;

  return carOptions.find((option) => option.id === id) ?? null;
}

function isRideType(value: unknown): value is RideType {
  return value === "Airport Transfer" || value === "Within City" || value === "Outstation";
}

function normalizeNullableKm(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeOperationsEmailStatus(value: unknown): OperationsEmailStatus | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  return {
    attempted: value.attempted === true,
    sent: value.sent === true,
    errorReason: typeof value.errorReason === "string" ? value.errorReason : "",
    resendId: typeof value.resendId === "string" ? value.resendId : ""
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
