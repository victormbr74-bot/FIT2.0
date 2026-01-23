import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { firestore, isFirebaseConfigured } from "../services/firebase";
import { measurementOptionalFields } from "../services/progressService";

type OnboardingValues = {
  age: string;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  chestCm: string;
  hipCm: string;
  armCm: string;
  thighCm: string;
  goal: "emagrecimento" | "hipertrofia" | "condicionamento";
  workoutsPerWeek: number;
  muscleGroups: string[];
  level: "iniciante" | "intermediario" | "avancado";
  youtubePlaylistUrl: string;
};

const muscleGroupOptions = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombros",
  "Braços",
  "Core",
  "Glúteos"
];

const steps = ["Dados básicos", "Objetivo e foco", "Preferências"];

export function OnboardingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<OnboardingValues>({
    age: "",
    heightCm: "",
    weightKg: "",
    waistCm: "",
    chestCm: "",
    hipCm: "",
    armCm: "",
    thighCm: "",
    goal: "emagrecimento",
    workoutsPerWeek: 3,
    muscleGroups: [],
    level: "iniciante",
    youtubePlaylistUrl: ""
  });
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectPending, setRedirectPending] = useState(false);

  const stepValidation = (step: number) => {
    switch (step) {
      case 0:
        return (
          Number(values.age) >= 12 &&
          Number(values.heightCm) >= 120 &&
          Number(values.weightKg) >= 30
        );
      case 1:
        return (
          values.workoutsPerWeek >= 2 &&
          values.workoutsPerWeek <= 6 &&
          values.muscleGroups.length > 0
        );
      case 2:
        return values.level.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!stepValidation(activeStep)) {
      setError("Preencha os campos obrigatórios desta etapa.");
      return;
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setError(null);
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("Você precisa estar logado para continuar.");
      return;
    }

    if (!firestore) {
      setError("Firebase não configurado.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const profileRef = doc(firestore, "users", user.uid);
      await setDoc(
        profileRef,
        {
          age: Number(values.age),
          heightCm: Number(values.heightCm),
          weightKg: Number(values.weightKg),
          goal: values.goal,
          workoutsPerWeek: values.workoutsPerWeek,
          muscleGroups: values.muscleGroups,
          level: values.level,
          youtubePlaylistUrl: values.youtubePlaylistUrl.trim(),
          onboardingComplete: true,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      const today = new Date().toISOString().split("T")[0];
      const measurementRef = doc(firestore, "users", user.uid, "measurements", today);
      const measurementSnapshot = await getDoc(measurementRef);
      const measurementPayload: Record<string, unknown> = {
        date: today,
        dateISO: today,
        weightKg: Number(values.weightKg)
      };

      measurementOptionalFields.forEach((field) => {
        const raw = values[field.key].trim();
        if (!raw) {
          return;
        }
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          measurementPayload[field.key] = parsed;
        }
      });

      if (!measurementSnapshot.exists()) {
        measurementPayload.createdAt = serverTimestamp();
      }

      await setDoc(measurementRef, measurementPayload, { merge: true });

      setRedirectPending(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar seus dados, tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (redirectPending && profile?.onboardingComplete) {
      setRedirectPending(false);
      navigate("/home", { replace: true });
    }
  }, [redirectPending, profile?.onboardingComplete, navigate]);

  const toggleMuscleGroup = (group: string) => {
    setValues((prev) => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(group)
        ? prev.muscleGroups.filter((item) => item !== group)
        : [...prev.muscleGroups, group]
    }));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={2}>
            <TextField
              label="Idade"
              type="number"
              inputProps={{ min: 12 }}
              value={values.age}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, age: event.target.value }))
              }
              required
            />
            <TextField
              label="Altura (cm)"
              type="number"
              inputProps={{ min: 120 }}
              value={values.heightCm}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  heightCm: event.target.value
                }))
              }
              required
            />
            <TextField
              label="Peso (kg)"
              type="number"
              inputProps={{ min: 30 }}
              value={values.weightKg}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  weightKg: event.target.value
                }))
              }
              required
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Medidas adicionais (cm) — opcional
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {measurementOptionalFields.map((field) => (
                  <Grid item xs={12} sm={6} md={4} key={field.key}>
                    <TextField
                      label={field.label}
                      type="number"
                      value={values[field.key]}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: event.target.value
                        }))
                      }
                      fullWidth
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={2}>
            <TextField
              select
              label="Objetivo principal"
              value={values.goal}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, goal: event.target.value as OnboardingValues["goal"] }))
              }
            >
              <MenuItem value="emagrecimento">Emagrecimento</MenuItem>
              <MenuItem value="hipertrofia">Hipertrofia</MenuItem>
              <MenuItem value="condicionamento">Condicionamento</MenuItem>
            </TextField>
            <TextField
              label="Treinos por semana"
              type="number"
              inputProps={{ min: 2, max: 6 }}
              value={values.workoutsPerWeek}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  workoutsPerWeek: Math.min(
                    6,
                    Math.max(2, Number(event.target.value) || 2)
                  )
                }))
              }
              helperText="Entre 2 e 6 treinos por semana."
            />
            <FormControl component="fieldset">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Grupos musculares que quer priorizar (mínimo 1)
              </Typography>
              <FormGroup>
                {muscleGroupOptions.map((group) => (
                  <FormControlLabel
                    key={group}
                    control={
                      <Checkbox
                        checked={values.muscleGroups.includes(group)}
                        onChange={() => toggleMuscleGroup(group)}
                      />
                    }
                    label={group}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={2}>
            <TextField
              select
              label="Nível atual"
              value={values.level}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  level: event.target.value as OnboardingValues["level"]
                }))
              }
            >
              <MenuItem value="iniciante">Iniciante</MenuItem>
              <MenuItem value="intermediario">Intermediário</MenuItem>
              <MenuItem value="avancado">Avançado</MenuItem>
            </TextField>
            <TextField
              label="Playlist do YouTube (opcional)"
              value={values.youtubePlaylistUrl}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  youtubePlaylistUrl: event.target.value
                }))
              }
              placeholder="https://www.youtube.com/playlist?list=..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">https://</InputAdornment>
                )
              }}
            />
            <Typography variant="body2">
              Após salvar, iremos gerar seu plano semanal com base nas
              informações fornecidas.
            </Typography>
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
    <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom>
          Onboarding
        </Typography>
        {!isFirebaseConfigured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Configure o Firebase no `.env` para prosseguir.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Paper sx={{ mt: 3, p: 3 }}>
          <Box mb={2}>{renderStepContent(activeStep)}</Box>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" disabled={activeStep === 0 || saving} onClick={handlePrev}>
              Voltar
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Próxima etapa
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Finalizar onboarding"}
              </Button>
            )}
          </Stack>
        </Paper>
      </Paper>
    </Container>
  );
}
