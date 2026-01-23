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
  Typography
} from "@mui/material";
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { firestore } from "../services/firebase";

type ProgressEntry = {
  date: string;
  weightKg: number;
};

export function ProgressPage() {
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(firestore, "users", user.uid, "progress");
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs
        .map((docSnapshot) => docSnapshot.data() as ProgressEntry)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
    const entryRef = doc(
      firestore,
      "users",
      user.uid,
      "progress",
      today
    );

    try {
      await setDoc(entryRef, {
        date: today,
        weightKg: value,
        updatedAt: serverTimestamp()
      });
      setWeight("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível registrar o peso."
      );
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
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack direction="row" spacing={2} alignItems="flex-end">
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
        <Typography variant="body2">Registre seu primeiro peso para acompanhar a evolução.</Typography>
      )}
    </Box>
  );
}
