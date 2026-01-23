import { Container, Paper, Typography } from "@mui/material";

export function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Página Home
        </Typography>
        <Typography>
          Aqui ficará o painel inicial com cards de treino, dieta e pontos da
          semana.
        </Typography>
      </Paper>
    </Container>
  );
}
