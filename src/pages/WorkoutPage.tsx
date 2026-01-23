import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertColor,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getWeekId } from "../utils/week";
import { firestore } from "../services/firebase";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";
import { MediaInfo, WorkoutItem, exerciseLibrary } from "../services/workoutGenerator";
import { getLevelFromTotalPoints } from "../services/level";

const CUSTOM_TIPS = ["Mantenha o core firme", "Respire de forma controlada"];

const extractYouTubeId = (value: string) => {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1);
    }
    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId) {
        return videoId;
      }
      const parts = url.pathname.split("/").filter(Boolean);
      return parts.pop() ?? null;
    }
  } catch {
    const match = value.match(/(?:youtu\.be\/|v=)([^&/]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const buildMediaFromLink = (value: string): MediaInfo | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return {
      type: "youtube",
      url: `https://www.youtube.com/embed/${youtubeId}`
    };
  }

  if (trimmed.toLowerCase().includes(".gif")) {
    return {
      type: "gif",
      url: trimmed
    };
  }

  if (trimmed.includes("youtube.com/embed")) {
    return {
      type: "youtube",
      url: trimmed
    };
  }

  return {
    type: "gif",
    url: trimmed
  };
};

export function WorkoutPage() {
  const { user, profile } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState(0);
  const [selectedLibraryExercise, setSelectedLibraryExercise] = useState(
    exerciseLibrary[0]?.name ?? ""
  );
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseLink, setCustomExerciseLink] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(
    null
  );

  const { week, loading } = useWeeklyPlan();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const dayIndex = week?.workouts?.days.findIndex((day) => day.date === today) ?? -1;
  const day = dayIndex >= 0 ? week?.workouts?.days[dayIndex] : null;

  useEffect(() => {
    if (!day || day.items.length === 0) {
      setReplaceIndex(0);
      return;
    }
    setReplaceIndex((prev) => (prev >= day.items.length ? 0 : prev));
  }, [day?.items.length]);

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

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
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o treino.");
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

    const change = 10;
    const currentTotal = profile?.stats?.totalPoints ?? 0;
    const levelInfo = getLevelFromTotalPoints(currentTotal + change);
    setSaving(true);
    setError(null);

      try {
        await updateDoc(weekRef, {
          workouts: { days: updatedDays },
          points: increment(10)
        });
        await updateDoc(userRef, {
          "stats.pointsThisWeek": increment(10),
          "stats.totalPoints": increment(10),
          "stats.level": levelInfo.level
        });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível concluir o treino do dia."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceExercise = async () => {
    if (!week || !day || !user || !firestore) {
      return;
    }

    const libraryExercise = exerciseLibrary.find(
      (exercise) => exercise.name === selectedLibraryExercise
    );

    if (!libraryExercise) {
      setSnackbar({ severity: "error", message: "Selecione um exercício da biblioteca." });
      return;
    }

    const updatedDays = week.workouts.days.map((dayEntry, index) => {
      if (index !== dayIndex) {
        return dayEntry;
      }
      return {
        ...dayEntry,
        items: dayEntry.items.map((item, itemIdx) =>
          itemIdx === replaceIndex
            ? {
                name: libraryExercise.name,
                done: false,
                media: libraryExercise.media,
                tips: libraryExercise.tips.length ? libraryExercise.tips : CUSTOM_TIPS
              }
            : item
        )
      };
    });

    setCustomizing(true);
    setError(null);

    try {
      await setDoc(
        doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`),
        { workouts: { days: updatedDays } },
        { merge: true }
      );
      setSnackbar({ severity: "success", message: "Exercício substituído com sucesso." });
    } catch (err) {
      setSnackbar({
        severity: "error",
        message: err instanceof Error ? err.message : "Erro ao substituir o exercício."
      });
    } finally {
      setCustomizing(false);
    }
  };

  const handleAddCustomExercise = async () => {
    if (!week || !day || !user || !firestore) {
      return;
    }

    const name = customExerciseName.trim();
    if (!name) {
      setSnackbar({ severity: "error", message: "Informe um nome para o exercício." });
      return;
    }

    const media = buildMediaFromLink(customExerciseLink);
    const newExercise: WorkoutItem = {
      name,
      done: false,
      media,
      tips: CUSTOM_TIPS
    };

    const updatedDays = week.workouts.days.map((dayEntry, index) =>
      index === dayIndex ? { ...dayEntry, items: [...dayEntry.items, newExercise] } : dayEntry
    );

    setCustomizing(true);
    setError(null);

    try {
      await setDoc(
        doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`),
        { workouts: { days: updatedDays } },
        { merge: true }
      );
      setSnackbar({ severity: "success", message: "Exercício adicionado ao treino." });
      setCustomExerciseName("");
      setCustomExerciseLink("");
    } catch (err) {
      setSnackbar({
        severity: "error",
        message: err instanceof Error ? err.message : "Erro ao adicionar o exercício."
      });
    } finally {
      setCustomizing(false);
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
          <Paper key={`${item.name}-${index}`} elevation={3} sx={{ p: 2 }}>
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
                      <Box
                        component="img"
                        src={item.media.url}
                        width="100%"
                        alt={item.name}
                        sx={{ borderRadius: 2 }}
                      />
                    )}
                    {item.media?.type === "youtube" && expandedItem === `${index}` ? (
                      <Box
                        component="iframe"
                        width="100%"
                        height={260}
                        src={item.media.url}
                        title={item.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        loading="lazy"
                        sx={{ borderRadius: 2 }}
                      />
                    ) : null}
                    {!item.media && (
                      <Typography variant="body2" color="text.secondary">
                        Sem mídia disponível para este exercício.
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Paper>
        ))}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(true)}
            disabled={!day.items.length || customizing}
          >
            Trocar treino
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={saving || day.completed}
            onClick={handleCompleteDay}
          >
            {day.completed ? "Treino concluído" : "Concluir treino do dia"}
          </Button>
        </Stack>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Personalizar treino</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Substituir exercício</Typography>
              <FormControl fullWidth>
                <InputLabel id="current-exercise-label">Exercício atual</InputLabel>
                <Select
                  labelId="current-exercise-label"
                  label="Exercício atual"
                  value={replaceIndex}
                  onChange={(event) => setReplaceIndex(Number(event.target.value))}
                >
                  {day.items.map((item, index) => (
                    <MenuItem key={`${item.name}-${index}`} value={index}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="library-exercise-label">Exercício da biblioteca</InputLabel>
                <Select
                  labelId="library-exercise-label"
                  label="Exercício da biblioteca"
                  value={selectedLibraryExercise}
                  onChange={(event) => setSelectedLibraryExercise(event.target.value)}
                >
                  {exerciseLibrary.map((exercise) => (
                    <MenuItem key={exercise.name} value={exercise.name}>
                      {exercise.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleReplaceExercise}
                disabled={customizing || !day.items.length}
              >
                Substituir exercício
              </Button>
            </Stack>
            <Divider />
            <Stack spacing={2}>
              <Typography variant="subtitle1">Adicionar exercício próprio</Typography>
              <TextField
                label="Nome do exercício"
                value={customExerciseName}
                onChange={(event) => setCustomExerciseName(event.target.value)}
                required
              />
              <TextField
                label="Link do GIF/YouTube (opcional)"
                value={customExerciseLink}
                onChange={(event) => setCustomExerciseLink(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
              <Button
                variant="outlined"
                onClick={handleAddCustomExercise}
                disabled={customizing}
              >
                Adicionar exercício
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(snackbar)} autoHideDuration={4000} onClose={handleSnackbarClose}>
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
