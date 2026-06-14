"use client";

import { useEffect, useState } from "react";
import { getGoogleMapsDebugState, subscribeGoogleMapsDebug, type GoogleMapsDebugState } from "@/lib/google-maps";

export function GoogleMapsDebugPanel() {
  const [debug, setDebug] = useState<GoogleMapsDebugState>(() => getGoogleMapsDebugState());

  useEffect(() => subscribeGoogleMapsDebug(setDebug), []);

  const rows = [
    ["Env key present", debug.envKeyPresent],
    ["Script loaded", debug.scriptLoaded],
    ["Places library loaded", debug.placesLibraryLoaded],
    ["Pickup autocomplete attached", debug.pickupAutocompleteAttached],
    ["Drop autocomplete attached", debug.dropAutocompleteAttached]
  ] as const;

  return (
    <div className="mt-4 rounded border border-ink/10 bg-mist p-3 text-xs text-ink/70">
      <p className="font-semibold text-ink">Google Maps debug</p>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd className={value ? "font-semibold text-emerald-700" : "font-semibold text-ember"}>
              {value ? "Yes" : "No"}
            </dd>
          </div>
        ))}
        <div className="contents">
          <dt>Last error message</dt>
          <dd className="max-w-[220px] text-right font-semibold text-ink">
            {debug.lastErrorMessage || "None"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
