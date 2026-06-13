let googleMapsPromise: Promise<typeof google> | null = null;

export type GoogleMapsFailureReason =
  | "key-missing"
  | "script-failed"
  | "places-unavailable";

export class GoogleMapsLoadError extends Error {
  constructor(
    message: string,
    public readonly reason: GoogleMapsFailureReason
  ) {
    super(message);
    this.name = "GoogleMapsLoadError";
  }
}

export function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function getGoogleMapsFailureReason(error: unknown): GoogleMapsFailureReason {
  return error instanceof GoogleMapsLoadError ? error.reason : "script-failed";
}

export async function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new GoogleMapsLoadError("Google Maps can only load in the browser.", "script-failed"));
  }

  const key = getGoogleMapsApiKey();

  if (!key) {
    return Promise.reject(new GoogleMapsLoadError("Google Maps API key is missing.", "key-missing"));
  }

  if (window.google?.maps) {
    if (!window.google.maps.places?.Autocomplete) {
      return Promise.reject(new GoogleMapsLoadError("Google Places library is unavailable.", "places-unavailable"));
    }

    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script") as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolveLoadedGoogleMaps(resolve, reject));
      existingScript.addEventListener("error", () =>
        reject(new GoogleMapsLoadError("Google Maps script failed to load.", "script-failed"))
      );
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
    script.onload = () => resolveLoadedGoogleMaps(resolve, reject);
    script.onerror = () =>
      reject(new GoogleMapsLoadError("Google Maps script failed to load.", "script-failed"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function resolveLoadedGoogleMaps(
  resolve: (googleApi: typeof google) => void,
  reject: (error: GoogleMapsLoadError) => void
) {
  if (!window.google?.maps) {
    reject(new GoogleMapsLoadError("Google Maps did not initialize.", "script-failed"));
    return;
  }

  if (!window.google.maps.places?.Autocomplete) {
    reject(new GoogleMapsLoadError("Google Places library is unavailable.", "places-unavailable"));
    return;
  }

  resolve(window.google);
}
