export type RideType = "Airport Transfer" | "Within City" | "Outstation";

export type TripDraft = {
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  rideType: RideType;
};

export type CarOption = {
  id: string;
  name: string;
  seats: number;
  luggage: number;
  fare: number;
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

export type BookingRecord = {
  bookingId: string;
  trip: TripDraft;
  car: CarOption;
  passenger: PassengerDetails;
  payment: PaymentOption;
};

const tripKey = "cabHailing.trip";
const carKey = "cabHailing.car";
const passengerKey = "cabHailing.passenger";
const bookingKey = "cabHailing.booking";

export const rideTypes: RideType[] = ["Airport Transfer", "Within City", "Outstation"];

export const carOptions: CarOption[] = [
  {
    id: "sedan",
    name: "Sedan",
    seats: 4,
    luggage: 2,
    fare: 950,
    image: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80",
    tone: "Executive city comfort"
  },
  {
    id: "suv",
    name: "SUV",
    seats: 6,
    luggage: 4,
    fare: 1450,
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
    tone: "Family and luggage friendly"
  },
  {
    id: "premium-suv",
    name: "Premium SUV",
    seats: 6,
    luggage: 5,
    fare: 2200,
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80",
    tone: "Elevated business travel"
  },
  {
    id: "luxury",
    name: "Luxury",
    seats: 4,
    luggage: 3,
    fare: 3600,
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
    tone: "Flagship chauffeur cabin"
  }
];

export const emptyTrip: TripDraft = {
  pickup: "",
  dropoff: "",
  date: "",
  time: "",
  rideType: "Airport Transfer"
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
  return readJson<TripDraft>(tripKey);
}

export function saveTrip(trip: TripDraft) {
  writeJson(tripKey, trip);
}

export function getSelectedCar() {
  return readJson<CarOption>(carKey);
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
  writeJson(bookingKey, record);
}

export function getBooking() {
  return readJson<BookingRecord>(bookingKey);
}

export function createBookingId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CBH-${stamp}-${suffix}`;
}

export function formatFare(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function fareForRide(car: CarOption, rideType: RideType) {
  const multiplier = rideType === "Airport Transfer" ? 1 : rideType === "Within City" ? 1.15 : 1.75;
  return Math.round(car.fare * multiplier);
}
