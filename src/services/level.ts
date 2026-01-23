const BASE_POINTS_PER_LEVEL = 100;
const POINTS_STEP = 50;
const LEVELS_PER_STEP = 10;

export type LevelInfo = {
  level: number;
  currentLevelProgress: number;
  nextLevelPoints: number;
};

export function getPointsToNextLevel(level: number) {
  const normalizedLevel = Math.max(1, Math.floor(level));
  const step = Math.floor((normalizedLevel - 1) / LEVELS_PER_STEP);
  return BASE_POINTS_PER_LEVEL + step * POINTS_STEP;
}

export function getLevelFromTotalPoints(totalPoints: number): LevelInfo {
  let remaining = Math.max(0, totalPoints);
  let level = 1;
  let nextLevelPoints = getPointsToNextLevel(level);

  while (remaining >= nextLevelPoints) {
    remaining -= nextLevelPoints;
    level += 1;
    nextLevelPoints = getPointsToNextLevel(level);
  }

  return {
    level,
    currentLevelProgress: remaining,
    nextLevelPoints
  };
}
