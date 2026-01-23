import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertColor,
  Box,
  Button,
  Chip,
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

const formatWeekDayLabel = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit"
  }).format(date);
};

const formatFullDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
};

type DayStatus = "past" | "today" | "future";

const dayStatusLabels: Record<DayStatus, string> = {
  past: "Passado",
  today: "Hoje",
  future: "Futuro"
};

const getDayStatus = (value: string, today: string): DayStatus => {
  if (value === today) {
    return "today";
  }
  return value < today ? "past" : "future";
};

const extractPlaylistEmbedUrl = (value?: string) => {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    const list = url.searchParams.get("list");
    if (list) {
      return `https://www.youtube.com/embed/videoseries?list=${list}`;
    }
    if (url.pathname.includes("/embed/videoseries")) {
      return url.toString();
    }
  } catch {
    const match = value.match(/(?:list=)([^&/]+)/);
    if (match) {
      return `https://www.youtube.com/embed/videoseries?list=${match[1]}`;
    }
  }
  if (value.includes("youtube.com/embed") && value.includes("list=")) {
    return value;
  }
  return null;
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
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(null);
  const [showPlaylistPlayer, setShowPlaylistPlayer] = useState(false);

  const { week, loading } = useWeeklyPlan();
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState(today);
  const playlistUrl = profile?.youtubePlaylistUrl?.trim();
  const playlistEmbedUrl = useMemo(() => extractPlaylistEmbedUrl(playlistUrl), [playlistUrl]);

  useEffect(() => {
    if (!week?.workouts?.days?.length) {
      return;
    }
    const hasToday = week.workouts.days.some((dayEntry) => dayEntry.date === today);
    if (hasToday && selectedDate !== today) {
      setSelectedDate(today);
      return;
    }
    if (week.workouts.days.every((dayEntry) => dayEntry.date !== selectedDate)) {
      setSelectedDate(week.workouts.days[0].date);
    }
  }, [week, today, selectedDate]);

  const selectedDayIndex =
    week?.workouts?.days.findIndex((dayEntry) => dayEntry.date === selectedDate) ?? -1;
  const fallbackDay = week?.workouts?.days[0] ?? null;
  const activeDay = selectedDayIndex >= 0 ? week?.workouts?.days[selectedDayIndex] : fallbackDay;
  const activeDayStatus = activeDay ? getDayStatus(activeDay.date, today) : "future";
  const canEditToday = Boolean(activeDay && activeDay.date === today);

  useEffect(() => {
    if (!activeDay || activeDay.items.length === 0) {
      setReplaceIndex(0);
      return;
    }
    setReplaceIndex((prev) => (prev >= activeDay.items.length ? 0 : prev));
  }, [activeDay?.items.length]);

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

  const handleOpenCustomization = () => {
    if (!canEditToday) {
      setSnackbar({
        severity: "info",
        message: "Somente o treino do dia atual pode ser editado."
      });
      return;
    }
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!canEditToday) {
      setDialogOpen(false);
    }
  }, [canEditToday]);

  const handleToggle = async (itemIndex: number) => {
    if (!week || !activeDay || selectedDayIndex < 0 || !user || !firestore) {
      return;
    }
    if (!canEditToday) {
      setSnackbar({
        severity: "warning",
        message: "Você só pode marcar o treino no dia atual."
      });
      return;
    }

    const weekRef = doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`);
    const updatedDays = week.workouts.days.map((dayEntry, index) =>
      index === selectedDayIndex
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
    if (!week || !activeDay || selectedDayIndex < 0 || !user || !firestore) {
      return;
    }
    if (!canEditToday) {
      setSnackbar({
        severity: "warning",
        message: "Somente o treino do dia atual pode ser concluído."
      });
      return;
    }
    if (!activeDay.items.every((item) => item.done)) {
      setError("Marque todos os exercícios antes de concluir o dia.");
      return;
    }
    if (activeDay.completed) {
      return;
    }

    const weekRef = doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`);
    const userRef = doc(firestore, "users", user.uid);

    const updatedDays = week.workouts.days.map((dayEntry, index) =>
      index === selectedDayIndex ? { ...dayEntry, completed: true } : dayEntry
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
    if (!week || !activeDay || selectedDayIndex < 0 || !user || !firestore) {
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
      if (index !== selectedDayIndex) {
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
    if (!week || !activeDay || selectedDayIndex < 0 || !user || !firestore) {
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
      index === selectedDayIndex ? { ...dayEntry, items: [...dayEntry.items, newExercise] } : dayEntry
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

  if (!activeDay) {
    return (
      <Box px={{ xs: 2, md: 4 }} py={4}>
        <Alert severity="info">Nenhum treino programado para esta semana.</Alert>
      </Box>
    );
  }

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Treino de {formatFullDate(activeDay.date)}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip
          label={`Status: ${dayStatusLabels[activeDayStatus]}`}
          color={activeDayStatus === "today" ? "secondary" : "default"}
          size="small"
        />
        {activeDay.completed && <Chip label="Treino concluído" color="success" size="small" />}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!canEditToday && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você pode visualizar o treino dos outros dias, mas somente o dia atual permite marcar como feito.
        </Alert>
      )}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {(week?.workouts?.days ?? []).map((dayEntry) => {
            const status = getDayStatus(dayEntry.date, today);
            const statusLabel = dayStatusLabels[status];
            const isSelected = dayEntry.date === selectedDate;
            return (
              <Button
                key={dayEntry.date}
                variant={isSelected ? "contained" : "outlined"}
                color={status === "today" ? "secondary" : "inherit"}
                size="small"
                onClick={() => setSelectedDate(dayEntry.date)}
                sx={{ textTransform: "none" }}
              >
                <Stack spacing={0}>
                  <Typography variant="subtitle2">{formatWeekDayLabel(dayEntry.date)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statusLabel}
                  </Typography>
                </Stack>
              </Button>
            );
          })}
        </Stack>
        {playlistUrl && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1">Playlist recomendada</Typography>
              <Typography variant="body2" color="text.secondary">
                Abra sua playlist favorita ou reproduza direto no app.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  component="a"
                  href={playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no YouTube
                </Button>
                {playlistEmbedUrl && (
                  <Button
                    variant="outlined"
                    onClick={() => setShowPlaylistPlayer((prev) => !prev)}
                  >
                    {showPlaylistPlayer ? "Ocultar player" : "Mostrar player"}
                  </Button>
                )}
              </Stack>
              {showPlaylistPlayer && playlistEmbedUrl && (
                <Box
                  component="iframe"
                  src={playlistEmbedUrl}
                  width="100%"
                  height={260}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  sx={{ borderRadius: 2, mt: 1 }}
                />
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      <Stack spacing={2}>
        {activeDay.items.length ? (
          activeDay.items.map((item, index) => (
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
                    disabled={saving || !canEditToday}
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
          ))
        ) : (
          <Alert severity="info">Sem exercícios programados para este dia.</Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="outlined"
            onClick={handleOpenCustomization}
            disabled={!activeDay.items.length || customizing || !canEditToday}
          >
            Trocar treino
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={saving || !canEditToday || activeDay.completed}
            onClick={handleCompleteDay}
          >
            {activeDay.completed ? "Treino concluído" : "Concluir treino do dia"}
          </Button>
        </Stack>
      </Stack>

      <Dialog
        open={dialogOpen && canEditToday}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
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
                  {activeDay.items.map((item, index) => (
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
                disabled={customizing || !activeDay.items.length}
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
              <Button variant="outlined" onClick={handleAddCustomExercise} disabled={customizing}>
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
