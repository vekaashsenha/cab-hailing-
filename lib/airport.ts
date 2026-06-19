const AIRPORT_KEYWORDS = [
  "airport",
  "terminal",
  "igi",
  "indira gandhi",
  "domestic airport",
  "international airport"
];

const TERMINAL_PATTERN = /\bT[123]\b/i;

export function looksLikeAirportLocation(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return AIRPORT_KEYWORDS.some((keyword) => normalized.includes(keyword)) || TERMINAL_PATTERN.test(value);
}

export function hasAirportEndpoint(pickup: string, dropoff: string) {
  return looksLikeAirportLocation(pickup) || looksLikeAirportLocation(dropoff);
}
