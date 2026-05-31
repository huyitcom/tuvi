import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  getDocs, 
  getDocFromServer,
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Database ID (Critical step)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Global strict Firebase error handler
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection function on startup
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}

export interface DivinationData {
  gender: "Nam" | "Nữ";
  day: string;
  month: string;
  year: string;
  calendar: "Dương lịch" | "Âm lịch";
  hour: string;
  minute: string;
  zodiacName: string;
  hasPortrait: boolean;
  isPremium: boolean;
}

// Generate a clean alphanumeric ID to bypass any poisoning/malicious patterns
function generateCleanId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "div_";
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Save Divination Input to Firestore
export async function saveDivination(data: DivinationData): Promise<string> {
  const divinationId = generateCleanId();
  const path = `divinations/${divinationId}`;
  
  try {
    const docRef = doc(db, "divinations", divinationId);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return divinationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// Retrieve Recent Divinations to build Statistics
export async function getRecentDivinations() {
  const path = "divinations";
  try {
    const q = query(
      collection(db, "divinations"),
      orderBy("createdAt", "desc"),
      limit(150)
    );
    const querySnapshot = await getDocs(q);
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        gender: d.gender,
        day: d.day,
        month: d.month,
        year: d.year,
        calendar: d.calendar,
        hour: d.hour,
        minute: d.minute,
        zodiacName: d.zodiacName,
        hasPortrait: d.hasPortrait,
        isPremium: d.isPremium,
        createdAt: d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : new Date()
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}

// Update Divination Premium Status to allow smooth transition after dâng lễ payment
export async function updatePremiumStatus(divinationId: string): Promise<void> {
  const path = `divinations/${divinationId}`;
  try {
    const docRef = doc(db, "divinations", divinationId);
    const snapshot = await getDocFromServer(docRef);
    if (snapshot.exists()) {
      const d = snapshot.data();
      await setDoc(docRef, {
        ...d,
        isPremium: true
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
