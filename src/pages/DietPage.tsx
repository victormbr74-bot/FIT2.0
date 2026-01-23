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
import BreakfastDiningIcon from "@mui/icons-material/BreakfastDining";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import FastfoodIcon from "@mui/icons-material/Fastfood";
import LunchDiningIcon from "@mui/icons-material/LunchDining";
import DinnerDiningIcon from "@mui/icons-material/DinnerDining";
import NightlifeIcon from "@mui/icons-material/Nightlife";
import {
  doc,
  increment,
  onSnapshot,
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

type MealFormEntry = {
  name: string;
  time: string;
  itemsText: string;
  kcal: string;
};

const MEAL_NAMES = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia"
];

const mealIcons: Record<string, JSX.Element> = {
  "Café da manhã": <BreakfastDiningIcon fontSize="small" />,
  "Lanche da manhã": <LocalCafeIcon fontSize="small" />,
  Almoço: <LunchDiningIcon fontSize="small" />,
  "Lanche da tarde": <FastfoodIcon fontSize="small" />,
  Jantar: <DinnerDiningIcon fontSize="small" />,
  Ceia: <NightlifeIcon fontSize="small" />
};

const getMealIcon = (name: string) => mealIcons[name] ?? <FastfoodIcon fontSize="small" />;

const createDefaultMeals = (): MealFormEntry[] =>
  MEAL_NAMES.map((name) => ({
    name,
    time: "",
    itemsText: "",
    kcal: ""
  }));

const parseNumberValue = (value: string) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return undefined;
};

const parseTimestamp = (value: unknown) => {
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
};

const formatDateLabel = (value: Date | null) => {
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
  const [manualMeals, setManualMeals] = useState<string[]>([]);
  const [mealInput, setMealInput] = useState("");
  const [planMeals, setPlanMeals] = useState<MealFormEntry[]>(createDefaultMeals());
  const [kcalPerDay, setKcalPerDay] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planUpdatedAt, setPlanUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackState | null>(null);

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

  useEffect(() => {
    setManualNotes(profile?.diet?.manual?.notes ?? "");
    setManualMeals(profile?.diet?.manual?.meals ?? []);
  }, [profile?.diet?.manual]);

  useEffect(() => {
    if (!user || !firestore) {
      setPlanLoading(false);
      return;
    }
    const planRef = doc(firestore, "users", user.uid, "dietPlan", "current");
    setPlanLoading(true);
    const unsubscribe = onSnapshot(
      planRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const mealsData = Array.isArray(data.meals) ? data.meals : [];
          const formattedMeals = MEAL_NAMES.map((name, index) => ({
            name,
            time: mealsData[index]?.time ?? "",
            itemsText: mealsData[index]?.itemsText ?? "",
            kcal: mealsData[index]?.kcal ? String(mealsData[index].kcal) : ""
          }));
          setPlanMeals(formattedMeals);
          setKcalPerDay(data.kcalPerDay ? String(data.kcalPerDay) : "");
          setPlanUpdatedAt(parseTimestamp(data.updatedAt));
        } else {
          setPlanMeals(createDefaultMeals());
          setKcalPerDay("");
          setPlanUpdatedAt(null);
        }
        setPlanError(null);
        setPlanLoading(false);
      },
      (snapshotError) => {
        setPlanError(snapshotError.message || "Não foi possível carregar o plano.");
        setPlanLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

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
    if (manualMeals.includes(normalized)) {
      setSnackbar({ severity: "info", message: "Refeição já adicionada." });
      setMealInput("");
      return;
    }
    setManualMeals((prev) => [...prev, normalized]);
    setMealInput("");
  };

  const handleRemoveMeal = (meal: string) => {
    setManualMeals((prev) => prev.filter((item) => item !== meal));
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
          meals: manualMeals,
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

  const handleMealChange = (
    index: number,
    field: keyof Omit<MealFormEntry, "name">,
    value: string
  ) => {
    setPlanMeals((prev) =>
      prev.map((meal, mealIndex) =>
        mealIndex === index ? { ...meal, [field]: value } : meal
      )
    );
  };

  const handlePlanSave = async () => {
    if (!user || !firestore) {
      return;
    }

    setSavingPlan(true);
    setPlanError(null);

    try {
      const planRef = doc(firestore, "users", user.uid, "dietPlan", "current");
      await setDoc(
        planRef,
        {
          meals: planMeals.map((meal) => ({
            name: meal.name,
            time: meal.time || undefined,
            itemsText: meal.itemsText || undefined,
            kcal: parseNumberValue(meal.kcal)
          })),
          kcalPerDay: parseNumberValue(kcalPerDay),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setSnackbar({ severity: "success", message: "Plano de dieta salvo com sucesso." });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Não foi possível salvar o plano.");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

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
      <Stack spacing={3}>
        <Paper elevation={4} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.5}>
                <Typography variant="h6">Plano de refeições</Typography>
                {kcalPerDay && (
                  <Typography variant="caption" color="text.secondary">
                    Meta diária: {kcalPerDay} kcal
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {kcalPerDay && (
                  <Chip label={`${kcalPerDay} kcal/dia`} size="small" color="secondary" />
                )}
                {planLoading && <CircularProgress size={24} />}
              </Stack>
            </Stack>
            {planError && <Alert severity="error">{planError}</Alert>}
            <TextField
              label="Calorias totais por dia (kcal)"
              type="number"
              value={kcalPerDay}
              onChange={(event) => setKcalPerDay(event.target.value)}
            />
            <Stack spacing={2}>
              {planMeals.map((meal, index) => (
                <Paper key={meal.name} elevation={2} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {getMealIcon(meal.name)}
                        <Typography variant="subtitle1">{meal.name}</Typography>
                      </Stack>
                      {meal.kcal && (
                        <Chip label={`${meal.kcal} kcal`} size="small" color="secondary" />
                      )}
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Horário"
                          type="time"
                          value={meal.time}
                          InputLabelProps={{ shrink: true }}
                          onChange={(event) => handleMealChange(index, "time", event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Calorias (kcal)"
                          type="number"
                          value={meal.kcal}
                          onChange={(event) => handleMealChange(index, "kcal", event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Descrição"
                          value={meal.itemsText}
                          onChange={(event) =>
                            handleMealChange(index, "itemsText", event.target.value)
                          }
                          fullWidth
                          multiline
                          minRows={2}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={handlePlanSave}
                disabled={savingPlan || planLoading}
              >
                {savingPlan ? "Salvando plano..." : "Adicionar/Editar dieta"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Paper elevation={4} sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Adicionar dieta</Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Atualizado em
                </Typography>
                <Typography variant="subtitle1">
                  {formatDateLabel(lastUpdatedAt)}
                </Typography>
              </Stack>
              <Chip label={`Status do dia: ${statusLabel}`} color={statusColor} size="small" />
            </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="contained"
                  component="label"
                  disabled={uploading}
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
                {manualMeals.length ? (
                  manualMeals.map((meal) => (
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
        </Stack>

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
