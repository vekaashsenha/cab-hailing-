let googleMapsPromise: Promise<typeof google> | null = null;
let googleMapsApiKeyPromise: Promise<string> | null = null;

export class MissingGoogleMapsApiKeyError extends Error {
  constructor() {
    super("Google Maps API key is missing.");
    this.name = "MissingGoogleMapsApiKeyError";
  }
}

export function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function isMissingGoogleMapsApiKeyError(error: unknown) {
  return error instanceof MissingGoogleMapsApiKeyError;
}

async function getRuntimeGoogleMapsApiKey() {
  if (googleMapsApiKeyPromise) {
    return googleMapsApiKeyPromise;
  }

  googleMapsApiKeyPromise = fetch("/api/google-maps-key", {
    cache: "no-store"
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Google Maps API key check failed.");
      }

      return response.json() as Promise<{ apiKey?: string }>;
    })
    .then((data) => data.apiKey?.trim() ?? "");

  return googleMapsApiKeyPromise;
}

async function resolveGoogleMapsApiKey() {
  const bundledKey = getGoogleMapsApiKey();

  if (bundledKey) {
    return bundledKey;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return getRuntimeGoogleMapsApiKey();
}

export async function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  const key = await resolveGoogleMapsApiKey();

  if (!key) {
    return Promise.reject(new MissingGoogleMapsApiKeyError());
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script") as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google));
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")));
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: "places",
      loading: "async"
    });

    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps did not initialize."));
      }
    };
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
