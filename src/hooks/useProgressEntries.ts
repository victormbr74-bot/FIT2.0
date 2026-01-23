import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../services/firebase";

export type ProgressEntry = {
  date: string;
  weightKg: number;
};

export function useProgressEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(firestore, "users", user.uid, "progress");
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as ProgressEntry)
        .sort((a, b) => a.date.localeCompare(b.date));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { entries, loading };
}
