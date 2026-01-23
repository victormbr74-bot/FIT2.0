import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { generateWeeklyPlan, MediaInfo } from "./workoutGenerator";
import { getWeekId } from "../utils/week";

export type WeekDocument = {
  uid: string;
  weekId: string;
  points: number;
  workouts: {
    days: Array<{
      date: string;
      completed: boolean;
      items: Array<{
        name: string;
        done: boolean;
        media?: MediaInfo;
        tips?: string[];
      }>;
    }>;
  };
  diet: {
    days: Array<{ date: string; completed: boolean }>;
  };
};

export async function ensureCurrentWeek(userId: string, profile: Record<string, any>) {
  if (!firestore) {
    return null;
  }

  const weekId = getWeekId(new Date());
  const weekRef = doc(firestore, "userWeeks", `${userId}_${weekId}`);
  const userRef = doc(firestore, "users", userId);
  const weekSnapshot = await getDoc(weekRef);

  if (!weekSnapshot.exists()) {
    const plan = generateWeeklyPlan(profile);
    await setDoc(weekRef, {
      uid: userId,
      weekId,
      points: 0,
      workouts: plan.workouts,
      diet: plan.diet,
      createdAt: serverTimestamp()
    });
  }

  const userSnapshot = await getDoc(userRef);
  const stats = userSnapshot.data()?.stats ?? {};

  if (stats.lastWeekId !== weekId) {
    await setDoc(
      userRef,
      {
        stats: {
          ...stats,
          lastWeekId: weekId,
          pointsThisWeek: 0
        }
      },
      { merge: true }
    );
  }

  return (await getDoc(weekRef)).data() as WeekDocument;
}
