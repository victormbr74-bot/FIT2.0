import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type FieldValue,
  type Timestamp
} from "firebase/firestore";
import {
  auth,
  firestore,
  isFirebaseConfigured
} from "../services/firebase";

type FirestoreTimestamp = Timestamp | FieldValue | null;

export type UserProfile = {
  name: string;
  email: string;
  onboardingComplete: boolean;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<FirebaseUser>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) {
        return;
      }

      setUser(firebaseUser);

      if (!firebaseUser || !firestore) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const snapshot = await getDoc(doc(firestore, "users", firebaseUser.uid));

      if (!cancelled) {
        setProfile(
          snapshot.exists()
            ? (snapshot.data() as UserProfile)
            : null
        );
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const register = async (name: string, email: string, password: string) => {
    if (!isFirebaseConfigured || !auth || !firestore) {
      throw new Error("Firebase não está configurado.");
    }

    const credentials = await createUserWithEmailAndPassword(auth, email, password);

    const profileData: UserProfile = {
      name,
      email: credentials.user.email ?? email,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(firestore, "users", credentials.user.uid), profileData, {
      merge: true
    });

    setProfile(profileData);

    return credentials.user;
  };

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase não está configurado.");
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      register,
      login,
      logout
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
