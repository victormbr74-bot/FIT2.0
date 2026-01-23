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
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FieldValue,
  type Timestamp,
  type Unsubscribe
} from "firebase/firestore";
import {
  auth,
  firestore,
  isFirebaseConfigured
} from "../services/firebase";
import { ensureCurrentWeek } from "../services/weekService";

type FirestoreTimestamp = Timestamp | FieldValue | null;

export type UserProfile = {
  name: string;
  email: string;
  onboardingComplete: boolean;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goal?: "emagrecimento" | "hipertrofia" | "condicionamento";
  workoutsPerWeek?: number;
  muscleGroups?: string[];
  level?: "iniciante" | "intermediario" | "avancado";
  youtubePlaylistUrl?: string;
  diet?: {
    currentPdfUrl?: string;
    updatedAt?: FirestoreTimestamp;
    manual?: {
      notes?: string;
      meals?: string[];
      updatedAt?: FirestoreTimestamp;
    };
  };
  stats?: {
    lastWeekId?: string;
    pointsThisWeek?: number;
    totalPoints?: number;
  };
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

    let profileUnsubscribe: Unsubscribe | undefined;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      setUser(firebaseUser);

      if (!firebaseUser || !firestore) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const profileRef = doc(firestore, "users", firebaseUser.uid);
      profileUnsubscribe = onSnapshot(
        profileRef,
        (snapshot) => {
          setProfile(
            snapshot.exists()
              ? (snapshot.data() as UserProfile)
              : null
          );
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && profile?.onboardingComplete && firestore) {
      ensureCurrentWeek(user.uid, profile).catch(() => {
        /* fail silently; hook will show error if needed */
      });
    }
  }, [user, profile?.onboardingComplete]);

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
