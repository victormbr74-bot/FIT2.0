import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  useTheme
} from "@mui/material";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";
import { useProgressEntries } from "../hooks/useProgressEntries";
import { getLevelFromTotalPoints } from "../services/level";

export function HomePage() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { week, loading, error } = useWeeklyPlan();
  const { entries: progressEntries } = useProgressEntries();

  const completedWorkouts = useMemo(
    () => week?.workouts.days.filter((day) => day.completed).length ?? 0,
    [week]
  );

  const totalWorkoutDays = week?.workouts.days.length ?? 0;

  const completedDietDays = useMemo(
    () => week?.diet.days.filter((day) => day.completed).length ?? 0,
    [week]
  );

  const workoutProgress = totalWorkoutDays
    ? Math.round((completedWorkouts / totalWorkoutDays) * 100)
    : 0;

  const dietProgress = week?.diet.days.length
    ? Math.round((completedDietDays / week.diet.days.length) * 100)
    : 0;

  const points = profile?.stats?.pointsThisWeek ?? 0;

  const levelInfo = getLevelFromTotalPoints(profile?.stats?.totalPoints ?? 0);
  const nextLevelDelta = Math.max(levelInfo.nextLevelPoints - levelInfo.currentLevelProgress, 0);
  const levelProgressPercent = Math.min(
    Math.round(
      (levelInfo.currentLevelProgress / (levelInfo.nextLevelPoints || 1)) * 100
    ),
    100
  );

  const latestEntry = progressEntries[progressEntries.length - 1];
  const firstEntry = progressEntries[0];
  const weightDifference =
    latestEntry && firstEntry
      ? parseFloat((latestEntry.weightKg - firstEntry.weightKg).toFixed(1))
      : null;
  const diffLabel =
    weightDifference !== null ? `${weightDifference > 0 ? "+" : ""}${weightDifference.toFixed(1)} kg` : "---";
  const diffSubtitle =
    weightDifference === null
      ? "Registre dois pesos para ver a diferença."
      : weightDifference > 0
      ? "Peso em tendência de alta"
      : weightDifference < 0
      ? "Peso em tendência de queda"
      : "Peso estável";

  const sparkData = progressEntries.slice(-5);
  const sparkWeights = sparkData.map((entry) => entry.weightKg);
  const sparkMin = sparkWeights.length ? Math.min(...sparkWeights) : 0;
  const sparkMax = sparkWeights.length ? Math.max(...sparkWeights) : 0;
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkBars = sparkData.map((entry) => ({
    key: entry.date,
    height: 12 + ((entry.weightKg - sparkMin) / sparkRange) * 70
  }));

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} Verifique as regras do Firestore (userWeeks e users/
          {"{uid}"}).
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>
        Visão geral
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Progresso de peso
              </Typography>
              <Stack direction="row" spacing={2} alignItems="baseline">
                <Typography variant="h4">
                  {latestEntry ? `${latestEntry.weightKg} kg` : "---"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {diffLabel}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Diferença desde o primeiro registro: {diffLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {diffSubtitle}
              </Typography>
              {sparkBars.length ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="flex-end"
                  sx={{ height: 60, mt: 2 }}
                >
                  {sparkBars.map((bar) => (
                    <Box
                      key={bar.key}
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        background: `linear-gradient(180deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                        height: `${bar.height}%`
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Registre mais entradas para visualizar a tendência.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Treinos da semana
              </Typography>
              <Typography variant="h5">
                {completedWorkouts || 0}/{totalWorkoutDays || 0}
              </Typography>
              <LinearProgress value={workoutProgress} variant="determinate" />
              <Typography variant="caption">{workoutProgress}% concluído</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Pontos da semana
              </Typography>
              <Typography variant="h5">{points}</Typography>
              <LinearProgress
                value={Math.min(points, 100)}
                variant="determinate"
                color="success"
              />
              <Typography variant="caption">Ganhe pontos concluindo treinos e dieta</Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Nível atual</Typography>
                <Typography variant="h6">Nível {levelInfo.level}</Typography>
                <LinearProgress
                  value={levelProgressPercent}
                  variant="determinate"
                  color="secondary"
                />
                <Typography variant="caption" color="text.secondary">
                  Faltam {nextLevelDelta} pontos para o próximo nível
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Dieta acompanhada
              </Typography>
              <Typography variant="h5">
                {completedDietDays || 0}/{week?.diet.days.length ?? 0}
              </Typography>
              <LinearProgress value={dietProgress} variant="determinate" color="info" />
              <Typography variant="caption">{dietProgress}% da dieta diária</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Perfil
              </Typography>
              <Typography variant="body2">
                Objetivo: {profile?.goal ?? "---"}
              </Typography>
              <Typography variant="body2">
                Peso: {profile?.weightKg ? `${profile.weightKg} kg` : "---"}
              </Typography>
              <Typography variant="body2">
                Treinos/semana: {profile?.workoutsPerWeek ?? "---"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
