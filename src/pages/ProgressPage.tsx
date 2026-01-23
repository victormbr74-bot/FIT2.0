import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
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
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useProgressEntries } from "../hooks/useProgressEntries";
import { firestore } from "../services/firebase";

type ProgressEntry = {
  date: string;
  weightKg: number;
};

const formatShortDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
};

export function ProgressPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { entries, loading } = useProgressEntries();

  const chartData = useMemo(() => {
    const recent = entries.slice(-30);
    return recent.map((entry) => ({
      ...entry,
      label: formatShortDate(entry.date)
    }));
  }, [entries]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !firestore) {
      return;
    }

    const value = Number(weight);
    if (!value || value <= 0) {
      setError("Informe um peso válido.");
      return;
    }

    setError(null);
    const today = new Date().toISOString().split("T")[0];
    const entryRef = doc(firestore, "users", user.uid, "progress", today);

    try {
      await setDoc(entryRef, {
        date: today,
        weightKg: value,
        updatedAt: serverTimestamp()
      });
      setWeight("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o peso.");
    }
  };

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Progresso
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={4} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
            <TextField
              label="Peso atual (kg)"
              type="number"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
            <Button variant="contained" type="submit">
              Registrar
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper elevation={4} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Evolução de peso
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : entries.length ? (
          <Box height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="label" tick={{ fill: theme.palette.text.secondary }} />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fill: theme.palette.text.secondary }}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => `${value} kg`}
                  labelFormatter={(label: string) => `Dia ${label}`}
                  wrapperStyle={{ borderRadius: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="weightKg"
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
            Registre seu primeiro peso para acompanhar a evolução.
          </Typography>
        )}
      </Paper>

      <Typography variant="h6" gutterBottom>
        Histórico
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : entries.length ? (
        <List>
          {entries.map((entry) => (
            <ListItem key={entry.date} divider>
              <ListItemText primary={entry.date} secondary={`${entry.weightKg} kg`} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Nenhum registro encontrado.
        </Typography>
      )}
    </Box>
  );
}
