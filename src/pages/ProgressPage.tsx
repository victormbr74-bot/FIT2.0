import { Container, Paper, Typography } from "@mui/material";

export function ProgressPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Progresso
        </Typography>
        <Typography>
          Próxima etapa: registrar o peso por data e mostrar evolução visual ou
          em lista.
        </Typography>
      </Paper>
    </Container>
  );
}
