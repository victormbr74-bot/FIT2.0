import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { firestore } from "../services/firebase";

type SettingsForm = {
  goal: string;
  weightKg: string;
  youtubePlaylistUrl: string;
};

export function SettingsPage() {
  const { user, profile } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [form, setForm] = useState<SettingsForm>({
    goal: profile?.goal ?? "",
    weightKg: profile?.weightKg ? String(profile.weightKg) : "",
    youtubePlaylistUrl: profile?.youtubePlaylistUrl ?? ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      goal: profile?.goal ?? "",
      weightKg: profile?.weightKg ? String(profile.weightKg) : "",
      youtubePlaylistUrl: profile?.youtubePlaylistUrl ?? ""
    });
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !firestore) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        goal: form.goal,
        weightKg: Number(form.weightKg),
        youtubePlaylistUrl: form.youtubePlaylistUrl.trim(),
        updatedAt: serverTimestamp()
      });
      setMessage("Configurações atualizadas.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar as configurações."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box px={{ xs: 2, md: 4 }} py={4}>
      <Typography variant="h4" gutterBottom>
        Configurações
      </Typography>
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={mode === "dark"} onChange={toggleMode} />}
              label="Tema escuro"
              sx={{ alignSelf: "flex-start" }}
            />
            <TextField
              select
              label="Objetivo"
              value={form.goal}
              onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
            >
              <MenuItem value="emagrecimento">Emagrecimento</MenuItem>
              <MenuItem value="hipertrofia">Hipertrofia</MenuItem>
              <MenuItem value="condicionamento">Condicionamento</MenuItem>
            </TextField>
            <TextField
              label="Peso atual (kg)"
              type="number"
              value={form.weightKg}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, weightKg: event.target.value }))
              }
            />
            <TextField
              label="Playlist do YouTube"
              value={form.youtubePlaylistUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, youtubePlaylistUrl: event.target.value }))
              }
              placeholder="https://www.youtube.com/playlist?list=..."
            />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
