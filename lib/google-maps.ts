"use client";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const GOOGLE_MAPS_CALLBACK = "__cabGoogleMapsReady";

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

export type GoogleMapsDebugState = {
  envKeyPresent: boolean;
  scriptLoaded: boolean;
  placesLibraryLoaded: boolean;
  pickupAutocompleteAttached: boolean;
  dropAutocompleteAttached: boolean;
  lastErrorMessage: string;
};

export class GoogleMapsLoadError extends Error {
  constructor(
    message: string,
    public readonly reason: GoogleMapsFailureReason
  ) {
    super(message);
    this.name = "GoogleMapsLoadError";
  }
}

const listeners = new Set<(state: GoogleMapsDebugState) => void>();

let debugState: GoogleMapsDebugState = {
  envKeyPresent: false,
  scriptLoaded: false,
  placesLibraryLoaded: false,
  pickupAutocompleteAttached: false,
  dropAutocompleteAttached: false,
  lastErrorMessage: ""
};

export function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function getGoogleMapsFailureReason(error: unknown): GoogleMapsFailureReason {
  return error instanceof GoogleMapsLoadError ? error.reason : "script-failed";
}

export function getGoogleMapsErrorMessage(error: unknown, fallback = "Location assistance is temporarily unavailable.") {
  return error instanceof Error ? error.message : fallback;
}

export function getGoogleMapsDebugState(): GoogleMapsDebugState {
  const scriptLoaded = typeof window !== "undefined" ? Boolean(window.google?.maps) : false;
  const placesLibraryLoaded =
    typeof window !== "undefined" ? Boolean(window.google?.maps?.places?.Autocomplete) : false;

  return {
    ...debugState,
    envKeyPresent: Boolean(getGoogleMapsApiKey()),
    scriptLoaded: debugState.scriptLoaded || scriptLoaded,
    placesLibraryLoaded: debugState.placesLibraryLoaded || placesLibraryLoaded
  };
}

export function subscribeGoogleMapsDebug(listener: (state: GoogleMapsDebugState) => void) {
  listeners.add(listener);
  listener(getGoogleMapsDebugState());

  return () => {
    listeners.delete(listener);
  };
}

export function updateGoogleMapsDebugState(patch: Partial<GoogleMapsDebugState>) {
  debugState = {
    ...debugState,
    ...patch
  };

  const snapshot = getGoogleMapsDebugState();
  listeners.forEach((listener) => listener(snapshot));
}

export async function loadGoogleMaps() {
  if (typeof window === "undefined") {
    throw createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "script-failed");
  }

  const key = getGoogleMapsApiKey();
  updateGoogleMapsDebugState({
    envKeyPresent: Boolean(key),
    lastErrorMessage: ""
  });

  if (!key) {
    throw createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "key-missing");
  }

  if (window.google?.maps) {
    return resolveLoadedGoogleMaps();
  }

  if (!googleMapsPromise) {
    googleMapsPromise = injectGoogleMapsScript(key).catch((error: unknown) => {
      googleMapsPromise = null;
      throw error;
    });
  }

  return googleMapsPromise;
}

function injectGoogleMapsScript(key: string) {
  return new Promise<typeof google>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google?.maps || existingScript.dataset.loaded === "true") {
        resolveLoadedGoogleMaps().then(resolve).catch(reject);
        return;
      }

      existingScript.addEventListener("load", () => resolveLoadedGoogleMaps().then(resolve).catch(reject), {
        once: true
      });
      existingScript.addEventListener("error", () => {
        reject(createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "script-failed"));
      });
      return;
    }

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      googleMapsAuthFailed = true;
      previousAuthFailure?.();
      reject(
        createGoogleMapsLoadError(
          "Location assistance is temporarily unavailable.",
          "script-failed"
        )
      );
    };

    const script = document.createElement("script");
    window[GOOGLE_MAPS_CALLBACK] = () => {
      script.dataset.loaded = "true";
      updateGoogleMapsDebugState({ scriptLoaded: true });
      resolveLoadedGoogleMaps().then(resolve).catch(reject);
    };

    const params = new URLSearchParams({
      key,
      libraries: "places",
      callback: GOOGLE_MAPS_CALLBACK,
      loading: "async"
    });

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      reject(createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "script-failed"));
    };

    document.head.appendChild(script);
  });
}

async function resolveLoadedGoogleMaps() {
  if (googleMapsAuthFailed) {
    throw createGoogleMapsLoadError(
      "Location assistance is temporarily unavailable.",
      "script-failed"
    );
  }

  if (!window.google?.maps) {
    throw createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "script-failed");
  }

  updateGoogleMapsDebugState({ scriptLoaded: true });

  try {
    if (typeof window.google.maps.importLibrary === "function") {
      await window.google.maps.importLibrary("maps");
      await window.google.maps.importLibrary("places");
    }
  } catch {
    throw createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "places-unavailable");
  }

  if (!window.google.maps.places?.Autocomplete) {
    throw createGoogleMapsLoadError("Location assistance is temporarily unavailable.", "places-unavailable");
  }

  updateGoogleMapsDebugState({
    scriptLoaded: true,
    placesLibraryLoaded: true,
    lastErrorMessage: ""
  });

  return window.google;
}

function createGoogleMapsLoadError(message: string, reason: GoogleMapsFailureReason) {
  updateGoogleMapsDebugState({
    scriptLoaded: typeof window !== "undefined" ? Boolean(window.google?.maps) : false,
    placesLibraryLoaded: typeof window !== "undefined" ? Boolean(window.google?.maps?.places?.Autocomplete) : false,
    lastErrorMessage: message
  });

  return new GoogleMapsLoadError(message, reason);
}
