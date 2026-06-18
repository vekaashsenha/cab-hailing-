export type RideType = "Airport Transfer" | "Within City" | "Outstation";

export type DailyRentalPackageId = "4hr-40km" | "8hr-80km" | "12hr-120km";

export type DailyRentalPackage = {
  id: DailyRentalPackageId;
  label: string;
  hours: number;
  baseKm: number;
};

export type TripDraft = {
  pickup: string;
  dropoff: string;
  date: string;
  returnDate: string;
  time: string;
  rideType: RideType;
  dailyRentalPackageId: DailyRentalPackageId;
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
  representativeVehicle: string;
  tone: string;
};

export type PassengerDetails = {
  fullName: string;
  mobile: string;
  email: string;
  instruction: string;
};

export type PaymentOption = "Razorpay";
export type PaymentStatus = "pending" | "paid" | "failed";

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
  paymentStatus: PaymentStatus;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  paymentErrorReason: string;
  operationsEmailStatus?: OperationsEmailStatus;
};

const tripKey = "cabHailing.trip";
const carKey = "cabHailing.car";
const passengerKey = "cabHailing.passenger";
const bookingKey = "cabHailing.booking";

export const rideTypes: RideType[] = ["Airport Transfer", "Within City", "Outstation"];

export const dailyRentalPackages: DailyRentalPackage[] = [
  {
    id: "4hr-40km",
    label: "4 Hours / 40 KM",
    hours: 4,
    baseKm: 40
  },
  {
    id: "8hr-80km",
    label: "8 Hours / 80 KM",
    hours: 8,
    baseKm: 80
  },
  {
    id: "12hr-120km",
    label: "12 Hours / 120 KM",
    hours: 12,
    baseKm: 120
  }
];

export const defaultDailyRentalPackageId: DailyRentalPackageId = "4hr-40km";

export function getRideTypeLabel(rideType: RideType) {
  return rideType === "Within City" ? "Daily Rental / Within City" : rideType;
}

export const carOptions: CarOption[] = [
  {
    id: "sedan",
    name: "Sedan",
    seats: 4,
    luggage: 2,
    ratePerKm: 30,
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Honda_City_1.5_i-VTEC_V_%28VIII%2C_Facelift%29_%E2%80%93_f_22032025.jpg",
    representativeVehicle: "Representative vehicle: Honda City / Ciaz / Verna or similar",
    tone: "Reliable city and airport comfort"
  },
  {
    id: "mpv-suv",
    name: "MPV / SUV",
    seats: 6,
    luggage: 4,
    ratePerKm: 40,
    image: "https://static3.toyotabharat.com/images/news/2024/feb-22/press-release-main-01-800x514.webp",
    representativeVehicle: "Representative vehicle: Innova Hycross / XUV700 / BYD or similar",
    tone: "Family, group, and luggage friendly"
  },
  {
    id: "luxury-sedan",
    name: "Luxury Sedan",
    seats: 4,
    luggage: 3,
    ratePerKm: 60,
    image: "https://upload.wikimedia.org/wikipedia/commons/d/db/Mercedes_s-class_w223_black_%281%29.jpg",
    representativeVehicle: "Representative vehicle: Mercedes-Benz S-Class or similar",
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
  dailyRentalPackageId: defaultDailyRentalPackageId,
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

function removeJson(key: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
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
  const normalizedBooking = normalizeBooking(record);
  writeJson(bookingKey, {
    ...normalizedBooking,
    trip: normalizeTrip(normalizedBooking.trip),
    car: normalizeCar(normalizedBooking.car) ?? normalizedBooking.car,
    operationsEmailStatus: normalizeOperationsEmailStatus(normalizedBooking.operationsEmailStatus)
  });
}

export function getBooking() {
  const booking = readJson<Partial<BookingRecord>>(bookingKey);

  return booking ? normalizeBooking(booking) : null;
}

export function clearBookingDraft() {
  removeJson(tripKey);
  removeJson(carKey);
  removeJson(passengerKey);
}

export function createBookingId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBH-${stamp}-${suffix}`;
}

function normalizeBooking(record: Partial<BookingRecord>): BookingRecord {
  const car = normalizeCar(record.car ?? null) ?? normalizeCar({ id: record.car?.id });

  return {
    ...record,
    bookingId: typeof record.bookingId === "string" ? record.bookingId : "",
    trip: normalizeTrip(record.trip),
    car: car ?? carOptions[0],
    passenger: normalizePassenger(record.passenger),
    payment: "Razorpay",
    paymentStatus: normalizePaymentStatus(record.paymentStatus),
    razorpayPaymentId: typeof record.razorpayPaymentId === "string" ? record.razorpayPaymentId : "",
    razorpayOrderId: typeof record.razorpayOrderId === "string" ? record.razorpayOrderId : "",
    razorpaySignature: typeof record.razorpaySignature === "string" ? record.razorpaySignature : "",
    paymentErrorReason: typeof record.paymentErrorReason === "string" ? record.paymentErrorReason : "",
    operationsEmailStatus: normalizeOperationsEmailStatus(record.operationsEmailStatus)
  };
}

function normalizeTrip(trip: Partial<TripDraft> | undefined): TripDraft {
  const value = trip ?? {};

  return {
    pickup: typeof value.pickup === "string" ? value.pickup : "",
    dropoff: typeof value.dropoff === "string" ? value.dropoff : "",
    date: typeof value.date === "string" ? value.date : "",
    returnDate: typeof value.returnDate === "string" ? value.returnDate : "",
    time: typeof value.time === "string" ? value.time : "",
    rideType: isRideType(value.rideType) ? value.rideType : "Airport Transfer",
    dailyRentalPackageId: normalizeDailyRentalPackageId(value.dailyRentalPackageId),
    routeKm: normalizeNullableKm(value.routeKm),
    manualKm: normalizeNullableKm(value.manualKm)
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

function normalizePassenger(passenger: Partial<PassengerDetails> | undefined): PassengerDetails {
  return {
    fullName: typeof passenger?.fullName === "string" ? passenger.fullName : "",
    mobile: typeof passenger?.mobile === "string" ? passenger.mobile : "",
    email: typeof passenger?.email === "string" ? passenger.email : "",
    instruction: typeof passenger?.instruction === "string" ? passenger.instruction : ""
  };
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  return value === "paid" || value === "failed" ? value : "pending";
}

function isRideType(value: unknown): value is RideType {
  return value === "Airport Transfer" || value === "Within City" || value === "Outstation";
}

export function getDailyRentalPackage(id: unknown) {
  return dailyRentalPackages.find((option) => option.id === id) ?? dailyRentalPackages[0];
}

function normalizeDailyRentalPackageId(value: unknown): DailyRentalPackageId {
  return getDailyRentalPackage(value).id;
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
