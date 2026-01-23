import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../services/firebase";
import { getWeekId } from "../utils/week";
import type { WeekDocument } from "../services/weekService";

export function useWeeklyPlan() {
  const { user } = useAuth();
  const [week, setWeek] = useState<WeekDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setWeek(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const weekId = getWeekId(new Date());
    const ref = doc(firestore, "userWeeks", `${user.uid}_${weekId}`);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setWeek(snapshot.exists() ? (snapshot.data() as WeekDocument) : null);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setWeek(null);
        setError(snapshotError.message || "Não foi possível carregar a semana.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  return { week, loading, error };
}
