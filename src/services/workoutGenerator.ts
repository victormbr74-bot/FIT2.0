import { getWeekDates } from "../utils/week";

export type MediaInfo = {
  type: "gif" | "youtube";
  url: string;
};

export type WorkoutItem = {
  name: string;
  done: boolean;
  media?: MediaInfo;
  tips: string[];
};

export type WorkoutDay = {
  date: string;
  completed: boolean;
  items: WorkoutItem[];
};

export type DietDay = {
  date: string;
  completed: boolean;
};

export type WeeklyPlanPayload = {
  workouts: {
    days: WorkoutDay[];
  };
  diet: {
    days: DietDay[];
  };
};

type ExerciseData = {
  name: string;
  tags: Array<"emagrecimento" | "hipertrofia" | "condicionamento">;
  media?: MediaInfo;
  tips: string[];
};

const basePath =
  (typeof import.meta !== "undefined" &&
    typeof import.meta.env !== "undefined" &&
    import.meta.env.BASE_URL) ||
  "/";
const normalizedBasePath = basePath.endsWith("/")
  ? basePath
  : `${basePath}/`;
const localGifFallback = `${normalizedBasePath}gifs/plank.gif`;

export const exerciseLibrary: ExerciseData[] = [
  {
    name: "Agachamento com peso do corpo",
    tags: ["emagrecimento", "hipertrofia", "condicionamento"],
    media: {
      type: "gif",
      url: localGifFallback
    },
    tips: ["Mantenha o tronco ereto", "Puxe o chão com os calcanhares"]
  },
  {
    name: "Prancha frontal",
    tags: ["emagrecimento", "condicionamento"],
    media: {
      type: "gif",
      url: localGifFallback
    },
    tips: ["Active o core", "Respire profundamente"]
  },
  {
    name: "Supino reto com halteres",
    tags: ["hipertrofia"],
    media: {
      type: "youtube",
      url: "https://www.youtube.com/embed/vthMCtgVtFw"
    },
    tips: ["Mantenha a lombar apoiada", "Expire ao subir"]
  },
  {
    name: "Remada unilateral",
    tags: ["hipertrofia", "condicionamento"],
    media: {
      type: "youtube",
      url: "https://www.youtube.com/embed/kBWAon7ItDw"
    },
    tips: ["Controle a descida", "Não eleve o ombro"]
  },
  {
    name: "Elevação de quadril",
    tags: ["emagrecimento", "hipertrofia"],
    media: {
      type: "gif",
      url: localGifFallback
    },
    tips: ["Aperte o glúteo no topo", "Mantenha o queixo levemente afastado"]
  },
  {
    name: "Polichinelo",
    tags: ["emagrecimento", "condicionamento"],
    media: {
      type: "youtube",
      url: "https://www.youtube.com/embed/c4DAnQ6DtF8"
    },
    tips: ["Aterrisse suavemente", "Mantenha ritmo constante"]
  }
];

const defaultTips = [
  "Respire controlando o movimento",
  "Mantenha o core ativo",
  "Evite movimentos bruscos"
];

function pickExercises(goal: string, count: number) {
  const preferred = exerciseLibrary.filter((exercise) =>
    exercise.tags.includes(goal as any)
  );

  const pool = preferred.length >= count ? preferred : exerciseLibrary;
  const selected: ExerciseData[] = [];

  while (selected.length < count && pool.length > 0) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
}

export function generateWeeklyPlan(profile: {
  goal?: string;
  workoutsPerWeek?: number;
  muscleGroups?: string[];
}) {
  const goal = profile.goal ?? "condicionamento";
  const workoutsPerWeek = profile.workoutsPerWeek ?? 3;

  const weekDates = getWeekDates();
  const selectedDays = weekDates.slice(0, workoutsPerWeek);

  const workouts = weekDates.map((date) => {
    const isWorkoutDay = selectedDays.some(
      (workoutDate) =>
        workoutDate.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
    );

    const items = isWorkoutDay
      ? pickExercises(goal, 3).map((exercise) => ({
          name: exercise.name,
          done: false,
          media: exercise.media,
          tips: exercise.tips.length ? exercise.tips : defaultTips
        }))
      : [];

    return {
      date: date.toISOString().split("T")[0],
      completed: false,
      items
    };
  });

  const dietDays = weekDates.map((date) => ({
    date: date.toISOString().split("T")[0],
    completed: false
  }));

  return {
    workouts: {
      days: workouts
    },
    diet: {
      days: dietDays
    }
  };
}
