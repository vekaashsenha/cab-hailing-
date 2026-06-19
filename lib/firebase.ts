"use client";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type FirebaseCompatApp = {
  options?: Partial<FirebaseClientConfig>;
};

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
  maskedApiKey: string;
  authDomainPresent: boolean;
  authDomain: string;
  projectIdPresent: boolean;
  projectId: string;
  appIdPresent: boolean;
  browserDomain: string;
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
  const authDomain = firebaseConfig.authDomain.trim();
  const projectId = firebaseConfig.projectId.trim();

  return {
    apiKeyPresent: apiKey.length > 0,
    apiKeyStartsWithAIza: apiKey.startsWith("AIza"),
    maskedApiKey: maskApiKey(apiKey),
    authDomainPresent: authDomain.length > 0,
    authDomain: authDomain || "Missing",
    projectIdPresent: projectId.length > 0,
    projectId: projectId || "Missing",
    appIdPresent: firebaseConfig.appId.trim().length > 0,
    browserDomain: getBrowserDomain(),
    authInitialized: firebaseAuthInitialized,
    lastAuthErrorCode: lastFirebaseAuthErrorCode
  };
}

export function recordFirebaseAuthError(error: unknown) {
  lastFirebaseAuthErrorCode = getFirebaseAuthErrorCode(error);
}

async function initializeFirebaseAuth() {
  if (typeof window === "undefined" || !hasFirebaseConfig()) {
    throw createFirebaseAuthError("auth/config-missing", "Firebase phone verification is not ready.");
  }

  await loadFirebaseScript(firebaseAppScriptUrl);
  await loadFirebaseScript(firebaseAuthScriptUrl);

  const firebase = window.firebase;

  if (!firebase?.initializeApp || !firebase.auth) {
    throw createFirebaseAuthError("auth/sdk-unavailable", "Firebase phone verification is not ready.");
  }

  const app = getFirebaseApp(firebase);
  const auth = firebase.auth(app);
  auth.useDeviceLanguage?.();
  firebaseAuthInitialized = true;

  return auth;
}

function getFirebaseApp(firebase: FirebaseCompatNamespace) {
  const existingApp = firebase.apps?.[0];

  if (!existingApp) {
    return firebase.initializeApp(firebaseConfig);
  }

  const mismatch = getFirebaseConfigMismatch(existingApp.options);

  if (mismatch) {
    firebaseAuthInitialized = false;
    throw createFirebaseAuthError(
      "auth/config-mismatch",
      `Firebase is already initialized with a different ${mismatch}. Refresh the page before trying OTP again.`
    );
  }

  return existingApp;
}

function getFirebaseConfigMismatch(options: Partial<FirebaseClientConfig> | undefined) {
  if (!options) {
    return "app configuration";
  }

  const keys: Array<keyof FirebaseClientConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
  ];

  return keys.find((key) => normalizeConfigValue(options[key]) !== normalizeConfigValue(firebaseConfig[key])) ?? "";
}

function normalizeConfigValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createFirebaseAuthError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
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

function maskApiKey(value: string) {
  const apiKey = value.trim();

  if (!apiKey) {
    return "Missing";
  }

  if (apiKey.length <= 8) {
    return "Present but too short";
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function getBrowserDomain() {
  if (typeof window === "undefined") {
    return "Unavailable";
  }

  return window.location.hostname || "Unavailable";
}

function getRecaptchaVerifier(auth: FirebaseCompatAuth, containerId: string) {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  const firebase = window.firebase;

  if (!firebase?.auth?.RecaptchaVerifier) {
    throw createFirebaseAuthError("auth/recaptcha-unavailable", "Firebase phone verification is not ready.");
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
      existingScript.addEventListener("error", () => reject(createFirebaseAuthError("auth/sdk-load-failed", "Firebase SDK could not load.")), {
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
    script.onerror = () => reject(createFirebaseAuthError("auth/sdk-load-failed", "Firebase SDK could not load."));
    document.head.appendChild(script);
  });

  scriptLoads.set(src, promise);
  return promise;
}
