import { Container, Paper, Typography } from "@mui/material";

export function SettingsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configurações
        </Typography>
        <Typography>
          Futuramente será possível atualizar playlist do YouTube, peso atual e
          objetivo.
        </Typography>
      </Paper>
    </Container>
  );
}
