import {
  Alert,
  AlertColor,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  doc,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getWeekId } from "../utils/week";
import { firestore, storage } from "../services/firebase";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";
import { getLevelFromTotalPoints } from "../services/level";

type SnackState = {
  message: string;
  severity: AlertColor;
};

function parseTimestamp(value: unknown) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  return new Date(value as string);
}

const formatDate = (value: Date | null) => {
  if (!value) {
    return "Ainda não registrado";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(value);
};

export function DietPage() {
  const { user, profile } = useAuth();
  const { week, loading, error: weekError } = useWeeklyPlan();
  const [uploading, setUploading] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [meals, setMeals] = useState<string[]>([]);
  const [mealInput, setMealInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackState | null>(null);

  useEffect(() => {
    setManualNotes(profile?.diet?.manual?.notes ?? "");
    setMeals(profile?.diet?.manual?.meals ?? []);
  }, [profile?.diet?.manual]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayEntry = week?.diet.days.find((day) => day.date === today);
  const statusLabel = todayEntry?.completed ? "Concluída" : "Não concluída";
  const statusColor: "success" | "default" = todayEntry?.completed ? "success" : "default";
  const pdfUpdatedAt = parseTimestamp(profile?.diet?.updatedAt);
  const manualUpdatedAt = parseTimestamp(profile?.diet?.manual?.updatedAt);
  const lastUpdatedAt =
    manualUpdatedAt && (!pdfUpdatedAt || manualUpdatedAt > pdfUpdatedAt)
      ? manualUpdatedAt
      : pdfUpdatedAt;

  const handleUpload = async (file: File) => {
    if (!user || !storage || !firestore) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `users/${user.uid}/diet/current_${Date.now()}.pdf`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(firestore, "users", user.uid), {
        diet: {
          currentPdfUrl: url,
          updatedAt: serverTimestamp()
        }
      });
      setSnackbar({ severity: "success", message: "PDF enviado com sucesso." });
    } catch (err) {
      setSnackbar({
        severity: "error",
        message: err instanceof Error ? err.message : "Não foi possível enviar o PDF."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDietToggle = async (index: number) => {
    if (!user || !week?.diet.days || !firestore) {
      return;
    }

    const weekRef = doc(firestore, "userWeeks", `${user.uid}_${getWeekId(new Date())}`);
    const userRef = doc(firestore, "users", user.uid);

    const updatedDays = week.diet.days.map((day, idx) =>
      idx === index ? { ...day, completed: !day.completed } : day
    );

      const change = updatedDays[index].completed ? 5 : -5;
      const currentTotal = profile?.stats?.totalPoints ?? 0;
      const levelInfo = getLevelFromTotalPoints(Math.max(currentTotal + change, 0));

      try {
        await setDoc(weekRef, { diet: { days: updatedDays } }, { merge: true });
        await updateDoc(weekRef, { points: increment(change) });
        await updateDoc(userRef, {
          "stats.pointsThisWeek": increment(change),
          "stats.totalPoints": increment(change),
          "stats.level": levelInfo.level
        });
      } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível atualizar o checklist."
      );
    }
  };

  const handleAddMeal = () => {
    const normalized = mealInput.trim();
    if (!normalized) {
      return;
    }
    if (meals.includes(normalized)) {
      setSnackbar({ severity: "info", message: "Refeição já adicionada." });
      setMealInput("");
      return;
    }
    setMeals((prev) => [...prev, normalized]);
    setMealInput("");
  };

  const handleRemoveMeal = (meal: string) => {
    setMeals((prev) => prev.filter((item) => item !== meal));
  };

  const handleManualSave = async () => {
    if (!user || !firestore) {
      return;
    }

    setManualSaving(true);
    setError(null);

    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        "diet.manual": {
          notes: manualNotes.trim(),
          meals,
          updatedAt: serverTimestamp()
        }
      });
      setSnackbar({ severity: "success", message: "Dieta manual salva com sucesso." });
    } catch (err) {
      setSnackbar({
        severity: "error",
        message: err instanceof Error ? err.message : "Não foi possível salvar a dieta manual."
      });
    } finally {
      setManualSaving(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Dieta
      </Typography>
      {weekError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {weekError}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={3}>
        <Paper elevation={4} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Adicionar dieta</Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Atualizado em
                </Typography>
                <Typography variant="subtitle1">{formatDate(lastUpdatedAt)}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`Status do dia: ${statusLabel}`}
                  color={statusColor as "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                  size="small"
                />
              </Stack>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <Button
                variant="contained"
                component="label"
                disabled={uploading}
                sx={{ minWidth: 200 }}
              >
                {uploading ? "Enviando PDF..." : "Adicionar dieta"}
                <input
                  hidden
                  accept="application/pdf"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleUpload(file);
                    }
                  }}
                />
              </Button>
              {profile?.diet?.currentPdfUrl && (
                <Button
                  variant="outlined"
                  component="a"
                  href={profile.diet.currentPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver dieta atual
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={4} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Dieta manual</Typography>
            <TextField
              label="Observações"
              placeholder="Ex: refeições mais leves após treinos..."
              multiline
              minRows={3}
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
              <TextField
                label="Adicionar refeição"
                value={mealInput}
                onChange={(event) => setMealInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddMeal();
                  }
                }}
              />
              <Button variant="contained" onClick={handleAddMeal} sx={{ height: "fit-content" }}>
                Adicionar
              </Button>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {meals.length ? (
                meals.map((meal) => (
                  <Chip key={meal} label={meal} onDelete={() => handleRemoveMeal(meal)} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma refeição adicionada ainda.
                </Typography>
              )}
            </Stack>
            <Button variant="contained" onClick={handleManualSave} disabled={manualSaving}>
              {manualSaving ? "Salvando..." : "Salvar dieta manual"}
            </Button>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Typography variant="h6">Checklist diário</Typography>
          <Grid container spacing={2}>
            {(week?.diet.days ?? []).map((day, index) => (
              <Grid item xs={12} md={6} key={day.date}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography>{day.date}</Typography>
                    <Button
                      size="small"
                      variant={day.completed ? "outlined" : "contained"}
                      onClick={() => handleDietToggle(index)}
                    >
                      {day.completed ? "Marcar como pendente" : "Concluir"}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Stack>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        {snackbar && (
          <Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
