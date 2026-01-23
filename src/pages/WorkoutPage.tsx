import { Container, Paper, Typography } from "@mui/material";

export function WorkoutPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Treinos
        </Typography>
        <Typography>
          Quando estiver pronto, iremos mostrar o treino do dia com GIFs,
          vídeos do YouTube e dicas de execução.
        </Typography>
      </Paper>
    </Container>
  );
}
