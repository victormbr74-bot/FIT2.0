import {
  Alert,
  AlertColor,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme
} from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProgressEntries } from "../hooks/useProgressEntries";
import { firestore } from "../services/firebase";
import {
  measurementMetricLabels,
  measurementMetricOptions,
  measurementOptionalFields,
  MeasurementMetricKey
} from "../services/progressService";

const formatShortDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
};

const formatFullDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
};

const buildInitialFormState = () =>
  measurementMetricOptions.reduce(
    (acc, option) => ({ ...acc, [option.value]: "" }),
    {} as Record<MeasurementMetricKey, string>
  );

export function ProgressPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { entries, loading } = useProgressEntries();
  const [formValues, setFormValues] = useState(buildInitialFormState);
  const [selectedMetric, setSelectedMetric] = useState<MeasurementMetricKey>("weightKg");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: AlertColor } | null>(null);

  const latestEntry = entries[entries.length - 1];
  const firstEntry = entries[0];

  const chartPoints = useMemo(() => {
    return entries
      .map((entry) => {
        const metricValue = entry[selectedMetric];
        if (metricValue === undefined || metricValue === null) {
          return null;
        }
        return {
          label: formatShortDate(entry.date),
          value: metricValue
        };
      })
      .filter((item): item is { label: string; value: number } => Boolean(item));
  }, [entries, selectedMetric]);

  const chartDomain = useMemo(() => {
    if (!chartPoints.length) {
      return ["auto", "auto"] as const;
    }
    const values = chartPoints.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(min - 2, 0), max + 2] as const;
  }, [chartPoints]);

  const handleFormChange = (key: MeasurementMetricKey, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearForm = () => {
    setFormValues(buildInitialFormState());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !firestore) {
      return;
    }

    const weight = Number(formValues.weightKg);
    if (!weight || weight <= 0) {
      setError("Informe um peso válido.");
      return;
    }

    setError(null);
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const measurementRef = doc(firestore, "users", user.uid, "measurements", today);

    try {
      const existing = await getDoc(measurementRef);
      const payload: Record<string, unknown> = {
        date: today,
        dateISO: today,
        weightKg: weight
      };

      measurementOptionalFields.forEach((field) => {
        const raw = formValues[field.key].trim();
        if (!raw) {
          return;
        }
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          payload[field.key] = parsed;
        }
      });

      if (!existing.exists()) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(measurementRef, payload, { merge: true });
      setSnackbar({ severity: "success", message: "Medida registrada com sucesso." });
      clearForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível registrar a medida."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Progresso
      </Typography>
      <Stack spacing={3}>
        <Paper elevation={4} sx={{ p: 3 }}>
          <Typography variant="h6">Registrar medida</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Use as medidas do checklist de cadastro como ponto de partida e
            atualize sempre que quiser monitorar seu progresso.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Peso (kg)"
                  type="number"
                  value={formValues.weightKg}
                  onChange={(event) => handleFormChange("weightKg", event.target.value)}
                  required
                  fullWidth
                />
              </Grid>
              {measurementOptionalFields.map((field) => (
                <Grid item xs={12} sm={6} md={4} key={field.key}>
                  <TextField
                    label={field.label}
                    type="number"
                    value={formValues[field.key]}
                    onChange={(event) => handleFormChange(field.key, event.target.value)}
                    fullWidth
                  />
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Registrando..." : "Salvar medida"}
              </Button>
            </Stack>
          </form>
        </Paper>

        <Paper elevation={4} sx={{ p: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">Gráfico de {measurementMetricLabels[selectedMetric]}</Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="metric-select-label">Métrica</InputLabel>
              <Select
                labelId="metric-select-label"
                label="Métrica"
                value={selectedMetric}
                onChange={(event) =>
                  setSelectedMetric(event.target.value as MeasurementMetricKey)
                }
              >
                {measurementMetricOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : chartPoints.length ? (
            <Box height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="label" tick={{ fill: theme.palette.text.secondary }} />
                  <YAxis
                    domain={chartDomain}
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      `${value} ${selectedMetric === "weightKg" ? "kg" : "cm"}`
                    }
                    labelFormatter={(label: string) => `Dia ${label}`}
                    wrapperStyle={{ borderRadius: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Registre pelo menos uma medida com {measurementMetricLabels[selectedMetric]} para ver o gráfico.
            </Typography>
          )}
          {firstEntry && latestEntry && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
              Primeiro registro: {formatFullDate(firstEntry.date)} · Último registro: {formatFullDate(latestEntry.date)}
            </Typography>
          )}
        </Paper>

        <Paper elevation={4} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Histórico de medidas
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : entries.length ? (
            <Stack spacing={2}>
              {entries.map((entry) => (
                <Paper key={entry.date} elevation={2} sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box>
                      <Typography variant="subtitle1">{formatFullDate(entry.date)}</Typography>
                      <Typography variant="h6">{entry.weightKg} kg</Typography>
                    </Box>
                    <Stack direction="row" flexWrap="wrap" spacing={1}>
                      {measurementOptionalFields.map((field) => {
                        const value = entry[field.key];
                        if (!value) {
                          return null;
                        }
                        return (
                          <Chip
                            key={field.key}
                            label={`${field.label}: ${value} cm`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        );
                      })}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhuma medida registrada ainda.
            </Typography>
          )}
        </Paper>
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
