/**
 * Firebase Client Initialization & Status Service (Phase 1 Preparation)
 * 
 * Provides an explicit state machine for Firebase integration.
 * In Phase 1, this service remains in an explicit UNCONFIGURED state until
 * real credentials are provided in .env.local.
 * 
 * Safeguards:
 * - Never returns fake mocks or deceptive simulated users.
 * - Gracefully reports configuration readiness without crashing the app.
 * - Existing localStorage voucher operations remain 100% decoupled and active.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import type { FirebaseStatusInfo, FirebaseIntegrationStatus } from '../types/firebase';

const REQUIRED_CONFIG_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Validates whether environment variables are set with non-placeholder values.
 */
export function checkFirebaseConfiguration(): FirebaseStatusInfo {
  const missingKeys: string[] = [];

  for (const key of REQUIRED_CONFIG_KEYS) {
    const value = import.meta.env[key];
    if (
      !value ||
      typeof value !== 'string' ||
      value.trim() === '' ||
      value.includes('Placeholder') ||
      value.includes('your-project-id') ||
      value.includes('000000000000')
    ) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    return {
      status: 'UNCONFIGURED',
      isConfigured: false,
      message: `Firebase is unconfigured. Missing or placeholder keys: ${missingKeys.join(', ')}. The application is running in standalone local mode.`,
      missingKeys,
    };
  }

  return {
    status: 'READY',
    isConfigured: true,
    message: 'Firebase configuration is present and valid.',
    missingKeys: [],
  };
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let cachedStatus: FirebaseStatusInfo | null = null;

/**
 * Returns current Firebase status without throwing exceptions.
 */
export function getFirebaseStatus(): FirebaseStatusInfo {
  if (!cachedStatus) {
    cachedStatus = checkFirebaseConfiguration();
  }
  return cachedStatus;
}

/**
 * Safely initializes Firebase only when valid, non-placeholder credentials exist.
 * Returns null references if unconfigured, allowing the caller to branch safely.
 */
export function initializeFirebaseSafely(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  status: FirebaseStatusInfo;
} {
  const status = getFirebaseStatus();

  if (!status.isConfigured) {
    return {
      app: null,
      auth: null,
      db: null,
      status,
    };
  }

  try {
    if (!firebaseApp && getApps().length === 0) {
      firebaseApp = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      });

      firebaseAuth = getAuth(firebaseApp);

      // Initialize Firestore with multi-tab offline IndexedDB persistence
      firestoreDb = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      db: firestoreDb,
      status: {
        status: 'READY',
        isConfigured: true,
        message: 'Firebase initialized successfully with offline persistence.',
        missingKeys: [],
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStatus: FirebaseStatusInfo = {
      status: 'INITIALIZATION_ERROR',
      isConfigured: false,
      message: `Failed to initialize Firebase: ${errorMsg}`,
      missingKeys: [],
    };
    cachedStatus = errorStatus;

    return {
      app: null,
      auth: null,
      db: null,
      status: errorStatus,
    };
  }
}
