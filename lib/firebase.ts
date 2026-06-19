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

export type FirebaseConfirmationResult = {
  confirm: (code: string) => Promise<unknown>;
};

type FirebaseRecaptchaVerifier = {
  clear?: () => void;
  render?: () => Promise<number>;
};

type FirebaseCompatAuth = {
  useDeviceLanguage?: () => void;
  signInWithPhoneNumber: (
    phoneNumber: string,
    appVerifier: FirebaseRecaptchaVerifier
  ) => Promise<FirebaseConfirmationResult>;
};

type FirebaseRecaptchaParameters = {
  size: "invisible" | "normal";
  callback?: () => void;
  "expired-callback"?: () => void;
};

type FirebaseCompatAuthFactory = {
  (app?: FirebaseCompatApp): FirebaseCompatAuth;
  RecaptchaVerifier: new (
    containerOrId: string | HTMLElement,
    parameters: FirebaseRecaptchaParameters,
    auth?: FirebaseCompatAuth
  ) => FirebaseRecaptchaVerifier;
};

type FirebaseCompatNamespace = {
  apps?: FirebaseCompatApp[];
  initializeApp: (config: FirebaseClientConfig) => FirebaseCompatApp;
  app: () => FirebaseCompatApp;
  auth: FirebaseCompatAuthFactory;
};

export type FirebaseAuthDiagnostics = {
  apiKeyPresent: boolean;
  apiKeyStartsWithAIza: boolean;
  authDomainPresent: boolean;
  projectIdPresent: boolean;
  appIdPresent: boolean;
  authInitialized: boolean;
  lastAuthErrorCode: string;
};

declare global {
  interface Window {
    firebase?: FirebaseCompatNamespace;
  }
}

const firebaseAppScriptUrl = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js";
const firebaseAuthScriptUrl = "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js";

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""
};

let authPromise: Promise<FirebaseCompatAuth> | null = null;
let recaptchaVerifier: FirebaseRecaptchaVerifier | null = null;
const scriptLoads = new Map<string, Promise<void>>();
let firebaseAuthInitialized = false;
let lastFirebaseAuthErrorCode = "";

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every((value) => value.trim().length > 0);
}

export async function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = initializeFirebaseAuth();
  }

  try {
    return await authPromise;
  } catch (error) {
    authPromise = null;
    throw error;
  }
}

export async function signInWithPhoneNumber(phoneNumber: string, containerId: string) {
  try {
    const auth = await getFirebaseAuth();
    const verifier = getRecaptchaVerifier(auth, containerId);

    // This is the real Firebase Phone Auth entry point. OTP is optional in the
    // booking flow for now; once rollout is complete, gate payment on verification.
    const result = await auth.signInWithPhoneNumber(phoneNumber, verifier);
    lastFirebaseAuthErrorCode = "";
    return result;
  } catch (error) {
    recordFirebaseAuthError(error);
    throw error;
  }
}

export function resetRecaptchaVerifier() {
  recaptchaVerifier?.clear?.();
  recaptchaVerifier = null;
}

export function getFirebaseAuthDiagnostics(): FirebaseAuthDiagnostics {
  const apiKey = firebaseConfig.apiKey.trim();

  return {
    apiKeyPresent: apiKey.length > 0,
    apiKeyStartsWithAIza: apiKey.startsWith("AIza"),
    authDomainPresent: firebaseConfig.authDomain.trim().length > 0,
    projectIdPresent: firebaseConfig.projectId.trim().length > 0,
    appIdPresent: firebaseConfig.appId.trim().length > 0,
    authInitialized: firebaseAuthInitialized,
    lastAuthErrorCode: lastFirebaseAuthErrorCode
  };
}

export function recordFirebaseAuthError(error: unknown) {
  lastFirebaseAuthErrorCode = getFirebaseAuthErrorCode(error);
}

async function initializeFirebaseAuth() {
  if (typeof window === "undefined" || !hasFirebaseConfig()) {
    throw new Error("Firebase phone verification is not ready.");
  }

  await loadFirebaseScript(firebaseAppScriptUrl);
  await loadFirebaseScript(firebaseAuthScriptUrl);

  const firebase = window.firebase;

  if (!firebase?.initializeApp || !firebase.auth) {
    throw new Error("Firebase phone verification is not ready.");
  }

  const app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth(app);
  auth.useDeviceLanguage?.();
  firebaseAuthInitialized = true;

  return auth;
}

function getFirebaseAuthErrorCode(error: unknown) {
  if (isObject(error) && typeof error.code === "string") {
    return error.code.slice(0, 120);
  }

  return "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRecaptchaVerifier(auth: FirebaseCompatAuth, containerId: string) {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  const firebase = window.firebase;

  if (!firebase?.auth?.RecaptchaVerifier) {
    throw new Error("Firebase phone verification is not ready.");
  }

  // Invisible reCAPTCHA keeps the form compact. If it needs to be visible later,
  // change size to "normal" and keep the existing container below the mobile field.
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
    containerId,
    {
      size: "invisible",
      callback: () => undefined,
      "expired-callback": () => resetRecaptchaVerifier()
    },
    auth
  );

  return recaptchaVerifier;
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
      existingScript.addEventListener("error", () => reject(new Error("Firebase SDK could not load.")), {
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
    script.onerror = () => reject(new Error("Firebase SDK could not load."));
    document.head.appendChild(script);
  });

  scriptLoads.set(src, promise);
  return promise;
}
