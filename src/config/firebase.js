import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

let firebaseApp = null;

const initializeFirebase = () => {
  try {
    // Option 1: Using service account JSON string from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin SDK initialized from environment JSON");
        return;
      } catch (parseErr) {
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", parseErr.message);
        console.log("💡 Tip: Make sure JSON is properly escaped in .env file");
      }
    }
    
    // Option 2: Using service account file path
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        const filePath = resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        const serviceAccountFile = readFileSync(filePath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountFile);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin SDK initialized from file:", filePath);
        return;
      } catch (fileErr) {
        console.error("❌ Failed to load service account file:", fileErr.message);
      }
    }
    
    // Option 3: Try default location
    try {
      const defaultPath = resolve('./firebase-service-account.json');
      const serviceAccountFile = readFileSync(defaultPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountFile);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin SDK initialized from default location");
      return;
    } catch (defaultErr) {
      // Silent fail for default location
    }
    
    console.log("⚠️  Firebase credentials not configured - phone auth disabled");
    console.log("📝 Place 'firebase-service-account.json' in server/ directory");
    console.log("📝 OR set FIREBASE_SERVICE_ACCOUNT_PATH environment variable");
    console.log("📝 OR set FIREBASE_SERVICE_ACCOUNT_JSON environment variable");
  } catch (err) {
    console.error("❌ Firebase initialization failed:", err.message);
  }
};

initializeFirebase();

export const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    throw new Error(`Firebase token verification failed: ${err.message}`);
  }
};

export const isFirebaseEnabled = () => firebaseApp !== null;

export default firebaseApp;
