import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { doc, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getWeekId } from "../utils/week";
import { firestore, storage } from "../services/firebase";
import { useWeeklyPlan } from "../hooks/useWeeklyPlan";

export function DietPage() {
  const { user, profile } = useAuth();
  const { week, loading } = useWeeklyPlan();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!user || !storage || !firestore) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

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
      setMessage("PDF enviado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o PDF.");
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

    try {
      await setDoc(weekRef, { diet: { days: updatedDays } }, { merge: true });
      const change = updatedDays[index].completed ? 5 : -5;
      await updateDoc(weekRef, { points: increment(change) });
      await updateDoc(userRef, {
        "stats.pointsThisWeek": increment(change),
        "stats.totalPoints": increment(change)
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível atualizar o checklist."
      );
    }
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
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">PDF da dieta</Typography>
          {profile?.diet?.currentPdfUrl ? (
            <Button
              component="a"
              href={profile.diet.currentPdfUrl}
              target="_blank"
              rel="noreferrer"
              variant="contained"
            >
              Abrir dieta atual
            </Button>
          ) : (
            <Typography variant="body2">Nenhum PDF enviado ainda.</Typography>
          )}
          <Button
            variant="contained"
            component="label"
            disabled={uploading}
            sx={{ width: 200 }}
          >
            {uploading ? "Enviando..." : "Enviar PDF"}
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
        </Stack>
      </Paper>
      <Typography variant="h6" gutterBottom>
        Checklist diário
      </Typography>
      <Grid container spacing={2}>
        {week?.diet.days.map((day, index) => (
          <Grid item xs={12} md={6} key={day.date}>
            <Paper elevation={2} sx={{ p: 2 }}>
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
    </Box>
  );
}
