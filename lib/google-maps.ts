"use client";

let googleMapsPromise: Promise<typeof google> | null = null;
let googleMapsAuthFailed = false;

declare global {
  interface Window {
    __cabGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

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
    return resolveLoadedGoogleMaps();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise<typeof google>((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script") as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google?.maps || existingScript.dataset.loaded === "true") {
        resolveLoadedGoogleMaps().then(resolve).catch(reject);
        return;
      }

      existingScript.addEventListener("load", () => resolveLoadedGoogleMaps().then(resolve).catch(reject), {
        once: true
      });
      existingScript.addEventListener("error", () =>
        reject(new GoogleMapsLoadError("Google Maps script failed to load.", "script-failed"))
      );
      return;
    }

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      googleMapsAuthFailed = true;
      previousAuthFailure?.();
      reject(new GoogleMapsLoadError("Google Maps script failed to load.", "script-failed"));
    };

    const script = document.createElement("script");
    window.__cabGoogleMapsReady = () => {
      script.dataset.loaded = "true";
      resolveLoadedGoogleMaps().then(resolve).catch(reject);
    };
    const params = new URLSearchParams({
      key,
      libraries: "places",
      callback: "__cabGoogleMapsReady",
      loading: "async"
    });

    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.setTimeout(() => {
        if (script.dataset.loaded !== "true") {
          resolveLoadedGoogleMaps().then(resolve).catch(reject);
        }
      }, 0);
    };
    script.onerror = () =>
      reject(new GoogleMapsLoadError("Google Maps script failed to load.", "script-failed"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

async function resolveLoadedGoogleMaps() {
  if (googleMapsAuthFailed) {
    throw new GoogleMapsLoadError("Google Maps authentication failed.", "script-failed");
  }

  if (!window.google?.maps) {
    throw new GoogleMapsLoadError("Google Maps did not initialize.", "script-failed");
  }

  try {
    if (typeof window.google.maps.importLibrary === "function") {
      await window.google.maps.importLibrary("maps");
      await window.google.maps.importLibrary("places");
    }
  } catch {
    throw new GoogleMapsLoadError("Google Maps libraries failed to load.", "places-unavailable");
  }

  if (!window.google.maps.places?.Autocomplete) {
    throw new GoogleMapsLoadError("Google Places library is unavailable.", "places-unavailable");
  }

  return window.google;
}
