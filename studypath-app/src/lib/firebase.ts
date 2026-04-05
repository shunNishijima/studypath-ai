import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Admin ───
const ADMIN_EMAILS = ['syun136.616@gmail.com'];

export function isAdmin(email: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

// ─── User Data ───
export interface UserData {
  email: string;
  displayName: string;
  photoURL?: string;
  plan: 'free' | 'paid';
  planGenerations: number; // how many times plan has been generated
  createdAt: string;
  updatedAt: string;
}

/** Get or create user document in Firestore */
export async function getOrCreateUser(uid: string, email: string, displayName: string, photoURL?: string): Promise<UserData> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as UserData;
  }

  const userData: UserData = {
    email,
    displayName,
    photoURL: photoURL || '',
    plan: 'free',
    planGenerations: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, userData);
  return userData;
}

/** Increment plan generation count */
export async function incrementPlanGeneration(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as UserData;
    await updateDoc(ref, {
      planGenerations: data.planGenerations + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Update user plan status (admin only) */
export async function updateUserPlan(uid: string, plan: 'free' | 'paid'): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { plan, updatedAt: new Date().toISOString() });
}

/** Get all users (admin only) */
export async function getAllUsers(): Promise<(UserData & { uid: string })[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as UserData) }));
}

// ─── Free plan limits ───
export const FREE_PLAN_LIMITS = {
  maxPlanGenerations: 1,  // free users can generate 1 plan only
  canUseChat: false,       // free users cannot use AI chat
};

export function canGeneratePlan(userData: UserData): boolean {
  if (userData.plan === 'paid') return true;
  return userData.planGenerations < FREE_PLAN_LIMITS.maxPlanGenerations;
}
