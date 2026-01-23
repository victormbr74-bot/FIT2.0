import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography
} from "@mui/material";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";

export function HomePage() {
  const { profile } = useAuth();
  const { week, loading, error } = useWeeklyPlan();

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

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} Verifique as regras do Firestore (userWeeks e users/
          {"{uid}"}).
        </Alert>
      )}
      <Typography variant="h4" gutterBottom>
        SouFIT
      </Typography>
      <Grid container spacing={3}>
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
