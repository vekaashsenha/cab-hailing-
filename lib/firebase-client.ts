"use client";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type FirebaseCompatApp = unknown;

type FirebaseCompatAuth = {
  useDeviceLanguage?: () => void;
};

type FirebaseCompatNamespace = {
  apps?: FirebaseCompatApp[];
  initializeApp: (config: FirebaseClientConfig) => FirebaseCompatApp;
  app: () => FirebaseCompatApp;
  auth: (app?: FirebaseCompatApp) => FirebaseCompatAuth;
};

type FirebaseAuthPreparation = {
  ready: boolean;
  auth: FirebaseCompatAuth | null;
};

declare global {
  interface Window {
    firebase?: FirebaseCompatNamespace;
  }
}

const firebaseAppScriptUrl = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
const firebaseAuthScriptUrl = "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js";

export const firebaseClientConfig: FirebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""
};

let firebaseAuthPreparation: Promise<FirebaseAuthPreparation> | null = null;
const scriptLoads = new Map<string, Promise<void>>();

export function hasFirebaseClientConfig() {
  return Object.values(firebaseClientConfig).every((value) => value.trim().length > 0);
}

export function prepareFirebasePhoneAuth() {
  if (!firebaseAuthPreparation) {
    firebaseAuthPreparation = initializeFirebaseAuth();
  }

  return firebaseAuthPreparation;
}

async function initializeFirebaseAuth(): Promise<FirebaseAuthPreparation> {
  if (typeof window === "undefined" || !hasFirebaseClientConfig()) {
    return {
      ready: false,
      auth: null
    };
  }

  try {
    await loadFirebaseScript(firebaseAppScriptUrl);
    await loadFirebaseScript(firebaseAuthScriptUrl);

    const firebase = window.firebase;

    if (!firebase?.initializeApp || !firebase.auth) {
      return {
        ready: false,
        auth: null
      };
    }

    const app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(firebaseClientConfig);
    const auth = firebase.auth(app);
    auth.useDeviceLanguage?.();

    // When mobile OTP is enabled, connect this Auth instance to Firebase Phone Auth here
    // with an invisible reCAPTCHA verifier and sign-in confirmation flow.
    return {
      ready: true,
      auth
    };
  } catch {
    return {
      ready: false,
      auth: null
    };
  }
}

function loadFirebaseScript(src: string) {
  if (scriptLoads.has(src)) {
    return scriptLoads.get(src) as Promise<void>;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = Array.from(document.scripts).find(
      (script) => script.src === src || script.dataset.firebaseSdk === src
    );

    if (existingScript?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Firebase SDK could not be loaded.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.firebaseSdk = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Firebase SDK could not be loaded."));
    document.head.appendChild(script);
  });

  scriptLoads.set(src, promise);
  return promise;
}
