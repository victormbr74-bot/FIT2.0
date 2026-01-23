import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { FieldValue, Timestamp } from "firebase/firestore";
import { firestore } from "./firebase";

export type MeasurementMetricKey =
  | 'weightKg'
  | 'waistCm'
  | 'chestCm'
  | 'hipCm'
  | 'armCm'
  | 'thighCm';

export type MeasurementOptionalKey = Exclude<MeasurementMetricKey, 'weightKg'>;

export type MeasurementEntry = {
  date: string;
  dateISO?: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  hipCm?: number;
  armCm?: number;
  thighCm?: number;
  createdAt?: FieldValue | Timestamp;
};

export type LegacyProgressEntry = {
  date: string;
  weightKg: number;
};

export const measurementMetricLabels: Record<MeasurementMetricKey, string> = {
  weightKg: 'Peso (kg)',
  waistCm: 'Cintura (cm)',
  chestCm: 'Peito (cm)',
  hipCm: 'Quadril (cm)',
  armCm: 'Braço (cm)',
  thighCm: 'Coxa (cm)'
};

export const measurementOptionalFields: Array<{ key: MeasurementOptionalKey; label: string }> = [
  { key: 'waistCm', label: 'Cintura (cm)' },
  { key: 'chestCm', label: 'Peito (cm)' },
  { key: 'hipCm', label: 'Quadril (cm)' },
  { key: 'armCm', label: 'Braço (cm)' },
  { key: 'thighCm', label: 'Coxa (cm)' }
];

export const measurementMetricOptions = (
  Object.keys(measurementMetricLabels) as MeasurementMetricKey[]
).map((key) => ({ value: key, label: measurementMetricLabels[key] }));

export function normalizeMeasurementEntry(source: Record<string, any>): MeasurementEntry | null {
  const date = source.date ?? source.dateISO;
  if (!date) {
    return null;
  }

  const weight = Number(source.weightKg);
  if (Number.isNaN(weight)) {
    return null;
  }

  const entry: MeasurementEntry = {
    date,
    dateISO: source.dateISO ?? date,
    weightKg: weight
  };

  measurementOptionalFields.forEach((field) => {
    const value = source[field.key];
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric > 0) {
      entry[field.key] = numeric;
    }
  });

  if (source.createdAt) {
    entry.createdAt = source.createdAt;
  }

  return entry;
}

type MeasurementProfileSnapshot = {
  weightKg?: number;
  createdAt?: FieldValue | Timestamp | null;
};

const toIsoDate = (value: FieldValue | Timestamp | null | undefined) => {
  const asDate = (() => {
    if (!value) {
      return new Date();
    }
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (typeof (value as any)?.toDate === "function") {
      return (value as any).toDate();
    }
    return new Date(String(value));
  })();

  return asDate.toISOString().split("T")[0];
};

export async function ensureInitialMeasurement(
  userId: string,
  profile?: MeasurementProfileSnapshot
) {
  if (!firestore || !userId || !profile?.weightKg) {
    return;
  }

  const dateId = toIsoDate(profile.createdAt);
  const measurementRef = doc(
    firestore,
    "users",
    userId,
    "measurements",
    dateId
  );

  const snapshot = await getDoc(measurementRef);
  if (snapshot.exists()) {
    return;
  }

  await setDoc(
    measurementRef,
    {
      date: dateId,
      dateISO: dateId,
      weightKg: profile.weightKg,
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}
