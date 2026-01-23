import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../services/firebase";
import {
  LegacyProgressEntry,
  MeasurementEntry,
  normalizeMeasurementEntry
} from "../services/progressService";

export function useProgressEntries() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([]);
  const [legacyEntries, setLegacyEntries] = useState<LegacyProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      setMeasurements([]);
      setLegacyEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const measurementsRef = collection(firestore, "users", user.uid, "measurements");
    const legacyRef = collection(firestore, "users", user.uid, "progress");

    const unsubscribeMeasurements = onSnapshot(measurementsRef, (snapshot) => {
      const data = snapshot.docs
        .map((docSnapshot) => normalizeMeasurementEntry(docSnapshot.data()))
        .filter((entry): entry is MeasurementEntry => Boolean(entry))
        .sort((a, b) => a.date.localeCompare(b.date));
      setMeasurements(data);
      setLoading(false);
    });

    const unsubscribeLegacy = onSnapshot(legacyRef, (snapshot) => {
      const data = snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as LegacyProgressEntry)
        .filter((entry) => entry.date && !Number.isNaN(Number(entry.weightKg)))
        .sort((a, b) => a.date.localeCompare(b.date));
      setLegacyEntries(data);
      setLoading(false);
    });

    return () => {
      unsubscribeMeasurements();
      unsubscribeLegacy();
    };
  }, [user]);

  const entries = useMemo(() => {
    const merged = [...measurements];
    const existingDates = new Set(merged.map((entry) => entry.date));
    legacyEntries.forEach((legacy) => {
      if (!existingDates.has(legacy.date)) {
        merged.push({
          date: legacy.date,
          dateISO: legacy.date,
          weightKg: legacy.weightKg
        });
      }
    });
    return merged.sort((a, b) => a.date.localeCompare(b.date));
  }, [legacyEntries, measurements]);

  return { entries, loading };
}
