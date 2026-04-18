import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | undefined;
let _adminDb: Firestore | undefined;
let _adminAuth: Auth | undefined;

function getApp(): App {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set"
    );
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  app = initializeApp({
    credential: cert(serviceAccount),
  });

  return app;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getApp());
  }
  return _adminDb;
}

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getApp());
  }
  return _adminAuth;
}
