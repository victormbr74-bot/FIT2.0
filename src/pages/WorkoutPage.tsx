import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getWeekId } from "../utils/week";
import { firestore } from "../services/firebase";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";

export function WorkoutPage() {
  const { user } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { week, loading } = useWeeklyPlan();

  const today = new Date().toISOString().split("T")[0];
  const dayIndex = week?.workouts?.days.findIndex((day) => day.date === today) ?? -1;
  const day = dayIndex >= 0 ? week?.workouts?.days[dayIndex] : null;

  const handleToggle = async (itemIndex: number) => {
    if (!week || !day || !user || !firestore) {
      return;
    }

    const weekRef = doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`);
    const updatedDays = week.workouts.days.map((dayEntry, index) =>
      index === dayIndex
        ? {
            ...dayEntry,
            items: dayEntry.items.map((item, itemIdx) =>
              itemIdx === itemIndex ? { ...item, done: !item.done } : item
            )
          }
        : dayEntry
    );

    setSaving(true);
    setError(null);

    try {
      await setDoc(weekRef, { workouts: { days: updatedDays } }, { merge: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível atualizar o treino."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteDay = async () => {
    if (!week || !day || !user || !firestore) {
      return;
    }

    if (!day.items.every((item) => item.done)) {
      setError("Marque todos os exercícios antes de concluir o dia.");
      return;
    }

    if (day.completed) {
      return;
    }

    const weekRef = doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`);
    const userRef = doc(firestore, "users", user.uid);

    const updatedDays = week.workouts.days.map((dayEntry, index) =>
      index === dayIndex ? { ...dayEntry, completed: true } : dayEntry
    );

    setSaving(true);
    setError(null);

    try {
      await updateDoc(weekRef, {
        workouts: { days: updatedDays },
        points: increment(10)
      });
      await updateDoc(userRef, {
        "stats.pointsThisWeek": increment(10),
        "stats.totalPoints": increment(10)
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o treino do dia."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (!day) {
    return (
      <Box px={{ xs: 2, md: 4 }} py={4}>
        <Alert severity="info">
          Não há treino programado para hoje. Volte na próxima sessão!
        </Alert>
      </Box>
    );
  }

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Treino de {day.date}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        {day.items.map((item, index) => (
          <Paper key={item.name} elevation={3} sx={{ p: 2 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs>
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Dicas:
                </Typography>
                <ul>
                  {item.tips.map((tip) => (
                    <li key={tip}>
                      <Typography variant="caption">{tip}</Typography>
                    </li>
                  ))}
                </ul>
              </Grid>
              <Grid item>
                <Checkbox
                  checked={item.done}
                  onChange={() => handleToggle(index)}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12}>
                <Accordion
                  expanded={expandedItem === `${index}`}
                  onChange={() =>
                    setExpandedItem((prev) => (prev === `${index}` ? null : `${index}`))
                  }
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Ver como fazer</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {item.media?.type === "gif" && (
                      <Box component="img" src={item.media.url} width="100%" alt={item.name} />
                    )}
                    {item.media?.type === "youtube" && expandedItem === `${index}` && (
                      <Box
                        component="iframe"
                        width="100%"
                        height={250}
                        src={item.media.url}
                        title={item.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        loading="lazy"
                      />
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Button
          variant="contained"
          color="primary"
          disabled={saving || day.completed}
          onClick={handleCompleteDay}
        >
          {day.completed ? "Treino concluído" : "Concluir treino do dia"}
        </Button>
      </Stack>
    </Box>
  );
}
